"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, XCircle, Clock, History } from "lucide-react";
import PaymentsTable, { AdminPayment } from "../../components/PaymentsTable";
import RefundDialog from "../../components/RefundDialog";
import { apiRequest } from "../../lib/api";
import { getAdminToken, getAdminUser } from "../../lib/auth";

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
  const [history, setHistory] = useState<AdminPayment[]>([]);
  const [shopNames, setShopNames] = useState<Record<string, string>>({});
  const [refunding, setRefunding] = useState<AdminPayment | null>(null);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<string | undefined>();

  async function loadHistory() {
    const token = getAdminToken();
    if (!token) return;
    try {
      const [list, shops] = await Promise.all([
        apiRequest<AdminPayment[]>("/admin/payments/history", {}, token),
        apiRequest<Array<{ _id: string; name: string }>>("/shops", {}, token),
      ]);
      setHistory(list);
      setShopNames(Object.fromEntries(shops.map((s) => [s._id, s.name])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment history");
    }
  }

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
    setRole(getAdminUser()?.role);
    void loadPending();
    void loadHistory();
  }, []);

  async function review(paymentId: string, action: "approve" | "reject") {
    const token = getAdminToken();
    if (!token) {
      setError("Please login from /login with an admin account.");
      return;
    }
    setProcessing(paymentId);
    setError("");
    try {
      await apiRequest(
        `/admin/payments/${paymentId}/${action}`,
        { method: "PATCH", body: JSON.stringify({ notes: action === "approve" ? "Approved" : "Rejected" }) },
        token,
      );
      await Promise.all([loadPending(), loadHistory()]);
    } catch (err) {
      setError(`Could not ${action} this payment: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Payments</h1>
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Shop</th>
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
                  <td className="px-6 py-4 max-w-[180px] truncate">
                    <Link href={`/shops/${payment.shopId}`} className="font-medium text-sky-700 hover:underline">
                      {shopNames[payment.shopId] ?? payment.shopId}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                      {payment.method === "bkash_online" ? "bKash (online)" : payment.method === "bkash_manual" ? "bKash" : payment.method === "nagad_manual" ? "Nagad" : payment.method}
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
                        onClick={() => void review(payment._id, "approve")}
                        disabled={processing === payment._id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => void review(payment._id, "reject")}
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

      {notice && (
        <div className="mt-8 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          {notice}
        </div>
      )}

      {/* Reviewed payments, with refunds */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Payment history</span>
          <span className="text-xs text-slate-400">· approved, rejected and refunded</span>
        </div>
        <PaymentsTable payments={history} role={role} shopNames={shopNames} onRefund={setRefunding} />
      </div>

      {refunding && (
        <RefundDialog
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            setNotice("Refund recorded.");
            setTimeout(() => setNotice(""), 4000);
            void loadHistory();
          }}
        />
      )}
    </div>
  );
}
