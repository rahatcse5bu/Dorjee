"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, MapPin, Pencil, Phone, Plus, Ruler, Save, Trash2, Users } from "lucide-react";
import { CustomerFormModal } from "../../../components/CustomerFormModal";
import { NewOrderModal } from "../../../components/orders/NewOrderModal";
import { useToast } from "../../../components/Toast";
import {
  btnIcon,
  btnPrimary,
  btnSecondary,
  cardClass,
  EmptyState,
  inputClass,
  Skeleton,
  StatusBadge,
} from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import {
  Customer,
  dueAmount,
  formatOrderNo,
  measurementRows,
  Order,
  orderItems,
  payable,
  rowsToMeasurements,
} from "../../../lib/orders";
import { errorMessage, useSession } from "../../../lib/session";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id ?? "";
  const router = useRouter();
  const toast = useToast();
  const { t, money, num, date } = useI18n();
  const { token, shopId } = useSession();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [customerResult, orderResult, catalog] = await Promise.all([
          apiRequest<Customer>(`/shops/${shopId}/customers/${customerId}`, {}, token),
          apiRequest<Order[]>(`/shops/${shopId}/orders?customerId=${encodeURIComponent(customerId)}`, {}, token),
          apiRequest<{ measurementLabels: string[] }>(`/shops/${shopId}/catalog`, {}, token),
        ]);
        setCustomer(customerResult);
        setOrders(orderResult);
        setLabels(catalog.measurementLabels ?? []);
        setRows(measurementRows(catalog.measurementLabels ?? [], customerResult.measurements));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const totals = useMemo(
    () => ({
      billed: orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + payable(o), 0),
      due: orders.reduce((sum, o) => sum + dueAmount(o), 0),
    }),
    [orders],
  );

  const savedMeasurements = JSON.stringify(customer?.measurements ?? {});
  const measurementsDirty = JSON.stringify(rowsToMeasurements(rows)) !== savedMeasurements;

  async function saveMeasurements() {
    if (!customer) return;
    setSavingMeasurements(true);
    try {
      const updated = await apiRequest<Customer>(
        `/shops/${shopId}/customers/${customer._id}`,
        { method: "PATCH", body: JSON.stringify({ measurements: rowsToMeasurements(rows) }) },
        token,
      );
      setCustomer(updated);
      toast(t("customer.measurementsSaved"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSavingMeasurements(false);
    }
  }

  const backLink = (
    <Link href="/customers" className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-teal">
      <ArrowLeft className="h-4 w-4" />
      {t("nav.customers")}
    </Link>
  );

  if (loading) {
    return (
      <section className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </section>
    );
  }

  if (notFound || !customer) {
    return (
      <section>
        {backLink}
        <EmptyState icon={Users} title={t("customer.notFound")} />
      </section>
    );
  }

  const stats = [
    { label: t("customer.totalOrders"), value: num(orders.length), tone: "text-ink" },
    { label: t("customer.totalSpent"), value: money(totals.billed), tone: "text-ink" },
    { label: t("customer.outstanding"), value: money(totals.due), tone: totals.due > 0 ? "text-coral" : "text-emerald-700" },
  ];

  return (
    <section className="space-y-5">
      {/* Header */}
      <div>
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal text-xl font-bold text-white">
              {customer.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-ink sm:text-3xl">{customer.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.address}
                  </span>
                )}
                {customer.createdAt && <span>{t("customer.since", { date: date(customer.createdAt) })}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${customer.phone}`} className={btnSecondary}>
              <Phone className="h-4 w-4" />
              {t("customer.call")}
            </a>
            <button type="button" className={btnSecondary} onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </button>
            <button type="button" className={btnPrimary} onClick={() => setNewOrderOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("orders.new")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`${cardClass} px-4 py-3.5`}>
            <p className="text-xs font-medium text-ink/50">{s.label}</p>
            <p className={`mt-1 text-lg font-bold sm:text-2xl ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Order history */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-ink/10 px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <ClipboardList className="h-4 w-4 text-teal" />
              {t("customer.orderHistory")}
            </h2>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t("customer.noOrders")}
              action={
                <button type="button" className={btnPrimary} onClick={() => setNewOrderOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("customer.newOrder", { name: customer.name })}
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-ink/[0.06]">
              {orders.map((order) => {
                const due = dueAmount(order);
                return (
                  <li key={order._id}>
                    <Link href={`/orders/${order._id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-teal/[0.03]">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-ink">{formatOrderNo(order)}</span>
                          <span className="text-xs text-ink/45">{date(order.createdAt)}</span>
                        </p>
                        <p className="truncate text-sm text-ink/60">{orderItems(order).map((i) => i.clothType).join(", ")}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-ink">{money(payable(order))}</p>
                        {due > 0 && <p className="text-xs font-semibold text-coral">{t("orders.col.due")} {money(due)}</p>}
                      </div>
                      <StatusBadge status={order.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Measurements */}
        <div className={`${cardClass} h-fit p-5`}>
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Ruler className="h-4 w-4 text-teal" />
            {t("customer.measurements")}
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">{t("customer.measurementsSub")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {rows.map((row, index) => {
              const fixed = labels.includes(row.label);
              return (
                <div key={index}>
                  {fixed ? (
                    <span className="mb-1 block truncate text-xs font-medium text-ink/55">{row.label}</span>
                  ) : (
                    <input
                      className="mb-1 w-full border-0 border-b border-dashed border-ink/20 bg-transparent p-0 text-xs font-medium text-ink/55 focus:ring-0"
                      placeholder={t("orderForm.measurementLabel")}
                      value={row.label}
                      onChange={(e) => setRows((r) => r.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
                    />
                  )}
                  <div className="flex gap-1">
                    <input
                      className={`${inputClass} py-2`}
                      inputMode="decimal"
                      aria-label={row.label || t("orderForm.measurementValue")}
                      value={row.value}
                      onChange={(e) => setRows((r) => r.map((x, i) => (i === index ? { ...x, value: e.target.value } : x)))}
                    />
                    {!fixed && (
                      <button
                        type="button"
                        className={`${btnIcon} h-auto w-8 hover:text-coral`}
                        aria-label={t("common.remove")}
                        onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
              onClick={() => setRows((r) => [...r, { label: "", value: "" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("orderForm.addMeasurement")}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!measurementsDirty || savingMeasurements}
              onClick={() => void saveMeasurements()}
            >
              <Save className="h-4 w-4" />
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      <CustomerFormModal
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setEditOpen(false);
          setCustomer((c) => (c ? { ...c, ...saved } : saved));
          toast(t("customers.updated"));
        }}
      />

      <NewOrderModal
        open={newOrderOpen}
        presetCustomer={customer}
        onClose={() => setNewOrderOpen(false)}
        onCreated={(order) => {
          setNewOrderOpen(false);
          toast(t("orderForm.created", { no: formatOrderNo(order) }));
          router.push(`/orders/${order._id}`);
        }}
      />
    </section>
  );
}
