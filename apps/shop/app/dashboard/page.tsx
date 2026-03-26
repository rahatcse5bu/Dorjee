"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  PackageCheck,
  Zap,
  Plus,
  ClipboardList,
  Ruler,
  UserPlus,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-ink/10 text-ink/60" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  in_tailoring: { label: "In Tailoring", color: "bg-amber-100 text-amber-700" },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "Delivered", color: "bg-teal/10 text-teal" },
  cancelled: { label: "Cancelled", color: "bg-coral/10 text-coral" },
};

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-ink/10 bg-ink/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="h-2.5 w-24 rounded-full bg-ink/10" />
          <div className="h-7 w-14 rounded-lg bg-ink/10" />
          <div className="h-2 w-32 rounded-full bg-ink/8" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-ink/10" />
      </div>
    </div>
  );
}

function SkeletonStatusRow() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {[80, 64, 72, 56].map((w) => (
        <div
          key={w}
          className="animate-pulse h-7 rounded-full bg-ink/10"
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [dueDeliveries, setDueDeliveries] = useState(0);
  const [subscription, setSubscription] = useState<{
    status?: string;
    trialEndsAt?: string;
  }>({});
  const [statusBreakdown, setStatusBreakdown] = useState<
    Record<string, number>
  >({});

  const user = getShopUser();
  const token = getShopToken();

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.shopId || !token) return;

      const [orders, customers, sub] = await Promise.all([
        apiRequest<any[]>(`/shops/${user.shopId}/orders`, {}, token),
        apiRequest<any[]>(`/shops/${user.shopId}/customers`, {}, token),
        apiRequest<{ status?: string; trialEndsAt?: string }>(
          `/shops/${user.shopId}/subscription`,
          {},
          token,
        ),
      ]);

      const now = new Date();
      const monthOrders = orders.filter((o) => {
        if (!o.createdAt) return false;
        const d = new Date(o.createdAt);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      });

      const breakdown: Record<string, number> = {};
      for (const o of orders) {
        if (o.status) breakdown[o.status] = (breakdown[o.status] ?? 0) + 1;
      }

      setOrderCount(monthOrders.length);
      setCustomerCount(customers.length);
      setDueDeliveries(
        orders.filter((o) =>
          ["confirmed", "in_tailoring", "ready"].includes(o.status),
        ).length,
      );
      setSubscription(sub);
      setStatusBreakdown(breakdown);
      setLoading(false);
    }

    void loadDashboard();
  }, [token, user?.shopId]);

  const subscriptionLabel =
    subscription.status === "trial"
      ? `Trial${subscription.trialEndsAt ? ` · ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}` : ""}`
      : subscription.status
        ? subscription.status.charAt(0).toUpperCase() +
          subscription.status.slice(1)
        : "—";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const cards = [
    {
      label: "Orders This Month",
      value: String(orderCount),
      icon: TrendingUp,
      gradient: "from-teal to-[#0f4250]",
      desc: "orders created this month",
    },
    {
      label: "Active Customers",
      value: String(customerCount),
      icon: Users,
      gradient: "from-brass to-[#8a6230]",
      desc: "customers in your database",
    },
    {
      label: "Due Deliveries",
      value: String(dueDeliveries),
      icon: PackageCheck,
      gradient: "from-coral to-[#a53d2d]",
      desc: "orders pending delivery",
    },
    {
      label: "Subscription",
      value: subscriptionLabel,
      icon: Zap,
      gradient: "from-[#6a4faa] to-[#4a3580]",
      desc: "current plan status",
    },
  ];

  const quickActions = [
    {
      href: "/orders",
      label: "New Order",
      icon: Plus,
      desc: "Create a tailoring order",
    },
    {
      href: "/customers",
      label: "Add Customer",
      icon: UserPlus,
      desc: "Register a new customer",
    },
    {
      href: "/orders",
      label: "View Orders",
      icon: ClipboardList,
      desc: "Manage all orders",
    },
    {
      href: "/measurements",
      label: "Measurements",
      icon: Ruler,
      desc: "Manage measurement labels",
    },
  ];

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">
            {today}
          </p>
          <h2 className="text-3xl font-bold text-ink">Good to see you</h2>
          <p className="text-sm shop-quiet">
            Here&apos;s what&apos;s happening in your shop today.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.label}
                  className={`group rounded-xl border border-white/30 bg-gradient-to-br ${card.gradient} p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                        {card.label}
                      </p>
                      <p className="mt-2.5 truncate text-3xl font-bold leading-tight text-white">
                        {card.value}
                      </p>
                      <p className="mt-1 text-xs text-white/50">{card.desc}</p>
                    </div>
                    <div className="shrink-0 rounded-lg bg-white/20 p-2.5 text-white transition-all duration-200 group-hover:scale-105 group-hover:bg-white/35">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </article>
              );
            })}
      </div>

      {/* Quick Actions + Status Breakdown */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-xl border border-ink/10 bg-paper/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-white/60 p-3.5 text-sm font-medium text-ink transition-all duration-150 hover:border-teal/30 hover:bg-teal/5 hover:text-teal hover:shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/50 transition-all group-hover:bg-teal/15 group-hover:text-teal">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{action.label}</p>
                    <p className="truncate text-xs text-ink/40 group-hover:text-teal/60">
                      {action.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="rounded-xl border border-ink/10 bg-paper/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">
            Order Status Breakdown
          </h3>
          {loading ? (
            <SkeletonStatusRow />
          ) : Object.keys(statusBreakdown).length === 0 ? (
            <p className="text-sm shop-quiet">
              No orders yet. Create your first order to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(statusBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] ?? {
                    label: status,
                    color: "bg-ink/10 text-ink/60",
                  };
                  return (
                    <div
                      key={status}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${cfg.color}`}
                    >
                      <span>{cfg.label}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
