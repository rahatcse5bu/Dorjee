"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  PackageCheck,
  Pencil,
  Phone,
  Printer,
  Ruler,
  Scissors,
  Trash2,
  Wallet,
} from "lucide-react";
import { DraftItem, draftsToItems, ItemsEditor, itemToDraft } from "../../../components/orders/ItemsEditor";
import { AssigneeSelect } from "../../../components/orders/AssigneeSelect";
import { DeliveryLabel, ItemFabricDetails } from "../../../components/orders/OrderBits";
import { useToast } from "../../../components/Toast";
import {
  Alert,
  btnDanger,
  btnIcon,
  btnPrimary,
  btnSecondary,
  cardClass,
  EmptyState,
  Field,
  inputClass,
  Modal,
  Skeleton,
  StatusBadge,
} from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { TranslationKey, useI18n } from "../../../lib/i18n";
import {
  Customer,
  dueAmount,
  formatOrderNo,
  Order,
  ORDER_STATUSES,
  orderItems,
  payable,
  PAYMENT_METHODS,
  StaffMember,
  Catalog,
  EMPTY_CATALOG,
  normalizeCatalog,
} from "../../../lib/orders";
import { usePermissions } from "../../../lib/permissions";
import { errorMessage, useSession } from "../../../lib/session";

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const router = useRouter();
  const toast = useToast();
  const { t, money, date, num, lang } = useI18n();
  const { token, shopId } = useSession();
  const { can } = usePermissions();
  // Orders: view can change status only; manage edits everything else.
  const canEdit = can("orders", "manage");
  const canSeeAmounts = can("payments");
  const canTakePayments = can("payments", "manage");

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Details form
  const [details, setDetails] = useState({ status: "", deliveryDate: "", assignedTo: "", discount: "", notes: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  // Items editor
  const [editingItems, setEditingItems] = useState<DraftItem[] | null>(null);
  const [itemsError, setItemsError] = useState("");

  function applyOrder(next: Order) {
    setOrder(next);
    setDetails({
      status: next.status,
      deliveryDate: toDateInput(next.deliveryDate),
      assignedTo: next.assignedTo ?? "",
      discount: next.discount ? String(next.discount) : "",
      notes: next.notes ?? "",
    });
    const due = dueAmount(next);
    setPayAmount(due > 0 ? String(due) : "");
  }

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await apiRequest<Order>(`/shops/${shopId}/orders/${orderId}`, {}, token);
        applyOrder(loaded);
        const [customerResult, staffResult, catalogResult] = await Promise.all([
          apiRequest<Customer>(`/shops/${shopId}/customers/${loaded.customerId}`, {}, token).catch(() => null),
          apiRequest<StaffMember[]>(`/shops/${shopId}/staff`, {}, token).catch(() => []),
          apiRequest<Catalog>(`/shops/${shopId}/catalog`, {}, token),
        ]);
        setCustomer(customerResult);
        setStaff(staffResult);
        setCatalog(normalizeCatalog(catalogResult));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function patchOrder(body: Record<string, unknown>, successKey: TranslationKey) {
    const updated = await apiRequest<Order>(
      `/shops/${shopId}/orders/${orderId}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    );
    applyOrder(updated);
    toast(t(successKey));
  }

  async function assign(userId: string) {
    setAssigning(true);
    try {
      const updated = await apiRequest<Order>(
        `/shops/${shopId}/orders/${orderId}`,
        { method: "PATCH", body: JSON.stringify({ assignedTo: userId || null }) },
        token,
      );
      applyOrder(updated);
      const member = staff.find((s) => s._id === userId);
      toast(member ? t("order.assignedToast", { name: member.name || member.email }) : t("order.unassignedToast"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setAssigning(false);
    }
  }

  async function quickStatus(status: string) {
    try {
      await patchOrder({ status }, "order.statusUpdated");
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    try {
      await patchOrder(
        canEdit
          ? {
              status: details.status,
              deliveryDate: details.deliveryDate || null,
              notes: details.notes,
              // Discount is hidden from users who can't see money, so never send it for them.
              ...(canSeeAmounts ? { discount: Number(details.discount) || 0 } : {}),
            }
          : { status: details.status },
        "order.updated",
      );
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSavingDetails(false);
    }
  }

  async function addPayment(e: FormEvent) {
    e.preventDefault();
    setPayError("");
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setPayError(t("orderForm.errPrice"));
      return;
    }
    setPaying(true);
    try {
      const updated = await apiRequest<Order>(
        `/shops/${shopId}/orders/${orderId}/payments`,
        { method: "POST", body: JSON.stringify({ amount, method: payMethod, note: payNote.trim() || undefined }) },
        token,
      );
      applyOrder(updated);
      setPayNote("");
      toast(t("order.paymentAdded"));
    } catch (err) {
      setPayError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setPaying(false);
    }
  }

  async function removePayment(paymentId: string) {
    if (!window.confirm(t("order.removePaymentConfirm"))) return;
    try {
      const updated = await apiRequest<Order>(
        `/shops/${shopId}/orders/${orderId}/payments/${paymentId}`,
        { method: "DELETE" },
        token,
      );
      applyOrder(updated);
      toast(t("order.paymentRemoved"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  async function saveItems() {
    if (!editingItems) return;
    setItemsError("");
    const parsed = draftsToItems(editingItems);
    if (typeof parsed === "string") {
      setItemsError(t(parsed));
      return;
    }
    try {
      await patchOrder({ orderItems: parsed }, "order.updated");
      setEditingItems(null);
    } catch (err) {
      setItemsError(errorMessage(err, t("common.somethingWrong")));
    }
  }

  async function deleteOrder() {
    if (!window.confirm(t("order.deleteConfirm"))) return;
    try {
      await apiRequest(`/shops/${shopId}/orders/${orderId}`, { method: "DELETE" }, token);
      toast(t("order.deleted"));
      router.push("/orders");
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  const backLink = (
    <Link href="/orders" className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-teal">
      <ArrowLeft className="h-4 w-4" />
      {t("nav.orders")}
    </Link>
  );

  if (loading) {
    return (
      <section className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </section>
    );
  }

  if (notFound || !order) {
    return (
      <section>
        {backLink}
        <EmptyState icon={Scissors} title={t("order.notFound")} />
      </section>
    );
  }

  const due = dueAmount(order);
  const staffName = (id?: string | null) => {
    const member = staff.find((s) => s._id === id);
    return member ? member.name || member.email : null;
  };
  const nextStep =
    order.status === "ready"
      ? { status: "delivered", label: t("order.markDelivered"), icon: PackageCheck }
      : ["draft", "confirmed", "in_tailoring"].includes(order.status)
        ? { status: "ready", label: t("order.markReady"), icon: CheckCircle2 }
        : null;
  const detailsDirty =
    details.status !== order.status ||
    details.deliveryDate !== toDateInput(order.deliveryDate) ||
    (canSeeAmounts && (Number(details.discount) || 0) !== (order.discount ?? 0)) ||
    details.notes !== (order.notes ?? "");

  return (
    <section className="space-y-5">
      {/* Header */}
      <div>
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t("order.title", { no: formatOrderNo(order) })}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm shop-quiet">{t("order.created", { date: date(order.createdAt) })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order._id}/print`} target="_blank" className={btnSecondary}>
              <Printer className="h-4 w-4" />
              {t("order.printMemo")}
            </Link>
            {nextStep && (
              <button type="button" className={btnPrimary} onClick={() => void quickStatus(nextStep.status)}>
                <nextStep.icon className="h-4 w-4" />
                {nextStep.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {canSeeAmounts && due > 0 && order.status === "ready" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex items-center gap-2 font-medium">
            <Wallet className="h-4 w-4" />
            {t("order.collectDue", { amount: num(due) })}
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {/* Items */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Scissors className="h-4 w-4 text-teal" />
                {t("order.items")}
              </h2>
              {canEdit && canSeeAmounts && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline"
                  onClick={() => {
                    setItemsError("");
                    setEditingItems(orderItems(order).map((item) => itemToDraft(item, catalog)));
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("order.editItems")}
                </button>
              )}
            </div>
            <ul className="divide-y divide-ink/[0.06]">
              {orderItems(order).map((item, index) => {
                const measurements = Object.entries(item.measurements ?? {});
                return (
                  <li key={index} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-ink">
                        {item.clothType}
                        {item.quantity > 1 && <span className="ml-1.5 font-normal text-ink/50">× {num(item.quantity)}</span>}
                      </p>
                      {canSeeAmounts && (
                        <p className="text-sm text-ink/70">
                          {item.quantity > 1 && <span className="mr-2 text-ink/45">{money(item.price)} ×{num(item.quantity)}</span>}
                          <span className="font-semibold text-ink">{money(item.price * item.quantity)}</span>
                        </p>
                      )}
                    </div>
                    <ItemFabricDetails item={item} />
                    {measurements.length > 0 && (
                      <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {measurements.map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-paper px-2.5 py-1.5">
                            <dt className="truncate text-[11px] text-ink/50">{label}</dt>
                            <dd className="font-semibold text-ink">{typeof value === "number" ? num(value) : value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Payments */}
          {canSeeAmounts && (
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Banknote className="h-4 w-4 text-teal" />
                {t("order.payments")}
              </h2>
              <span className="text-sm text-ink/55">
                {t("orders.paid")} <span className="font-semibold text-ink">{money(order.paidAmount ?? 0)}</span>
              </span>
            </div>
            {(order.payments ?? []).length === 0 ? (
              <p className="px-5 py-5 text-sm text-ink/50">{t("order.noPayments")}</p>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {(order.payments ?? []).map((payment) => (
                  <li key={payment._id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{money(payment.amount)}</p>
                      <p className="truncate text-xs text-ink/50">
                        {t(`method.${payment.method}` as TranslationKey)} · {date(payment.paidAt)}
                        {payment.note ? ` · ${payment.note}` : ""}
                        {staffName(payment.receivedBy) ? ` · ${staffName(payment.receivedBy)}` : ""}
                      </p>
                    </div>
                    {canTakePayments && (
                      <button
                        type="button"
                        onClick={() => void removePayment(payment._id)}
                        className={`${btnIcon} hover:bg-coral/10 hover:text-coral`}
                        aria-label={t("common.remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canTakePayments && due > 0 && (
              <form onSubmit={addPayment} className="space-y-3 border-t border-ink/10 bg-paper/40 px-5 py-4">
                <p className="text-sm font-semibold text-ink">{t("order.addPayment")}</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
                  <input
                    className={inputClass}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={due}
                    aria-label={t("order.amount")}
                    placeholder={t("order.amount")}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <select
                    className={inputClass}
                    aria-label={t("orderForm.method")}
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(`method.${m}` as TranslationKey)}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    aria-label={t("common.notes")}
                    placeholder={`${t("common.notes")} (${t("common.optional")})`}
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                  <button type="submit" className={btnPrimary} disabled={paying}>
                    {t("common.add")}
                  </button>
                </div>
                {payError && <Alert>{payError}</Alert>}
              </form>
            )}
          </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Customer */}
          {customer && (
            <div className={`${cardClass} p-5`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{t("orders.col.customer")}</p>
              <Link href={`/customers/${customer._id}`} className="group flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 font-bold text-teal">
                  {customer.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink group-hover:text-teal">{customer.name}</p>
                  <p className="text-sm text-ink/55">{customer.phone}</p>
                </div>
              </Link>
              <a href={`tel:${customer.phone}`} className={`${btnSecondary} mt-3 w-full`}>
                <Phone className="h-4 w-4" />
                {t("customer.call")}
              </a>
            </div>
          )}

          {/* Assignee: saved as soon as it's picked */}
          <div className={`${cardClass} p-5`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{t("order.assignedTo")}</p>
            {canEdit ? (
              <AssigneeSelect
                staff={staff}
                value={order.assignedTo ?? ""}
                disabled={assigning}
                onChange={(id) => void assign(id)}
              />
            ) : (
              <p className="font-semibold text-ink">{staffName(order.assignedTo) ?? t("common.unassigned")}</p>
            )}
          </div>

          {/* Summary */}
          <div className={`${cardClass} p-5`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{t("order.summary")}</p>
            {canSeeAmounts && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-ink/65">
                <dt>{t("orderForm.subtotal")}</dt>
                <dd>{money(order.amount)}</dd>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-ink/65">
                  <dt>{t("orderForm.discount").replace(" (৳)", "")}</dt>
                  <dd>−{money(order.discount ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-ink">
                <dt>{t("orderForm.payable")}</dt>
                <dd>{money(payable(order))}</dd>
              </div>
              <div className="flex justify-between text-emerald-700">
                <dt>{t("orders.paid")}</dt>
                <dd>{money(order.paidAmount ?? 0)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-lg font-bold">
                <dt className="text-ink">{t("orderForm.due")}</dt>
                <dd className={due > 0 ? "text-coral" : "text-emerald-700"}>{money(due)}</dd>
              </div>
            </dl>
            )}
            <div className={canSeeAmounts ? "mt-3 text-sm" : "text-sm"}>
              <span className="text-ink/50">{t("orders.col.delivery")}: </span>
              <DeliveryLabel order={order} />
            </div>
          </div>

          {/* Details */}
          <form onSubmit={saveDetails} className={`${cardClass} space-y-3 p-5`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">{t("order.details")}</p>
            <Field label={t("order.changeStatus")}>
              <select
                className={inputClass}
                value={details.status}
                onChange={(e) => setDetails((d) => ({ ...d, status: e.target.value }))}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
            {canEdit && (
            <>
            <Field label={t("orderForm.deliveryDate")}>
              <input
                type="date"
                className={inputClass}
                value={details.deliveryDate}
                onChange={(e) => setDetails((d) => ({ ...d, deliveryDate: e.target.value }))}
              />
            </Field>
            {canSeeAmounts && (
              <Field label={t("orderForm.discount")}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={inputClass}
                  placeholder="0"
                  value={details.discount}
                  onChange={(e) => setDetails((d) => ({ ...d, discount: e.target.value }))}
                />
              </Field>
            )}
            <Field label={t("common.notes")}>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder={t("orderForm.notesPlaceholder")}
                value={details.notes}
                onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
              />
            </Field>
            </>
            )}
            <button type="submit" className={`${btnPrimary} w-full`} disabled={!detailsDirty || savingDetails}>
              {t("common.saveChanges")}
            </button>
          </form>

          {/* Timeline */}
          {(order.statusHistory ?? []).length > 0 && (
            <div className={`${cardClass} p-5`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{t("order.history")}</p>
              <ol className="space-y-3">
                {[...(order.statusHistory ?? [])].reverse().map((entry, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" />
                    <div className="text-sm">
                      <StatusBadge status={entry.status} />
                      <p className="mt-1 text-xs text-ink/50">
                        {new Date(entry.at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        {staffName(entry.by) ? ` · ${staffName(entry.by)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {canEdit && (
            <button type="button" className={`${btnDanger} w-full`} onClick={() => void deleteOrder()}>
              <Trash2 className="h-4 w-4" />
              {t("order.deleteOrder")}
            </button>
          )}
        </div>
      </div>

      <Modal
        open={editingItems !== null}
        onClose={() => setEditingItems(null)}
        title={t("order.editItems")}
        icon={Ruler}
        size="lg"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setEditingItems(null)}>
              {t("common.cancel")}
            </button>
            <button type="button" className={btnPrimary} onClick={() => void saveItems()}>
              {t("common.saveChanges")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {editingItems && (
            <ItemsEditor
              items={editingItems}
              onChange={setEditingItems}
              catalog={catalog}
              customer={customer}
              prefillHint={false}
            />
          )}
          {itemsError && <Alert>{itemsError}</Alert>}
        </div>
      </Modal>
    </section>
  );
}
