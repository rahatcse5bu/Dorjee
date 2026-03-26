"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Payment {
  _id: string;
  shopId: string;
  method: string;
  amountBdt: number;
  transactionId: string;
  status: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  async function loadPending() {
    const token = getAdminToken();
    if (!token) {
      setError("Please login from /login with an admin account.");
      return;
    }

    try {
      const result = await apiRequest<Payment[]>("/admin/payments/pending", {}, token);
      setPayments(result);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function approve(paymentId: string) {
    const token = getAdminToken();
    if (!token) {
      return;
    }

    await apiRequest(`/admin/payments/${paymentId}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ notes: "Approved" }),
    }, token);
    await loadPending();
  }

  async function reject(paymentId: string) {
    const token = getAdminToken();
    if (!token) {
      return;
    }

    await apiRequest(`/admin/payments/${paymentId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ notes: "Rejected" }),
    }, token);
    await loadPending();
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate">Manual Payments</h2>
      <p className="mt-1 text-sm text-slate/70">Verify bKash and Nagad references submitted by shops.</p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate/10 bg-fog">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate/10">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Shop ID</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Txn ID</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id} className="border-b border-slate/5">
                <td className="px-4 py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{payment.shopId}</td>
                <td className="px-4 py-3">{payment.method}</td>
                <td className="px-4 py-3">{payment.amountBdt}</td>
                <td className="px-4 py-3">{payment.transactionId}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="rounded bg-cyan px-3 py-1 text-white" onClick={() => void approve(payment._id)}>
                      Approve
                    </button>
                    <button className="rounded bg-rose px-3 py-1 text-white" onClick={() => void reject(payment._id)}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
