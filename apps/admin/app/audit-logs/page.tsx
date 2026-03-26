"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface AuditPayment {
  _id: string;
  shopId: string;
  status: "approved" | "rejected";
  method: string;
  amountBdt: number;
  transactionId: string;
  reviewedBy?: string;
  updatedAt: string;
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditPayment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = getAdminToken();
      if (!token) {
        setError("Please login from /login with an admin account.");
        return;
      }

      try {
        const result = await apiRequest<AuditPayment[]>("/admin/payments/history", {}, token);
        setItems(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      }
    }

    void load();
  }, []);

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate">Audit Logs</h2>
      <p className="mt-1 text-sm text-slate/70">Track every sensitive action in the Dorjee platform.</p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-fog">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate/10">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Shop ID</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Txn ID</th>
              <th className="px-4 py-3">Reviewed By</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="border-b border-slate/5">
                <td className="px-4 py-3">{new Date(item.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-3">{item.shopId}</td>
                <td className="px-4 py-3">payment_{item.status}</td>
                <td className="px-4 py-3">{item.method}</td>
                <td className="px-4 py-3">{item.amountBdt}</td>
                <td className="px-4 py-3">{item.transactionId}</td>
                <td className="px-4 py-3">{item.reviewedBy ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
