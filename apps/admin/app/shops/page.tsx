"use client";

import { useEffect, useState } from "react";
import { Store, AlertCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  subscriptionStatus: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
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

  return (
    <section>
      <div className="mb-8 space-y-1">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 p-2">
            <Store className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate">All Shops</h2>
        </div>
        <p className="text-sm admin-quiet">Onboarded shops and subscription status overview.</p>
      </div>
      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl admin-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate/10 bg-gradient-to-r from-slate/5 to-transparent">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate">Shop</th>
              <th className="px-6 py-4 font-semibold text-slate">Owner</th>
              <th className="px-6 py-4 font-semibold text-slate">Phone</th>
              <th className="px-6 py-4 font-semibold text-slate">Subscription</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop, idx) => (
              <tr key={shop._id} className={`border-b border-slate/5 transition-colors hover:bg-slate/3 ${ idx % 2 === 0 ? "bg-white/50" : "bg-white/30" }`}>
                <td className="px-6 py-4 font-medium text-slate">{shop.name}</td>
                <td className="px-6 py-4 text-slate/70">{shop.ownerName}</td>
                <td className="px-6 py-4 text-slate/70">{shop.phone}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${ shop.subscriptionStatus === "active" ? "bg-emerald-100 text-emerald-700" : shop.subscriptionStatus === "trial" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700" }`}>
                    {shop.subscriptionStatus ? shop.subscriptionStatus.charAt(0).toUpperCase() + shop.subscriptionStatus.slice(1) : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shops.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-slate/50">
            <p>No shops registered yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
