"use client";

import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Payment {
  _id: string;
  shopId: string;
  method: string;
  amountBdt: number;
  chargeBdt?: number;
  payableBdt?: number;
  senderNumber?: string;
  months?: number;
  transactionId: string;
  status: string;
  createdAt: string;
}

function planLabel(months = 1) {
  return months === 12 ? "1 year" : months === 1 ? "1 month" : `${months} months`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

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
    if (!token) return;
    setProcessing(paymentId);
    try {
      await apiRequest(`/admin/payments/${paymentId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ notes: "Approved" }),
      }, token);
      await loadPending();
    } finally {
      setProcessing(null);
    }
  }

  async function reject(paymentId: string) {
    const token = getAdminToken();
    if (!token) return;
    setProcessing(paymentId);
    try {
      await apiRequest(`/admin/payments/${paymentId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ notes: "Rejected" }),
      }, token);
      await loadPending();
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manual Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Check each one in the bKash app: the sender number, transaction ID and amount received must match.
          </p>
        </div>
        {payments.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-amber-700">{payments.length}</span>
            <span className="text-amber-600">pending</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Pending Verification Queue</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Shop ID</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent from</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Should receive</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Transaction ID</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString("en-BD", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-[120px] truncate">
                    {payment.shopId}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                      {payment.method === "bkash_manual" ? "bKash" : payment.method === "nagad_manual" ? "Nagad" : payment.method}
                    </span>
                    {payment.senderNumber && (
                      <span className="mt-1 block font-mono text-xs text-slate-700">{payment.senderNumber}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{planLabel(payment.months)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">৳{(payment.payableBdt ?? payment.amountBdt).toLocaleString()}</span>
                    {!!payment.chargeBdt && (
                      <span className="block text-xs text-slate-500">
                        ৳{payment.amountBdt.toLocaleString()} + ৳{payment.chargeBdt.toLocaleString()} charge
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{payment.transactionId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void approve(payment._id)}
                        disabled={processing === payment._id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => void reject(payment._id)}
                        disabled={processing === payment._id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No pending payments to review</p>
          </div>
        )}
      </div>
    </div>
  );
}
