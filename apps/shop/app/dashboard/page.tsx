"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  Phone,
  Plus,
  Scissors,
  Search,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { btnPrimary, cardClass, inputClass, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import {
  Customer,
  daysUntilDelivery,
  dueAmount,
  formatOrderNo,
  OPEN_STATUSES,
  Order,
  ORDER_STATUSES,
  orderItems,
  STATUS_STYLE,
} from "../../lib/orders";
import { useSession } from "../../lib/session";

interface Subscription {
  status?: string;
  trialEndsAt?: string;
}

const DAY_MS = 86_400_000;
const CHART_DAYS = 14;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, money, num, date, lang } = useI18n();
  const { user, token, shopId } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [subscription, setSubscription] = useState<Subscription>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [orderResult, customerResult, sub] = await Promise.all([
          apiRequest<Order[]>(`/shops/${shopId}/orders`, {}, token),
          apiRequest<Customer[]>(`/shops/${shopId}/customers`, {}, token),
          apiRequest<Subscription>(`/shops/${shopId}/subscription`, {}, token).catch(() => ({})),
        ]);
        setOrders(orderResult);
        setCustomerList(customerResult);
        setSubscription(sub);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customers = useMemo(() => Object.fromEntries(customerList.map((c) => [c._id, c])), [customerList]);

  // Tailors see only the work assigned to them.
  const isTailor = user?.role === "tailor";
  const scoped = useMemo(
    () => (isTailor ? orders.filter((o) => o.assignedTo === user?.sub) : orders),
    [orders, isTailor, user?.sub],
  );

  const m = useMemo(() => {
    const now = new Date();
    const thisMonth = (value?: string) => {
      if (!value) return false;
      const d = new Date(value);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };
    const open = scoped.filter((o) => OPEN_STATUSES.includes(o.status));

    // Delivery schedule, grouped by how soon each order is due.
    const groups = { overdue: [] as Order[], today: [] as Order[], tomorrow: [] as Order[], week: [] as Order[] };
    for (const order of open) {
      if (order.status === "ready") continue;
      const days = daysUntilDelivery(order);
      if (days === null || days > 7) continue;
      if (days < 0) groups.overdue.push(order);
      else if (days === 0) groups.today.push(order);
      else if (days === 1) groups.tomorrow.push(order);
      else groups.week.push(order);
    }
    for (const list of Object.values(groups)) {
      list.sort((a, b) => (daysUntilDelivery(a) ?? 0) - (daysUntilDelivery(b) ?? 0));
    }

    // Daily collections for the chart, oldest day first.
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setTime(start.getTime() - (CHART_DAYS - 1) * DAY_MS);
    const days = Array.from({ length: CHART_DAYS }, (_, i) => new Date(start.getTime() + i * DAY_MS));
    const byDay: Record<string, number> = {};
    const payments = scoped.flatMap((o) => o.payments ?? []);
    for (const p of payments) {
      const key = dayKey(new Date(p.paidAt));
      byDay[key] = (byDay[key] ?? 0) + p.amount;
    }
    const series = days.map((d) => ({ date: d, amount: byDay[dayKey(d)] ?? 0 }));

    // Customers who owe the most.
    const dueByCustomer: Record<string, number> = {};
    for (const o of scoped) {
      const due = dueAmount(o);
      if (due > 0) dueByCustomer[o.customerId] = (dueByCustomer[o.customerId] ?? 0) + due;
    }
    const topDues = Object.entries(dueByCustomer)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const statusCounts: Record<string, number> = {};
    for (const o of scoped) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

    return {
      open,
      groups,
      ready: scoped.filter((o) => o.status === "ready"),
      outstanding: Object.values(dueByCustomer).reduce((s, v) => s + v, 0),
      withDueCount: scoped.filter((o) => dueAmount(o) > 0).length,
      collectedMonth: payments.filter((p) => thisMonth(p.paidAt)).reduce((s, p) => s + p.amount, 0),
      newThisMonth: scoped.filter((o) => thisMonth(o.createdAt)).length,
      series,
      seriesTotal: series.reduce((s, d) => s + d.amount, 0),
      seriesMax: Math.max(...series.map((d) => d.amount), 0),
      topDues,
      statusCounts,
    };
  }, [scoped]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return { customers: [] as Customer[], orders: [] as Order[] };
    return {
      customers: customerList.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 4),
      orders: orders
        .filter((o) => formatOrderNo(o).toLowerCase().includes(q) || String(o.orderNo ?? "") === q)
        .slice(0, 4),
    };
  }, [query, customerList, orders]);

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const today = new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  const shortDay = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const trialDaysLeft =
    subscription.status === "trial" && subscription.trialEndsAt
      ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / DAY_MS)
      : null;
  const totalStatus = Object.values(m.statusCounts).reduce((s, v) => s + v, 0);

  const focus = [
    { value: m.groups.today.length, label: t("dash.focusDeliver"), icon: CalendarClock },
    { value: m.groups.overdue.length, label: t("dash.focusOverdue"), icon: AlertTriangle, alert: m.groups.overdue.length > 0 },
    { value: m.ready.length, label: t("dash.focusReady"), icon: PackageCheck },
  ];

  const kpis = [
    { label: t("dash.activeOrders"), value: num(m.open.length), desc: t("dash.activeOrdersDesc"), icon: Scissors },
    { label: t("dash.outstanding"), value: money(m.outstanding), desc: t("dash.outstandingDesc", { n: m.withDueCount }), icon: Wallet, warn: m.outstanding > 0 },
    { label: t("dash.collected"), value: money(m.collectedMonth), desc: t("dash.collectedDesc", { n: m.newThisMonth }), icon: TrendingUp },
  ];

  const scheduleGroups: Array<{ key: keyof typeof m.groups; label: TranslationKey; tone: string }> = [
    { key: "overdue", label: "dash.group.overdue", tone: "text-coral" },
    { key: "today", label: "dash.group.today", tone: "text-teal" },
    { key: "tomorrow", label: "dash.group.tomorrow", tone: "text-ink/70" },
    { key: "week", label: "dash.group.week", tone: "text-ink/50" },
  ];
  const scheduleCount = Object.values(m.groups).reduce((s, g) => s + g.length, 0);

  const hovered = hoverBar !== null ? m.series[hoverBar] : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">{today}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            {user?.name ? t("dash.greeting", { name: user.name.split(" ")[0] }) : t("dash.greetingFallback")}
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              type="search"
              className={`${inputClass} pl-9`}
              placeholder={t("dash.searchPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {searchOpen && query.trim() && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
                {searchResults.orders.length + searchResults.customers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-ink/50">{t("dash.noMatch")}</p>
                ) : (
                  <>
                    {searchResults.orders.map((o) => (
                      <button
                        key={o._id}
                        type="button"
                        onMouseDown={() => router.push(`/orders/${o._id}`)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-teal/5"
                      >
                        <ClipboardList className="h-4 w-4 text-ink/40" />
                        <span className="font-mono font-semibold text-ink">{formatOrderNo(o)}</span>
                        <span className="truncate text-ink/55">{customers[o.customerId]?.name}</span>
                      </button>
                    ))}
                    {searchResults.customers.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onMouseDown={() => router.push(`/customers/${c._id}`)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-teal/5"
                      >
                        <User className="h-4 w-4 text-ink/40" />
                        <span className="truncate font-medium text-ink">{c.name}</span>
                        <span className="ml-auto text-ink/45">{c.phone}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <Link href="/orders?new=1" className={btnPrimary}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dash.newOrder")}</span>
          </Link>
        </div>
      </div>

      {/* Trial banner */}
      {trialDaysLeft !== null && trialDaysLeft <= 3 && user?.role === "shop_owner" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("dash.trialBanner", { date: date(subscription.trialEndsAt) })}
          </p>
          <Link href="/subscription" className="rounded-lg bg-amber-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800">
            {t("dash.subscribe")}
          </Link>
        </div>
      )}

      {/* Today at a glance */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#12606a] via-teal to-[#1d8f93] p-5 text-white shadow-[0_18px_40px_-18px_rgba(23,126,137,0.7)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("dash.todayFocus")}</p>
        <div className="mt-3 grid grid-cols-3 divide-x divide-white/15">
          {focus.map((f, i) => (
            <Link key={f.label} href="/orders" className={`group ${i === 0 ? "pr-3" : "px-3 sm:px-6"}`}>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <span className="inline-block h-9 w-10 animate-pulse rounded bg-white/20" />
                ) : (
                  <span className={`text-3xl font-bold sm:text-4xl ${f.alert ? "text-amber-200" : ""}`}>{num(f.value)}</span>
                )}
                <f.icon className="hidden h-4 w-4 text-white/60 sm:block" />
              </div>
              <p className="mt-1 text-xs text-white/75 group-hover:text-white sm:text-sm">{f.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-3">
            {kpis.map((k) =>
              loading ? (
                <Skeleton key={k.label} className="h-[104px]" />
              ) : (
                <div key={k.label} className={`${cardClass} p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink/55">{k.label}</p>
                    <k.icon className={`h-4 w-4 ${k.warn ? "text-coral" : "text-ink/30"}`} />
                  </div>
                  <p className={`mt-1.5 truncate text-2xl font-bold ${k.warn ? "text-coral" : "text-ink"}`}>{k.value}</p>
                  <p className="mt-0.5 truncate text-xs text-ink/45">{k.desc}</p>
                </div>
              ),
            )}
          </div>

          {/* Collections chart */}
          <div className={`${cardClass} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-ink">{t("dash.collections")}</h2>
                <p className="text-xs text-ink/50">{t("dash.last14")}</p>
              </div>
              <div className="text-right" aria-live="polite">
                <p className="text-2xl font-bold text-ink">{money(hovered ? hovered.amount : m.seriesTotal)}</p>
                <p className="text-xs text-ink/50">{hovered ? hovered.date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) : t("dash.last14")}</p>
              </div>
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-40" />
            ) : m.seriesTotal === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">{t("dash.noCollections")}</p>
            ) : (
              <figure className="mt-4" aria-label={t("dash.chartLabel")}>
                <div className="relative h-40">
                  {/* Recessive guide lines */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    <span className="border-t border-dashed border-ink/10" />
                    <span className="border-t border-dashed border-ink/10" />
                    <span className="border-t border-ink/15" />
                  </div>
                  <span className="absolute -top-2 left-0 bg-white/80 pr-1 text-[10px] text-ink/40">{money(m.seriesMax)}</span>
                  <div className="relative flex h-full items-end gap-[2px]" onMouseLeave={() => setHoverBar(null)}>
                    {m.series.map((d, i) => {
                      const pct = m.seriesMax ? (d.amount / m.seriesMax) * 100 : 0;
                      const active = hoverBar === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={`${shortDay(d.date)}: ${money(d.amount)}`}
                          onMouseEnter={() => setHoverBar(i)}
                          onFocus={() => setHoverBar(i)}
                          onBlur={() => setHoverBar(null)}
                          className="group flex h-full flex-1 items-end focus:outline-none"
                        >
                          <span
                            className={`block w-full rounded-t-[4px] transition-colors ${
                              d.amount === 0 ? "bg-ink/[0.06]" : active ? "bg-[#0f5f68]" : "bg-teal"
                            } ${hoverBar !== null && !active && d.amount > 0 ? "opacity-50" : ""}`}
                            style={{ height: d.amount === 0 ? "3px" : `${Math.max(pct, 4)}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-ink/45">
                  <span>{shortDay(m.series[0].date)}</span>
                  <span>{shortDay(m.series[Math.floor(CHART_DAYS / 2)].date)}</span>
                  <span>{t("common.today")}</span>
                </div>
              </figure>
            )}
          </div>

          {/* Delivery schedule */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <CalendarClock className="h-4 w-4 text-teal" />
                {isTailor ? t("dash.myWork") : t("dash.deliveries")}
              </h2>
              <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline">
                {t("dash.viewAll")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : scheduleCount === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink/50">{t("dash.upcomingEmpty")}</p>
            ) : (
              <div className="divide-y divide-ink/[0.06]">
                {scheduleGroups
                  .filter((g) => m.groups[g.key].length > 0)
                  .map((g) => (
                    <div key={g.key}>
                      <p className={`bg-paper/60 px-5 py-2 text-xs font-semibold uppercase tracking-wider ${g.tone}`}>
                        {t(g.label)} · {num(m.groups[g.key].length)}
                      </p>
                      <ul className="divide-y divide-ink/[0.05]">
                        {m.groups[g.key].slice(0, 6).map((order) => {
                          const customer = customers[order.customerId];
                          const due = dueAmount(order);
                          return (
                            <li key={order._id}>
                              <Link href={`/orders/${order._id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-teal/[0.03]">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[order.status]?.dot ?? "bg-ink/30"}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-sm">
                                    <span className="font-mono font-semibold text-ink">{formatOrderNo(order)}</span>
                                    <span className="truncate font-medium text-ink/80">{customer?.name}</span>
                                  </p>
                                  <p className="truncate text-xs text-ink/50">
                                    {orderItems(order).map((i) => i.clothType).join(", ")} · {t(`status.${order.status}` as TranslationKey)}
                                  </p>
                                </div>
                                <div className="text-right text-xs">
                                  <p className="text-ink/60">{date(order.deliveryDate)}</p>
                                  {due > 0 && <p className="font-semibold text-coral">{money(due)}</p>}
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink/25" />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Ready for pickup */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                {t("dash.readyPickup")}
              </h2>
              {m.ready.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{num(m.ready.length)}</span>
              )}
            </div>
            {loading ? (
              <div className="p-5">
                <Skeleton className="h-10" />
              </div>
            ) : m.ready.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink/50">{t("dash.readyEmpty")}</p>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {m.ready.slice(0, 5).map((order) => {
                  const customer = customers[order.customerId];
                  const due = dueAmount(order);
                  return (
                    <li key={order._id} className="flex items-center gap-2 px-5 py-3">
                      <Link href={`/orders/${order._id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink hover:text-teal">{customer?.name}</p>
                        <p className="text-xs text-ink/50">
                          {formatOrderNo(order)}
                          {due > 0 ? <span className="font-semibold text-coral"> · {money(due)}</span> : <span className="text-emerald-700"> · {t("orders.fullyPaid")}</span>}
                        </p>
                      </Link>
                      {customer?.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          aria-label={`${t("customer.call")} ${customer.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-teal hover:bg-teal/10"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Biggest dues */}
          {!isTailor && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-ink/10 px-5 py-3.5">
                <h2 className="flex items-center gap-2 font-semibold text-ink">
                  <Wallet className="h-4 w-4 text-coral" />
                  {t("dash.topDues")}
                </h2>
              </div>
              {loading ? (
                <div className="p-5">
                  <Skeleton className="h-10" />
                </div>
              ) : m.topDues.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-ink/50">{t("dash.noDues")}</p>
              ) : (
                <ul className="space-y-3 p-5">
                  {m.topDues.map(([customerId, amount]) => {
                    const customer = customers[customerId];
                    return (
                      <li key={customerId}>
                        <Link href={`/customers/${customerId}`} className="group block">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-ink group-hover:text-teal">{customer?.name ?? "—"}</span>
                            <span className="font-semibold text-ink">{money(amount)}</span>
                          </div>
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                            <span
                              className="block h-full rounded-full bg-coral/70"
                              style={{ width: `${(amount / m.topDues[0][1]) * 100}%` }}
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Pipeline */}
          <div className={`${cardClass} p-5`}>
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <ClipboardList className="h-4 w-4 text-teal" />
              {t("dash.pipeline")}
            </h2>
            {loading ? (
              <Skeleton className="mt-4 h-24" />
            ) : (
              <>
                <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full bg-ink/[0.06]" role="img" aria-label={t("dash.pipeline")}>
                  {ORDER_STATUSES.filter((s) => m.statusCounts[s]).map((s) => (
                    <span
                      key={s}
                      title={`${t(`status.${s}`)}: ${num(m.statusCounts[s])}`}
                      className={STATUS_STYLE[s].dot}
                      style={{ width: `${(m.statusCounts[s] / Math.max(totalStatus, 1)) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {ORDER_STATUSES.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[s].dot}`} />
                      <span className="flex-1 truncate text-ink/65">{t(`status.${s}`)}</span>
                      <span className="font-semibold text-ink">{num(m.statusCounts[s] ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
