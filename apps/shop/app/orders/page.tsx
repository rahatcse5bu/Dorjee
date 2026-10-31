"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ChevronRight, ClipboardList, Plus, Search } from "lucide-react";
import { NewOrderModal } from "../../components/orders/NewOrderModal";
import { AssigneeSelect } from "../../components/orders/AssigneeSelect";
import { DeliveryLabel, StatusSelect } from "../../components/orders/OrderBits";
import { useToast } from "../../components/Toast";
import { Alert, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import {
  Customer,
  dueAmount,
  formatOrderNo,
  isOverdue,
  OPEN_STATUSES,
  Order,
  ORDER_STATUSES,
  orderItems,
  payable,
  StaffMember,
} from "../../lib/orders";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

type StatusTab = "active" | "all" | (typeof ORDER_STATUSES)[number];

export default function OrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const { t, money, num } = useI18n();
  const { user, token, shopId } = useSession();
  const { can } = usePermissions();
  const canCreate = can("orders", "manage");
  const canSeeAmounts = can("payments");

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [staff, setStaff] = useState<Record<string, StaffMember>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<StatusTab>("active");
  const [query, setQuery] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyMine, setOnlyMine] = useState(user?.role === "tailor");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try {
      const [orderResult, customerResult, staffResult] = await Promise.all([
        apiRequest<Order[]>(`/shops/${shopId}/orders`, {}, token),
        apiRequest<Customer[]>(`/shops/${shopId}/customers`, {}, token).catch(() => []),
        apiRequest<StaffMember[]>(`/shops/${shopId}/staff`, {}, token).catch(() => []),
      ]);
      setOrders(orderResult);
      setCustomers(Object.fromEntries(customerResult.map((c) => [c._id, c])));
      setStaff(Object.fromEntries(staffResult.map((s) => [s._id, s])));
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Dashboard and customer pages link here with ?new=1 to open the form.
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setShowNew(true);
      window.history.replaceState(null, "", "/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeAssignee(order: Order, userId: string) {
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, assignedTo: userId || null } : o)));
    try {
      await apiRequest(
        `/shops/${shopId}/orders/${order._id}`,
        { method: "PATCH", body: JSON.stringify({ assignedTo: userId || null }) },
        token,
      );
      const member = staff[userId];
      toast(member ? t("order.assignedToast", { name: member.name || member.email }) : t("order.unassignedToast"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
      void load();
    }
  }

  async function changeStatus(order: Order, status: string) {
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status } : o)));
    try {
      await apiRequest(`/shops/${shopId}/orders/${order._id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      toast(t("order.statusUpdated"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
      void load();
    }
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length, active: 0 };
    for (const order of orders) {
      result[order.status] = (result[order.status] ?? 0) + 1;
      if (OPEN_STATUSES.includes(order.status)) result.active += 1;
    }
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((order) => {
      if (tab === "active" && !OPEN_STATUSES.includes(order.status)) return false;
      if (tab !== "active" && tab !== "all" && order.status !== tab) return false;
      if (onlyDue && dueAmount(order) <= 0) return false;
      if (onlyOverdue && !isOverdue(order)) return false;
      if (onlyMine && order.assignedTo !== user?.sub) return false;
      if (!q) return true;
      const customer = customers[order.customerId];
      return (
        formatOrderNo(order).toLowerCase().includes(q) ||
        String(order.orderNo ?? "") === q ||
        (customer?.name.toLowerCase().includes(q) ?? false) ||
        (customer?.phone.includes(q) ?? false)
      );
    });
  }, [orders, customers, tab, query, onlyDue, onlyOverdue, onlyMine, user?.sub]);

  const tabs: Array<{ key: StatusTab; label: string }> = [
    { key: "active", label: t("orders.filterActive") },
    ...ORDER_STATUSES.map((s) => ({ key: s as StatusTab, label: t(`status.${s}`) })),
    { key: "all", label: t("common.all") },
  ];

  const toggles = [
    ...(canSeeAmounts ? [{ on: onlyDue, set: setOnlyDue, label: t("orders.filterDue") }] : []),
    { on: onlyOverdue, set: setOnlyOverdue, label: t("orders.filterOverdue") },
    ...(Object.keys(staff).length > 1 ? [{ on: onlyMine, set: setOnlyMine, label: t("orders.filterMine") }] : []),
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("orders.title")}
        subtitle={t("orders.sub")}
        actions={
          canCreate ? (
            <button type="button" className={btnPrimary} onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" />
              {t("orders.new")}
            </button>
          ) : undefined
        }
      />

      {/* Status tabs */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5" role="tablist">
          {tabs.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active ? "bg-ink text-white" : "bg-white/70 text-ink/65 ring-1 ring-inset ring-ink/10 hover:text-ink"
                }`}
              >
                {label}
                <span className={`text-xs ${active ? "text-white/70" : "text-ink/40"}`}>{num(counts[key] ?? 0)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + toggles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            className={`${inputClass} pl-9`}
            placeholder={t("orders.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {toggles.map(({ on, set, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => set(!on)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                on ? "bg-teal/10 text-teal ring-1 ring-inset ring-teal/30" : "bg-white/70 text-ink/60 ring-1 ring-inset ring-ink/10 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={orders.length === 0 ? t("orders.empty") : t("orders.emptyFiltered")}
            action={
              orders.length === 0 && canCreate ? (
                <button type="button" className={btnPrimary} onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" />
                  {t("orders.new")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-paper/60 text-left text-xs font-semibold text-ink/50">
                    <th className="px-4 py-3">{t("orders.col.order")}</th>
                    <th className="px-4 py-3">{t("orders.col.customer")}</th>
                    <th className="px-4 py-3">{t("orders.col.items")}</th>
                    <th className="px-4 py-3">{t("orders.col.delivery")}</th>
                    {canSeeAmounts && <th className="px-4 py-3 text-right">{t("orders.col.total")}</th>}
                    {canSeeAmounts && <th className="px-4 py-3 text-right">{t("orders.col.due")}</th>}
                    <th className="px-4 py-3">{t("order.assignedTo")}</th>
                    <th className="px-4 py-3">{t("orders.col.status")}</th>
                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {filtered.map((order) => {
                    const customer = customers[order.customerId];
                    const items = orderItems(order);
                    const due = dueAmount(order);
                    const assignee = order.assignedTo ? staff[order.assignedTo] : undefined;
                    return (
                      <tr
                        key={order._id}
                        onClick={() => router.push(`/orders/${order._id}`)}
                        className="cursor-pointer transition-colors hover:bg-teal/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/orders/${order._id}`} className="font-mono text-sm font-semibold text-ink hover:text-teal" onClick={(e) => e.stopPropagation()}>
                            {formatOrderNo(order)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{customer?.name ?? "—"}</p>
                          <p className="text-xs text-ink/45">{customer?.phone}</p>
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-ink/70">
                          <p className="truncate">{items.map((i) => (i.quantity > 1 ? `${i.clothType} ×${num(i.quantity)}` : i.clothType)).join(", ")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <DeliveryLabel order={order} />
                        </td>
                        {canSeeAmounts && <td className="px-4 py-3 text-right font-medium text-ink">{money(payable(order))}</td>}
                        {canSeeAmounts && (
                          <td className="px-4 py-3 text-right">
                            {due > 0 ? (
                              <span className="font-semibold text-coral">{money(due)}</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-700">{t("orders.fullyPaid")}</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {canCreate ? (
                            <AssigneeSelect
                              staff={Object.values(staff)}
                              value={order.assignedTo ?? ""}
                              onChange={(id) => void changeAssignee(order, id)}
                              className="w-[150px] rounded-lg border border-ink/15 bg-white/80 py-1.5 pl-2 pr-7 text-xs text-ink focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                            />
                          ) : (
                            <span className="text-xs text-ink/60">{assignee ? assignee.name || assignee.email : t("common.unassigned")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <StatusSelect order={order} onChange={(s) => void changeStatus(order, s)} />
                        </td>
                        <td className="px-2 py-3 text-ink/30">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-ink/[0.06] md:hidden">
              {filtered.map((order) => {
                const customer = customers[order.customerId];
                const due = dueAmount(order);
                return (
                  <li key={order._id}>
                    <Link href={`/orders/${order._id}`} className="block px-4 py-3.5 active:bg-ink/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-ink">{formatOrderNo(order)}</span>
                            {isOverdue(order) && <AlertTriangle className="h-3.5 w-3.5 text-coral" />}
                          </p>
                          <p className="truncate text-sm font-medium text-ink">{customer?.name ?? "—"}</p>
                          <p className="truncate text-xs text-ink/50">
                            {orderItems(order).map((i) => i.clothType).join(", ")}
                            {order.assignedTo && staff[order.assignedTo] && (
                              <> · {staff[order.assignedTo].name || staff[order.assignedTo].email}</>
                            )}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-ink/55">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <DeliveryLabel order={order} />
                        </span>
                        {canSeeAmounts && (
                          <span>
                            <span className="text-ink/60">{money(payable(order))}</span>
                            {due > 0 && <span className="ml-2 font-semibold text-coral">{t("orders.col.due")} {money(due)}</span>}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <NewOrderModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(order) => {
          setShowNew(false);
          toast(t("orderForm.created", { no: formatOrderNo(order) }));
          router.push(`/orders/${order._id}`);
        }}
      />
    </section>
  );
}
