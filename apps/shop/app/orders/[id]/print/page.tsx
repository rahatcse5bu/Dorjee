"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Scissors } from "lucide-react";
import { btnPrimary, btnSecondary } from "../../../../components/ui";
import { apiRequest } from "../../../../lib/api";
import { useI18n } from "../../../../lib/i18n";
import { Customer, dueAmount, formatOrderNo, Order, orderItems, payable } from "../../../../lib/orders";
import { useSession } from "../../../../lib/session";

interface Shop {
  name: string;
  ownerName?: string;
  phone?: string;
  address?: string;
}

export default function PrintMemoPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const { t, money, date, num } = useI18n();
  const { token, shopId } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await apiRequest<Order>(`/shops/${shopId}/orders/${orderId}`, {}, token);
        const [customerResult, shopResult] = await Promise.all([
          apiRequest<Customer>(`/shops/${shopId}/customers/${loaded.customerId}`, {}, token).catch(() => null),
          apiRequest<Shop>(`/shops/${shopId}`, {}, token),
        ]);
        setOrder(loaded);
        setCustomer(customerResult);
        setShop(shopResult);
      } catch {
        setFailed(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (failed) {
    return <p className="p-8 text-center text-ink/60">{t("order.notFound")}</p>;
  }
  if (!order || !shop) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />
      </div>
    );
  }

  const items = orderItems(order);
  const due = dueAmount(order);

  const header = (copyLabel: string) => (
    <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3">
      <div>
        <p className="text-xl font-bold text-ink">{shop.name}</p>
        {shop.address && <p className="text-xs text-ink/70">{shop.address}</p>}
        {shop.phone && <p className="text-xs text-ink/70">{shop.phone}</p>}
      </div>
      <div className="text-right">
        <p className="inline-block rounded border border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{copyLabel}</p>
        <p className="mt-1 font-mono text-lg font-bold">{formatOrderNo(order)}</p>
      </div>
    </div>
  );

  const meta = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 py-3 text-sm sm:grid-cols-4">
      <div>
        <p className="text-[11px] text-ink/55">{t("orders.col.customer")}</p>
        <p className="font-semibold">{customer?.name ?? "—"}</p>
      </div>
      <div>
        <p className="text-[11px] text-ink/55">{t("common.phone")}</p>
        <p className="font-semibold">{customer?.phone ?? "—"}</p>
      </div>
      <div>
        <p className="text-[11px] text-ink/55">{t("memo.date")}</p>
        <p className="font-semibold">{date(order.createdAt)}</p>
      </div>
      <div>
        <p className="text-[11px] text-ink/55">{t("memo.delivery")}</p>
        <p className="font-semibold">{date(order.deliveryDate)}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink/[0.04] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-2 px-4">
        <Link href={`/orders/${order._id}`} className={btnSecondary}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <button type="button" className={btnPrimary} onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("common.print")}
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white p-8 text-ink shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Customer copy */}
        <section>
          {header(t("memo.customerCopy"))}
          {meta}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-ink/30 text-left text-xs">
                <th className="py-1.5">{t("memo.item")}</th>
                <th className="py-1.5 text-right">{t("orderForm.qty")}</th>
                <th className="py-1.5 text-right">{t("memo.rate")}</th>
                <th className="py-1.5 text-right">{t("memo.total")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-ink/10">
                  <td className="py-1.5">{item.clothType}</td>
                  <td className="py-1.5 text-right">{num(item.quantity)}</td>
                  <td className="py-1.5 text-right">{money(item.price)}</td>
                  <td className="py-1.5 text-right">{money(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end">
            <dl className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>{t("orderForm.subtotal")}</dt>
                <dd>{money(order.amount)}</dd>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <dt>{t("orderForm.discount").replace(" (৳)", "")}</dt>
                  <dd>−{money(order.discount ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <dt>{t("orderForm.payable")}</dt>
                <dd>{money(payable(order))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("orders.paid")}</dt>
                <dd>{money(order.paidAmount ?? 0)}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-ink pt-1 text-base font-bold">
                <dt>{t("orderForm.due")}</dt>
                <dd>{money(due)}</dd>
              </div>
            </dl>
          </div>
          {order.notes && <p className="mt-3 text-sm"><span className="font-semibold">{t("common.notes")}:</span> {order.notes}</p>}
          <div className="mt-8 flex items-end justify-between text-xs text-ink/60">
            <p>{t("memo.thanks")}</p>
            <p className="border-t border-ink/50 px-6 pt-1">{t("memo.signature")}</p>
          </div>
        </section>

        {/* Cut line */}
        <div className="relative my-8 border-t-2 border-dashed border-ink/30">
          <Scissors className="absolute -top-3 left-0 h-5 w-5 bg-white text-ink/40" />
        </div>

        {/* Workshop copy: measurements, no prices */}
        <section>
          {header(t("memo.tailorCopy"))}
          {meta}
          <div className="space-y-3">
            {items.map((item, index) => {
              const measurements = Object.entries(item.measurements ?? {});
              return (
                <div key={index} className="rounded border border-ink/25 p-3">
                  <p className="font-bold">
                    {item.clothType} {item.quantity > 1 && <span className="font-normal">× {num(item.quantity)}</span>}
                  </p>
                  {measurements.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-1 text-sm sm:grid-cols-6">
                      {measurements.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2 border-b border-dotted border-ink/30">
                          <span className="text-ink/65">{label}</span>
                          <span className="font-semibold">{typeof value === "number" ? num(value) : value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {order.notes && <p className="mt-3 text-sm"><span className="font-semibold">{t("common.notes")}:</span> {order.notes}</p>}
        </section>
      </div>
    </div>
  );
}
