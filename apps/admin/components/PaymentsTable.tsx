"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { canRefund, paidAmount, RefundablePayment } from "./RefundDialog";

export interface AdminPayment extends RefundablePayment {
  shopId: string;
  createdAt: string;
  updatedAt?: string;
  reviewNote?: string;
  refunds?: Array<{ amountBdt: number; refundTrxId?: string; reason?: string; at: string; via: string }>;
}

const STATUS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-600",
  refunded: "bg-violet-100 text-violet-700",
};

export function methodLabel(method: string) {
  return method === "bkash_online" ? "bKash (online)" : method === "bkash_manual" ? "bKash (manual)" : method === "nagad_manual" ? "Nagad" : method;
}

export function planLabel(months = 1) {
  return months === 12 ? "1 year" : months === 1 ? "1 month" : `${months} months`;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });

/** Reviewed payments with refund actions. `shopNames` turns shop IDs into links; leave it out on a shop's own page. */
export default function PaymentsTable({
  payments,
  role,
  shopNames,
  onRefund,
}: {
  payments: AdminPayment[];
  role?: string;
  shopNames?: Record<string, string>;
  onRefund: (payment: AdminPayment) => void;
}) {
  const th = "px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={th}>Date</th>
            {shopNames && <th className={th}>Shop</th>}
            <th className={th}>Method</th>
            <th className={th}>Plan</th>
            <th className={th}>Paid</th>
            <th className={th}>Transaction ID</th>
            <th className={th}>Status</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr key={p._id} className="hover:bg-slate-50 transition-colors align-top">
              <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">{fmtDate(p.createdAt)}</td>
              {shopNames && (
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <Link href={`/shops/${p.shopId}`} className="font-medium text-sky-700 hover:underline">
                    {shopNames[p.shopId] ?? p.shopId.slice(-6)}
                  </Link>
                </td>
              )}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="text-slate-700">{methodLabel(p.method)}</span>
                {p.senderNumber && <span className="block font-mono text-xs text-slate-400">{p.senderNumber}</span>}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{planLabel(p.months)}</td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="font-semibold text-slate-800">৳{paidAmount(p).toLocaleString()}</span>
                {!!p.refundedBdt && <span className="block text-xs font-medium text-violet-700">−৳{p.refundedBdt.toLocaleString()} refunded</span>}
              </td>
              <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                {p.transactionId ?? "—"}
                {p.refunds?.map((r, i) => (
                  <span key={i} className="block text-violet-600" title={r.reason}>
                    ↩ {r.refundTrxId ?? "refund"} · {fmtDate(r.at)}
                  </span>
                ))}
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {p.refundedBdt && p.status === "approved" ? "Partly refunded" : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                {canRefund(p, role) && (
                  <button
                    type="button"
                    onClick={() => onRefund(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payments.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No payments yet.</p>}
    </div>
  );
}
