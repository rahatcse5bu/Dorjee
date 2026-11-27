"use client";

import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, RotateCcw, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { getAdminToken } from "../lib/auth";

export interface RefundablePayment {
  _id: string;
  method: string;
  amountBdt: number;
  payableBdt?: number;
  refundedBdt?: number;
  months?: number;
  transactionId?: string;
  senderNumber?: string;
  status: string;
}

/** What the shop actually paid: online checkout charges the plan price; Send Money includes the cash-out charge. */
export function paidAmount(p: RefundablePayment) {
  return p.method === "bkash_online" ? p.amountBdt : (p.payableBdt ?? p.amountBdt);
}

export function refundableAmount(p: RefundablePayment) {
  return Math.max(0, Math.round((paidAmount(p) - (p.refundedBdt ?? 0)) * 100) / 100);
}

/** Only finance roles may refund, and only approved payments with money left to give back. */
export function canRefund(p: RefundablePayment, role: string | undefined) {
  return ["super_admin", "admin_finance"].includes(role ?? "") && p.status === "approved" && refundableAmount(p) > 0;
}

export default function RefundDialog({
  payment,
  onClose,
  onDone,
}: {
  payment: RefundablePayment;
  onClose: () => void;
  onDone: () => void;
}) {
  const remaining = refundableAmount(payment);
  const online = payment.method === "bkash_online";
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [refundTrxId, setRefundTrxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const full = Number(amount) >= remaining;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiRequest(
        `/admin/payments/${payment._id}/refund`,
        {
          method: "POST",
          body: JSON.stringify({
            amountBdt: Number(amount),
            reason: reason.trim(),
            ...(online ? {} : { refundTrxId: refundTrxId.trim() }),
          }),
        },
        getAdminToken() ?? undefined,
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
      setBusy(false);
    }
  }

  // Portal to <body>: the page wrapper's animation transform would otherwise trap a fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Refund payment">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-800">Refund payment</p>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{payment.transactionId ?? payment._id}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {online ? (
              <>The money goes back to the payer&apos;s bKash account through bKash right away. This cannot be undone.</>
            ) : (
              <>
                This was a manual Send Money payment, so bKash can&apos;t refund it automatically. Send the money back to{" "}
                <span className="font-mono font-semibold text-slate-800">{payment.senderNumber ?? "the shop"}</span> first, then record it here.
              </>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Amount (৳{remaining.toLocaleString()} refundable)</span>
            <input
              type="number"
              min={1}
              max={remaining}
              step={0.01}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          <p className={`-mt-2 text-xs ${full ? "text-red-600" : "text-slate-400"}`}>
            {full
              ? `Full refund: the shop loses the ${payment.months ?? 1} month(s) this payment bought.`
              : "Partial refund: the shop keeps its plan."}
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Reason</span>
            <input
              required
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Paid twice by mistake"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          {!online && (
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">TrxID of the money you sent back</span>
              <input
                required
                maxLength={64}
                value={refundTrxId}
                onChange={(e) => setRefundTrxId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {online ? `Refund ৳${Number(amount || 0).toLocaleString()} via bKash` : "Record refund"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
