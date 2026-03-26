"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Zap,
  ChevronDown,
  Clock,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

interface Subscription {
  planCode: string;
  amountBdt: number;
  status: string;
  trialEndsAt?: string;
  nextBillingDate?: string;
}

interface Payment {
  _id: string;
  method: "bkash_manual" | "nagad_manual";
  amountBdt: number;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const PAYMENT_STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  approved: { label: "Approved", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  pending:  { label: "Pending",  badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  rejected: { label: "Rejected", badge: "bg-red-100 text-red-700",       dot: "bg-red-500" },
};

const SUB_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: "Active",   dot: "bg-emerald-500", text: "text-emerald-600" },
  trial:    { label: "Trial",    dot: "bg-blue-500",    text: "text-blue-600" },
  expired:  { label: "Expired",  dot: "bg-red-500",     text: "text-red-600" },
  inactive: { label: "Inactive", dot: "bg-ink/30",      text: "text-ink/50" },
};

export default function SubscriptionPage() {
  const user = getShopUser();
  const token = getShopToken();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState<"bkash_manual" | "nagad_manual">("bkash_manual");
  const [transactionId, setTransactionId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    if (!user?.shopId || !token) return;
    const [subscriptionResult, paymentResult] = await Promise.all([
      apiRequest<Subscription>(`/shops/${user.shopId}/subscription`, {}, token),
      apiRequest<Payment[]>(`/shops/${user.shopId}/payments`, {}, token),
    ]);
    setSubscription(subscriptionResult);
    setPayments(paymentResult);
  }

  useEffect(() => {
    void loadData();
  }, [token, user?.shopId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user?.shopId || !token) { setError("Please login first."); return; }
    try {
      await apiRequest(`/shops/${user.shopId}/payments/manual`, {
        method: "POST",
        body: JSON.stringify({ method, transactionId, proofImageUrl: proofImageUrl || undefined }),
      }, token);
      setTransactionId("");
      setProofImageUrl("");
      setMessage("Payment submitted. Dorjee admin will verify soon.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment");
    }
  }

  const statusCfg = SUB_STATUS[subscription?.status ?? ""] ?? SUB_STATUS.inactive;

  return (
    <section className="space-y-7">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Subscription</h2>
        <p className="mt-1 text-sm shop-quiet">Manage your billing plan, submit payments, and view payment history.</p>
      </div>

      {/* Plan card */}
      <div className="rounded-2xl overflow-hidden border border-ink/10">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal to-[#0f4250] px-6 py-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Current Plan</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {subscription?.planCode ?? "Monthly 500 BDT"}
            </p>
            <p className="mt-1 text-sm text-white/65">
              ৳{subscription?.amountBdt ?? 500} / month
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
            <Zap className="h-7 w-7" />
          </div>
        </div>
        <div className="grid gap-0 bg-paper/60 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ink/8">
          <div className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-1.5">Status</p>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
              <span className={`font-semibold text-sm ${statusCfg.text}`}>{statusCfg.label}</span>
            </div>
          </div>
          {subscription?.trialEndsAt && (
            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Trial Ends
              </p>
              <p className="font-semibold text-sm text-ink">
                {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {subscription?.nextBillingDate && (
            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-1.5 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Next Billing
              </p>
              <p className="font-semibold text-sm text-ink">
                {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit payment */}
      <div className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-ink/8 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="font-semibold text-ink">Submit Payment</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Payment Method</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 pr-9 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "bkash_manual" | "nagad_manual")}
                >
                  <option value="bkash_manual">bKash</option>
                  <option value="nagad_manual">Nagad</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Transaction ID</label>
              <input
                className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                placeholder="e.g. ABC123XYZ"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Proof Image URL <span className="text-ink/30 normal-case font-normal">(optional)</span></label>
            <input
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="https://…"
              value={proofImageUrl}
              onChange={(e) => setProofImageUrl(e.target.value)}
            />
          </div>
          {message && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90"
            >
              <CreditCard className="h-4 w-4" />
              Submit Payment
            </button>
          </div>
        </form>
      </div>

      {/* Payment history */}
      <div className="rounded-2xl border border-ink/10 bg-paper/60 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-ink/8 px-5 py-4">
          <BadgeCheck className="h-4 w-4 text-ink/40" />
          <p className="text-sm font-semibold text-ink">Payment History</p>
        </div>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-ink/35">
            <CreditCard className="h-8 w-8 opacity-30" />
            <p className="text-sm">No payments submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink/8">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Txn ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {payments.map((payment) => {
                  const cfg = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending;
                  return (
                    <tr key={payment._id} className="hover:bg-white/50 transition-colors">
                      <td className="px-5 py-3.5 text-ink/60">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-ink capitalize">
                        {payment.method.replace("_manual", "")}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink">৳{payment.amountBdt}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink/50">{payment.transactionId}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
