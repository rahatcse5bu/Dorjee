"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, AlertCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  name: string;
  subscriptionStatus: string;
}

const statusConfig: Record<string, { label: string; badge: string; card: string; dot: string }> = {
  active: {
    label: "Active",
    badge: "bg-emerald-100 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50",
    dot: "bg-emerald-500",
  },
  trial: {
    label: "Trial",
    badge: "bg-sky-100 text-sky-700",
    card: "border-sky-200 bg-sky-50",
    dot: "bg-sky-500",
  },
  grace: {
    label: "Grace Period",
    badge: "bg-amber-100 text-amber-700",
    card: "border-amber-200 bg-amber-50",
    dot: "bg-amber-500",
  },
  expired: {
    label: "Expired",
    badge: "bg-red-100 text-red-600",
    card: "border-red-200 bg-red-50",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    badge: "bg-slate-100 text-slate-600",
    card: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
  },
};

function getConfig(status: string) {
  return statusConfig[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    badge: "bg-slate-100 text-slate-600",
    card: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
  };
}

export default function SubscriptionsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = getAdminToken();
      if (!token) {
        setError("Please login from /login with an admin account.");
        return;
      }
      try {
        const result = await apiRequest<Shop[]>("/shops", {}, token);
        setShops(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load subscriptions");
      }
    }
    void load();
  }, []);

  const byStatus = shops.reduce<Record<string, number>>((acc, shop) => {
    const key = shop.subscriptionStatus || "pending";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const statusOrder = ["active", "trial", "grace", "expired", "pending"];
  const sortedStatuses = [
    ...statusOrder.filter((s) => byStatus[s]),
    ...Object.keys(byStatus).filter((s) => !statusOrder.includes(s)),
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage plan status, grace periods, and subscription renewals.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Status summary cards */}
      {sortedStatuses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {sortedStatuses.map((status) => {
            const config = getConfig(status);
            return (
              <div
                key={status}
                className={`rounded-xl border p-5 ${config.card}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {config.label}
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{byStatus[status]}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {byStatus[status] === 1 ? "shop" : "shops"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Shops table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">All Shops — Subscription Detail</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Shop Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shops.map((shop) => {
              const config = getConfig(shop.subscriptionStatus || "pending");
              return (
                <tr key={shop._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{shop.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shops.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <RefreshCcw className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No subscription data yet</p>
            <p className="text-xs text-slate-400 mt-1">Shops will appear here once onboarded</p>
          </div>
        )}
      </div>
    </div>
  );
}
