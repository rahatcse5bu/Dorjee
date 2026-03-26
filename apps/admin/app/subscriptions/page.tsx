"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  name: string;
  subscriptionStatus: string;
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
    const key = shop.subscriptionStatus || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate">Subscriptions</h2>
      <p className="mt-1 text-sm text-slate/70">Manage plan status, grace periods, and renewals.</p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {Object.entries(byStatus).map(([status, count]) => (
          <article key={status} className="rounded-xl border border-slate/10 bg-fog p-4">
            <p className="text-sm text-slate/70">{status}</p>
            <p className="mt-2 text-2xl font-semibold text-slate">{count}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-fog">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate/10">
            <tr>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop._id} className="border-b border-slate/5">
                <td className="px-4 py-3">{shop.name}</td>
                <td className="px-4 py-3">{shop.subscriptionStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
