"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Download,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { BarList, ColumnChart, ColumnDatum } from "../../components/charts";
import { cardClass, EmptyState, inputClass, PageHeader, Skeleton, btnSecondary } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
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
  STATUS_STYLE,
} from "../../lib/orders";
import { usePermissions } from "../../lib/permissions";
import { useSession } from "../../lib/session";

const DAY = 86_400_000;
const PRESETS = ["7d", "30d", "month", "lastMonth", "year", "all", "custom"] as const;
type Preset = (typeof PRESETS)[number];

interface Filters {
  range: Preset;
  from: string;
  to: string;
  staff: string; // user id, "unassigned", or "" for everyone
  clothType: string;
  status: string; // an order status, "active", or ""
}

const DEFAULT_FILTERS: Filters = { range: "30d", from: "", to: "", staff: "", clothType: "", status: "" };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The [start, end) window for the chosen period. */
function resolveRange(filters: Filters, earliest: Date | null): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY);
  switch (filters.range) {
    case "7d":
      return { start: new Date(today.getTime() - 6 * DAY), end: tomorrow };
    case "30d":
      return { start: new Date(today.getTime() - 29 * DAY), end: tomorrow };
    case "month":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: tomorrow };
    case "lastMonth":
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    case "year":
      return { start: new Date(today.getFullYear(), 0, 1), end: tomorrow };
    case "all":
      return { start: earliest ? startOfDay(earliest) : new Date(today.getTime() - 29 * DAY), end: tomorrow };
    case "custom": {
      const start = filters.from ? startOfDay(new Date(filters.from)) : new Date(today.getTime() - 29 * DAY);
      const endDay = filters.to ? startOfDay(new Date(filters.to)) : today;
      return { start, end: new Date(Math.max(endDay.getTime(), start.getTime()) + DAY) };
    }
  }
}

type Bucket = "day" | "week" | "month";

/** Time buckets covering the window: daily up to a month, weekly up to ~6 months, then monthly. */
function buildBuckets(start: Date, end: Date): { bucket: Bucket; starts: Date[] } {
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  const starts: Date[] = [];
  if (days <= 31) {
    for (let t = start.getTime(); t < end.getTime(); t += DAY) starts.push(new Date(t));
    return { bucket: "day", starts };
  }
  if (days <= 190) {
    for (let t = start.getTime(); t < end.getTime(); t += 7 * DAY) starts.push(new Date(t));
    return { bucket: "week", starts };
  }
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    starts.push(d);
  }
  return { bucket: "month", starts };
}

function bucketIndex(starts: Date[], when: Date) {
  for (let i = starts.length - 1; i >= 0; i--) if (when >= starts[i]) return i;
  return -1;
}

function readFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  const range = params.get("range") as Preset | null;
  return {
    range: range && PRESETS.includes(range) ? range : DEFAULT_FILTERS.range,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    staff: params.get("staff") ?? "",
    clothType: params.get("type") ?? "",
    status: params.get("status") ?? "",
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function StatisticsPage() {
  const { t, money, num, date, lang } = useI18n();
  const { token, shopId } = useSession();
  const { can } = usePermissions();
  const canSeeMoney = can("payments");

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clothTypes, setClothTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Read once on first render (pages render client-side only), so the URL-sync
  // effect below never overwrites a shared link before it has been applied.
  const [filters, setFilters] = useState<Filters>(readFiltersFromUrl);

  useEffect(() => {
    void (async () => {
      try {
        const [orderResult, customerResult, staffResult, catalog] = await Promise.all([
          apiRequest<Order[]>(`/shops/${shopId}/orders`, {}, token).catch(() => []),
          apiRequest<Customer[]>(`/shops/${shopId}/customers`, {}, token).catch(() => []),
          apiRequest<StaffMember[]>(`/shops/${shopId}/staff`, {}, token).catch(() => []),
          apiRequest<{ clothTypes?: string[] }>(`/shops/${shopId}/catalog`, {}, token).catch(() => ({ clothTypes: [] as string[] })),
        ]);
        setOrders(orderResult);
        setCustomers(Object.fromEntries(customerResult.map((c) => [c._id, c])));
        setStaff(staffResult);
        setClothTypes(catalog.clothTypes ?? []);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in step with the filters so a view can be bookmarked or shared.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.range !== DEFAULT_FILTERS.range) params.set("range", filters.range);
    if (filters.range === "custom") {
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
    }
    if (filters.staff) params.set("staff", filters.staff);
    if (filters.clothType) params.set("type", filters.clothType);
    if (filters.status) params.set("status", filters.status);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/reports?${query}` : "/reports");
  }, [filters]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s._id, s])), [staff]);

  const stats = useMemo(() => {
    const earliest = orders.reduce<Date | null>((min, o) => {
      if (!o.createdAt) return min;
      const d = new Date(o.createdAt);
      return !min || d < min ? d : min;
    }, null);
    const { start, end } = resolveRange(filters, earliest);
    const inRange = (value?: string | null) => {
      if (!value) return false;
      const d = new Date(value);
      return d >= start && d < end;
    };

    // Filters other than the date apply to every figure on the page.
    const matches = (o: Order) => {
      if (filters.staff === "unassigned" ? !!o.assignedTo : filters.staff && o.assignedTo !== filters.staff) return false;
      if (filters.clothType && !orderItems(o).some((i) => i.clothType === filters.clothType)) return false;
      if (filters.status === "active" ? !OPEN_STATUSES.includes(o.status) : filters.status && o.status !== filters.status) return false;
      return true;
    };
    const matching = orders.filter(matches);
    const created = matching.filter((o) => inRange(o.createdAt));
    const billable = created.filter((o) => o.status !== "cancelled");

    const payments = matching.flatMap((o) => o.payments ?? []).filter((p) => inRange(p.paidAt));

    // Deliveries completed in the window, and how many were on or before the promised date.
    let delivered = 0;
    let onTime = 0;
    for (const o of matching) {
      const entry = [...(o.statusHistory ?? [])].reverse().find((h) => h.status === "delivered");
      if (!entry || !inRange(entry.at) || !o.deliveryDate) continue;
      delivered += 1;
      if (new Date(entry.at) < new Date(startOfDay(new Date(o.deliveryDate)).getTime() + DAY)) onTime += 1;
    }

    const { bucket, starts } = buildBuckets(start, end);
    const orderSeries = starts.map(() => 0);
    const moneySeries = starts.map(() => 0);
    for (const o of created) {
      const i = bucketIndex(starts, new Date(o.createdAt!));
      if (i >= 0) orderSeries[i] += 1;
    }
    for (const p of payments) {
      const i = bucketIndex(starts, new Date(p.paidAt));
      if (i >= 0) moneySeries[i] += p.amount;
    }

    const byStatus: Record<string, number> = {};
    for (const o of created) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

    const byType: Record<string, { pieces: number; revenue: number }> = {};
    for (const o of billable) {
      for (const item of orderItems(o)) {
        if (filters.clothType && item.clothType !== filters.clothType) continue;
        const entry = (byType[item.clothType] ??= { pieces: 0, revenue: 0 });
        entry.pieces += item.quantity || 1;
        entry.revenue += (item.price ?? 0) * (item.quantity || 1);
      }
    }

    const byMethod: Record<string, number> = {};
    for (const p of payments) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;

    const team: Record<string, { assigned: number; open: number; delivered: number; overdue: number }> = {};
    for (const o of created) {
      const key = o.assignedTo ?? "unassigned";
      const row = (team[key] ??= { assigned: 0, open: 0, delivered: 0, overdue: 0 });
      row.assigned += 1;
      if (OPEN_STATUSES.includes(o.status)) row.open += 1;
      if (o.status === "delivered") row.delivered += 1;
      if (isOverdue(o)) row.overdue += 1;
    }

    const byCustomer: Record<string, { billed: number; orders: number }> = {};
    for (const o of billable) {
      const row = (byCustomer[o.customerId] ??= { billed: 0, orders: 0 });
      row.billed += payable(o);
      row.orders += 1;
    }

    const billed = billable.reduce((s, o) => s + payable(o), 0);
    return {
      start,
      end,
      bucket,
      starts,
      created,
      orderSeries,
      moneySeries,
      pieces: billable.reduce((s, o) => s + orderItems(o).reduce((n, i) => n + (i.quantity || 1), 0), 0),
      billed,
      collected: payments.reduce((s, p) => s + p.amount, 0),
      paymentCount: payments.length,
      avg: billable.length ? Math.round(billed / billable.length) : 0,
      due: created.reduce((s, o) => s + dueAmount(o), 0),
      delivered,
      onTime,
      byStatus,
      byType,
      byMethod,
      team,
      byCustomer,
    };
  }, [orders, filters]);

  const seriesLabels = (index: number): { label: string; short: string } => {
    const d = stats.starts[index];
    if (stats.bucket === "month") {
      const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
      return { label, short: d.toLocaleDateString(locale, { month: "short", year: "2-digit" }) };
    }
    const short = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    if (stats.bucket === "week") return { label: t("stats.weekOf", { date: short }), short };
    return { label: d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }), short };
  };
  const toSeries = (values: number[]): ColumnDatum[] =>
    values.map((value, i) => ({ key: String(i), value, ...seriesLabels(i) }));

  function exportCsv() {
    const header = [
      "Order",
      "Created",
      "Customer",
      "Phone",
      "Items",
      "Status",
      "Delivery",
      "Assigned to",
      ...(canSeeMoney ? ["Total", "Discount", "Paid", "Due"] : []),
    ];
    const rows = stats.created.map((o) => {
      const customer = customers[o.customerId];
      const assignee = o.assignedTo ? staffById[o.assignedTo] : undefined;
      return [
        formatOrderNo(o),
        o.createdAt ? toInputDate(new Date(o.createdAt)) : "",
        customer?.name ?? "",
        customer?.phone ?? "",
        orderItems(o)
          .map((i) => `${i.clothType} x${i.quantity || 1}`)
          .join("; "),
        o.status,
        o.deliveryDate ? toInputDate(new Date(o.deliveryDate)) : "",
        assignee ? assignee.name || assignee.email : "",
        ...(canSeeMoney ? [o.amount ?? 0, o.discount ?? 0, o.paidAmount ?? 0, dueAmount(o)] : []),
      ];
    });
    // BOM so Excel opens Bangla names correctly.
    const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `dorjee-orders-${toInputDate(stats.start)}-to-${toInputDate(new Date(stats.end.getTime() - DAY))}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: t("stats.kpi.orders"), value: num(stats.created.length), desc: t("stats.kpi.ordersDesc", { n: stats.pieces }), icon: ClipboardList },
    ...(canSeeMoney
      ? [
          { label: t("stats.kpi.billed"), value: money(stats.billed), desc: t("stats.kpi.billedDesc"), icon: TrendingUp },
          { label: t("stats.kpi.collected"), value: money(stats.collected), desc: t("stats.kpi.collectedDesc", { n: stats.paymentCount }), icon: Wallet },
          { label: t("stats.kpi.avg"), value: money(stats.avg), desc: t("stats.kpi.avgDesc"), icon: BarChart3 },
          { label: t("stats.kpi.due"), value: money(stats.due), desc: t("stats.kpi.dueDesc"), icon: Wallet, warn: stats.due > 0 },
        ]
      : []),
    {
      label: t("stats.kpi.onTime"),
      value: stats.delivered ? `${num(Math.round((stats.onTime / stats.delivered) * 100))}%` : "—",
      desc: stats.delivered ? t("stats.kpi.onTimeDesc", { done: stats.onTime, total: stats.delivered }) : t("stats.kpi.noDeliveries"),
      icon: CalendarClock,
    },
  ];

  const selectClass = `${inputClass} w-auto py-2 pr-8 text-sm`;
  const bucketLabel = t(`stats.bucket.${stats.bucket}` as TranslationKey);
  const periodText = `${date(stats.start)} – ${date(new Date(stats.end.getTime() - DAY))}`;

  const teamRows = Object.entries(stats.team).sort(([, a], [, b]) => b.assigned - a.assigned);
  const customerRows = Object.entries(stats.byCustomer)
    .sort(([, a], [, b]) => b.billed - a.billed)
    .slice(0, 8);

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("stats.title")}
        subtitle={t("stats.sub")}
        actions={
          <button type="button" className={btnSecondary} onClick={exportCsv} disabled={loading || stats.created.length === 0}>
            <Download className="h-4 w-4" />
            {t("stats.export")}
          </button>
        }
      />

      {/* Filters: one row above all the charts */}
      <div className={`${cardClass} space-y-3 p-4`}>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="radiogroup" aria-label={t("stats.range")}>
          {PRESETS.map((preset) => {
            const on = filters.range === preset;
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ range: preset })}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  on ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
                }`}
              >
                {t(`stats.range.${preset}` as TranslationKey)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.range === "custom" && (
            <>
              <label className="flex items-center gap-1.5 text-sm text-ink/60">
                {t("stats.from")}
                <input type="date" className={`${inputClass} w-auto py-2`} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink/60">
                {t("stats.to")}
                <input type="date" className={`${inputClass} w-auto py-2`} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
              </label>
            </>
          )}
          <select className={selectClass} aria-label={t("stats.col.member")} value={filters.staff} onChange={(e) => set({ staff: e.target.value })}>
            <option value="">{t("stats.allStaff")}</option>
            {staff.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name || member.email}
              </option>
            ))}
            <option value="unassigned">{t("stats.unassigned")}</option>
          </select>
          <select className={selectClass} aria-label={t("orderForm.clothType")} value={filters.clothType} onChange={(e) => set({ clothType: e.target.value })}>
            <option value="">{t("stats.allTypes")}</option>
            {clothTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select className={selectClass} aria-label={t("orders.col.status")} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">{t("stats.allStatuses")}</option>
            <option value="active">{t("orders.filterActive")}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          {isFiltered && (
            <button type="button" className="text-sm font-medium text-teal hover:underline" onClick={() => setFilters(DEFAULT_FILTERS)}>
              {t("stats.reset")}
            </button>
          )}
          <span className="ml-auto text-xs text-ink/50">{periodText}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className={`grid gap-3 sm:grid-cols-3 ${kpis.length > 3 ? "lg:grid-cols-6" : ""}`}>
            {kpis.map((k) => (
              <div key={k.label} className={`${cardClass} p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-ink/55">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${"warn" in k && k.warn ? "text-coral" : "text-ink/30"}`} />
                </div>
                <p className={`mt-1.5 truncate text-xl font-bold ${"warn" in k && k.warn ? "text-coral" : "text-ink"}`}>{k.value}</p>
                <p className="mt-0.5 truncate text-xs text-ink/45">{k.desc}</p>
              </div>
            ))}
          </div>

          {stats.created.length === 0 && stats.paymentCount === 0 ? (
            <div className={cardClass}>
              <EmptyState icon={BarChart3} title={t("stats.empty")} />
            </div>
          ) : (
            <>
              {/* Over time: two charts, never one with two axes */}
              <div className={`grid gap-5 ${canSeeMoney ? "lg:grid-cols-2" : ""}`}>
                <div className={`${cardClass} p-5`}>
                  <div className="mb-5 flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-ink">{t("stats.ordersOverTime")}</h2>
                    <span className="text-xs text-ink/45">{bucketLabel}</span>
                  </div>
                  <ColumnChart data={toSeries(stats.orderSeries)} format={(v) => num(v)} ariaLabel={t("stats.ordersOverTime")} />
                </div>
                {canSeeMoney && (
                  <div className={`${cardClass} p-5`}>
                    <div className="mb-5 flex items-baseline justify-between gap-2">
                      <h2 className="font-semibold text-ink">{t("stats.collectionsOverTime")}</h2>
                      <span className="text-xs text-ink/45">{bucketLabel}</span>
                    </div>
                    <ColumnChart data={toSeries(stats.moneySeries)} format={money} ariaLabel={t("stats.collectionsOverTime")} />
                  </div>
                )}
              </div>

              {/* Breakdowns */}
              <div className={`grid gap-5 ${canSeeMoney ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                <div className={`${cardClass} p-5`}>
                  <h2 className="mb-4 font-semibold text-ink">{t("stats.byStatus")}</h2>
                  <BarList
                    emptyText={t("stats.empty")}
                    rows={ORDER_STATUSES.filter((s) => stats.byStatus[s]).map((s) => ({
                      key: s,
                      label: t(`status.${s}`),
                      value: stats.byStatus[s],
                      display: num(stats.byStatus[s]),
                      marker: <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[s].dot}`} />,
                    }))}
                  />
                </div>
                <div className={`${cardClass} p-5`}>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
                    <Scissors className="h-4 w-4 text-teal" />
                    {t("stats.byClothType")}
                  </h2>
                  <BarList
                    emptyText={t("stats.empty")}
                    rows={Object.entries(stats.byType)
                      .sort(([, a], [, b]) => (canSeeMoney ? b.revenue - a.revenue : b.pieces - a.pieces))
                      .map(([type, row]) => ({
                        key: type,
                        label: type,
                        sub: canSeeMoney ? t("stats.pieces", { n: row.pieces }) : undefined,
                        value: canSeeMoney ? row.revenue : row.pieces,
                        display: canSeeMoney ? money(row.revenue) : t("stats.pieces", { n: row.pieces }),
                      }))}
                  />
                </div>
                {canSeeMoney && (
                  <div className={`${cardClass} p-5`}>
                    <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
                      <Wallet className="h-4 w-4 text-teal" />
                      {t("stats.byMethod")}
                    </h2>
                    <BarList
                      emptyText={t("dash.noCollections")}
                      rows={Object.entries(stats.byMethod)
                        .sort(([, a], [, b]) => b - a)
                        .map(([method, amount]) => ({
                          key: method,
                          label: t(`method.${method}` as TranslationKey),
                          value: amount,
                          display: money(amount),
                        }))}
                    />
                  </div>
                )}
              </div>

              <div className={`grid gap-5 ${canSeeMoney ? "lg:grid-cols-[1.4fr_1fr]" : ""}`}>
                {/* Team */}
                <div className={`${cardClass} overflow-hidden`}>
                  <h2 className="flex items-center gap-2 border-b border-ink/10 px-5 py-3.5 font-semibold text-ink">
                    <Users className="h-4 w-4 text-teal" />
                    {t("stats.team")}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-paper/60 text-left text-xs font-semibold text-ink/50">
                          <th className="px-5 py-2.5">{t("stats.col.member")}</th>
                          <th className="px-3 py-2.5 text-right">{t("stats.col.assigned")}</th>
                          <th className="px-3 py-2.5 text-right">{t("stats.col.open")}</th>
                          <th className="px-3 py-2.5 text-right">{t("stats.col.delivered")}</th>
                          <th className="px-5 py-2.5 text-right">{t("stats.col.overdue")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/[0.06]">
                        {teamRows.map(([id, row]) => {
                          const member = staffById[id];
                          return (
                            <tr key={id}>
                              <td className="px-5 py-2.5">
                                <span className={member ? "font-medium text-ink" : "italic text-ink/50"}>
                                  {member ? member.name || member.email : t("stats.unassigned")}
                                </span>
                                {member && <span className="ml-2 text-xs text-ink/45">{t(`role.${member.role}` as TranslationKey)}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-ink">{num(row.assigned)}</td>
                              <td className="px-3 py-2.5 text-right text-ink/70">{num(row.open)}</td>
                              <td className="px-3 py-2.5 text-right text-ink/70">{num(row.delivered)}</td>
                              <td className={`px-5 py-2.5 text-right ${row.overdue ? "font-semibold text-coral" : "text-ink/40"}`}>{num(row.overdue)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top customers */}
                {canSeeMoney && (
                  <div className={`${cardClass} p-5`}>
                    <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
                      <TrendingUp className="h-4 w-4 text-teal" />
                      {t("stats.topCustomers")}
                    </h2>
                    <BarList
                      emptyText={t("stats.empty")}
                      rows={customerRows.map(([id, row]) => ({
                        key: id,
                        label: customers[id]?.name ?? t("common.deletedCustomer"),
                        sub: t("stats.ordersCount", { n: row.orders }),
                        value: row.billed,
                        display: money(row.billed),
                        href: customers[id] ? `/customers/${id}` : undefined,
                      }))}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
