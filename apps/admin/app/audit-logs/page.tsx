"use client";

import { useEffect, useState } from "react";
import { ClipboardList, AlertCircle, CheckCircle, XCircle } from "lucide-react";
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
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track every payment action in the Dorjee platform.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700">{items.length}</span>
          <span className="text-slate-500">records</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Date & Time
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Shop ID
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Action
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Method
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Transaction ID
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Reviewed By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-xs">
                    {new Date(item.updatedAt).toLocaleString("en-BD", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-[100px] truncate">
                    {item.shopId}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {item.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                    ৳{item.amountBdt.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.transactionId}</td>
                  <td className="px-6 py-4 text-slate-600 text-xs">{item.reviewedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No audit records yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Payment approvals and rejections will be logged here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
