"use client";

import { useEffect, useState } from "react";
import { Store, AlertCircle, Search } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  subscriptionStatus: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  trial: { label: "Trial", className: "bg-sky-100 text-sky-700" },
  grace: { label: "Grace Period", className: "bg-amber-100 text-amber-700" },
  expired: { label: "Expired", className: "bg-red-100 text-red-600" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-600" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadShops() {
      const token = getAdminToken();
      if (!token) {
        setError("Please login from /login with an admin account.");
        return;
      }
      try {
        const result = await apiRequest<Shop[]>("/shops", {}, token);
        setShops(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shops");
      }
    }
    void loadShops();
  }, []);

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Shops</h1>
          <p className="mt-1 text-sm text-slate-500">
            All onboarded shops and their subscription statuses.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <Store className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-slate-700">{shops.length}</span>
          <span>total</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by shop name, owner or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Shop
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Owner
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Phone
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Subscription
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((shop) => (
              <tr key={shop._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">{shop.name}</td>
                <td className="px-6 py-4 text-slate-600">{shop.ownerName}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{shop.phone}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={shop.subscriptionStatus || "pending"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Store className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {search ? "No shops match your search" : "No shops registered yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? "Try a different search term" : "Shops will appear here once onboarded"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
