"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  subscriptionStatus?: string;
}

interface Payment {
  _id: string;
}

interface DashboardCard {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export default function DashboardPage() {
  const [cards, setCards] = useState<DashboardCard[]>([
    {
      label: "Total Shops",
      value: "—",
      description: "All registered shops",
      icon: <BarChart3 className="w-5 h-5" />,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Pending Payments",
      value: "—",
      description: "Awaiting verification",
      icon: <AlertCircle className="w-5 h-5" />,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      label: "Trial / Active",
      value: "—",
      description: "Shops in trial or active",
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Projected MRR",
      value: "—",
      description: "Estimated monthly revenue",
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ]);

  useEffect(() => {
    async function loadSummary() {
      const token = getAdminToken();
      if (!token) return;

      const [shops, pending] = await Promise.all([
        apiRequest<Shop[]>("/shops", {}, token),
        apiRequest<Payment[]>("/admin/payments/pending", {}, token),
      ]);

      const activeLike = shops.filter((s) =>
        ["active", "trial"].includes(s.subscriptionStatus ?? "")
      ).length;
      const projectedMrr = activeLike * 500;

      setCards([
        {
          label: "Total Shops",
          value: String(shops.length),
          description: "All registered shops",
          icon: <BarChart3 className="w-5 h-5" />,
          iconBg: "bg-indigo-100",
          iconColor: "text-indigo-600",
        },
        {
          label: "Pending Payments",
          value: String(pending.length),
          description: "Awaiting verification",
          icon: <AlertCircle className="w-5 h-5" />,
          iconBg: "bg-rose-100",
          iconColor: "text-rose-600",
        },
        {
          label: "Trial / Active",
          value: String(activeLike),
          description: "Shops in trial or active",
          icon: <TrendingUp className="w-5 h-5" />,
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
        },
        {
          label: "Projected MRR",
          value: `৳${projectedMrr.toLocaleString()}`,
          description: "Estimated monthly revenue",
          icon: <DollarSign className="w-5 h-5" />,
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
        },
      ]);
    }

    void loadSummary();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor billing, shop operations, and platform metrics.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{card.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Payment Approvals</h2>
          <p className="text-xs text-slate-400 mb-4">
            Review pending bKash and Nagad payment references from shops.
          </p>
          <a
            href="/payments"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
          >
            Review Payments
          </a>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Shop Management</h2>
          <p className="text-xs text-slate-400 mb-4">
            View all onboarded shops, their owners, and subscription statuses.
          </p>
          <a
            href="/shops"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            View All Shops
          </a>
        </div>
      </div>
    </div>
  );
}
