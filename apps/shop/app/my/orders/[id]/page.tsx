"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronDown, MessageSquare, Phone, Ruler, Wallet, XCircle } from "lucide-react";
import { measurementValue, PortalStatus } from "../../../../components/customer/PortalBits";
import { useToast } from "../../../../components/Toast";
import { Alert, btnDanger, btnSecondary, cardClass, EmptyState, Skeleton } from "../../../../components/ui";
import { useI18n } from "../../../../lib/i18n";
import { PortalOrder, portalOrderNo, portalRequest } from "../../../../lib/customer-portal";
import { errorMessage } from "../../../../lib/session";

const STEPS = ["draft", "confirmed", "in_tailoring", "ready", "delivered"] as const;

export default function CustomerOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const toast = useToast();
  const { t, money, date, num } = useI18n();
  const [order, setOrder] = useState<PortalOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [openItem, setOpenItem] = useState<number | null>(null);

  useEffect(() => {
    portalRequest<PortalOrder>(`/orders/${orderId}`)
      .then(setOrder)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function cancel() {
    if (!order || !window.confirm(t("my.cancelConfirm"))) return;
    setCancelling(true);
    try {
      setOrder(await portalRequest<PortalOrder>(`/orders/${order._id}/cancel`, { method: "POST" }));
      toast(t("my.cancelled"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setCancelling(false);
    }
  }

  const back = (
    <Link href="/my" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-teal">
      <ArrowLeft className="h-4 w-4" />
      {t("my.myOrders")}
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (notFound || !order) {
    return (
      <div className="space-y-4">
        {back}
        <div className={cardClass}>
          <EmptyState icon={XCircle} title={t("my.notFound")} />
        </div>
      </div>
    );
  }

  const pending = order.status === "draft";
  const cancelled = order.status === "cancelled";
  const reached = (step: string) => order.statusHistory?.find((h) => h.status === step)?.at;
  // Orders the shop made never waited for confirmation, so they start at "confirmed".
  const steps: readonly string[] = order.source === "customer" ? STEPS : STEPS.slice(1);
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">{t("my.order", { no: portalOrderNo(order) })}</h1>
            <PortalStatus status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink/55">
            {order.shop?.name}
            {order.createdAt && <> · {t("my.orderedOn", { date: date(order.createdAt) })}</>}
          </p>
        </div>
        {order.shop && (
          <a href={`tel:${order.shop.phone}`} className={btnSecondary}>
            <Phone className="h-4 w-4" />
            {t("my.callShop")}
          </a>
        )}
      </div>

      {pending && <Alert kind="info">{t("my.pendingInfo")}</Alert>}

      {order.deliveryDate && !cancelled && order.status !== "delivered" && (
        <div className={`${cardClass} flex items-center gap-3 px-4 py-3`}>
          <CalendarDays className="h-5 w-5 text-teal" />
          <span className="font-semibold text-ink">{t("my.delivery", { date: date(order.deliveryDate) })}</span>
        </div>
      )}

      {/* Progress */}
      {!cancelled && (
        <section className={`${cardClass} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-ink/70">{t("my.progress")}</h2>
          <ol className="space-y-0">
            {steps.map((step, i) => {
              const done = i <= currentIndex;
              const at = reached(step);
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-teal text-white" : "border-2 border-ink/15 bg-white text-ink/30"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : num(i + 1)}
                    </span>
                    {i < steps.length - 1 && <span className={`w-0.5 flex-1 ${i < currentIndex ? "bg-teal" : "bg-ink/10"}`} style={{ minHeight: 18 }} />}
                  </div>
                  <div className="pb-3">
                    <p className={`text-sm font-semibold ${done ? "text-ink" : "text-ink/40"}`}>
                      {step === "draft" ? t(pending ? "my.pending" : "my.sent") : t(`status.${step}` as Parameters<typeof t>[0])}
                    </p>
                    {done && at && <p className="text-xs text-ink/45">{date(at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Garments */}
      <section className={`${cardClass} overflow-hidden`}>
        <h2 className="border-b border-ink/10 px-4 py-3 text-sm font-semibold text-ink/70">{t("my.items")}</h2>
        <ul className="divide-y divide-ink/[0.07]">
          {order.items.map((item, i) => {
            const measurements = Object.entries(item.measurements ?? {});
            const details = [
              item.fabricSource === "customer" ? t("my.fabricCustomer") : item.fabricSource === "shop" ? t("my.fabricShop") : null,
              item.fabric,
              item.color,
            ].filter(Boolean);
            return (
              <li key={i} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {item.clothType}
                      {item.quantity > 1 && <span className="font-medium text-ink/50"> × {num(item.quantity)}</span>}
                    </p>
                    {details.length > 0 && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/55">
                        {item.colorHex && <span className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ background: item.colorHex }} />}
                        {details.join(" · ")}
                      </p>
                    )}
                    {item.styleNotes && <p className="mt-0.5 text-xs text-ink/55">{item.styleNotes}</p>}
                  </div>
                  {item.price > 0 && <span className="shrink-0 text-sm font-semibold text-ink">{money(item.price * item.quantity)}</span>}
                </div>
                {measurements.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenItem(openItem === i ? null : i)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-teal/80"
                      aria-expanded={openItem === i}
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      {t("my.measurements")}
                      <ChevronDown className={`h-3.5 w-3.5 transition ${openItem === i ? "rotate-180" : ""}`} />
                    </button>
                    {openItem === i && (
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-ink/[0.03] p-3 text-sm sm:grid-cols-3">
                        {measurements.map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-2">
                            <dt className="text-ink/55">{label}</dt>
                            <dd className="font-semibold text-ink">{measurementValue(value, t)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {order.customerNote && (
        <section className={`${cardClass} p-4`}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            <MessageSquare className="h-4 w-4" />
            {t("my.yourNote")}
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{order.customerNote}</p>
        </section>
      )}

      {/* Bill */}
      {order.amount > 0 && (
        <section className={`${cardClass} p-4`}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            <Wallet className="h-4 w-4" />
            {t("my.bill")}
          </h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">{t("my.total")}</dt>
              <dd className="font-semibold text-ink">{money(order.amount)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink/60">{t("my.discount")}</dt>
                <dd className="font-semibold text-emerald-700">−{money(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink/60">{t("my.paid")}</dt>
              <dd className="font-semibold text-ink">{money(order.paidAmount)}</dd>
            </div>
            {!cancelled && (
              <div className="flex justify-between border-t border-ink/10 pt-1.5">
                <dt className="font-semibold text-ink">{t("my.dueLabel")}</dt>
                <dd className={`font-bold ${order.due > 0 ? "text-coral" : "text-emerald-700"}`}>
                  {order.due > 0 ? money(order.due) : t("my.paidInFull")}
                </dd>
              </div>
            )}
          </dl>
          {pending && <p className="mt-2 text-xs text-ink/50">{t("my.estimate")}</p>}
          {(order.payments?.length ?? 0) > 0 && (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <p className="mb-1.5 text-xs font-semibold text-ink/55">{t("my.payments")}</p>
              <ul className="space-y-1 text-sm">
                {order.payments!.map((p, i) => (
                  <li key={i} className="flex justify-between text-ink/70">
                    <span>
                      {date(p.paidAt)} · {t(`method.${p.method}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="font-semibold text-ink">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {order.canCancel && (
        <button type="button" className={`${btnDanger} w-full`} disabled={cancelling} onClick={() => void cancel()}>
          <XCircle className="h-4 w-4" />
          {t("my.cancel")}
        </button>
      )}
    </div>
  );
}
