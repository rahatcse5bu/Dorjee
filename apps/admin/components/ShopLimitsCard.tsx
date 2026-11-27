"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle, Gauge, Loader2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { getAdminToken } from "../lib/auth";

export interface LimitUsage {
  used: number;
  /** 0 means no limit. */
  limit: number;
  source: "shop" | "platform";
}

export interface CustomerUsage {
  trial: boolean;
  customers: LimitUsage;
  appCustomers: LimitUsage;
}

type Key = "customers" | "appCustomers";
const ROWS: Array<{ key: Key; field: "customerLimit" | "appCustomerLimit"; label: string }> = [
  { key: "customers", field: "customerLimit", label: "Customers" },
  { key: "appCustomers", field: "appCustomerLimit", label: "Customer-app users" },
];

function Meter({ used, limit }: { used: number; limit: number }) {
  if (limit <= 0) return <div className="mt-1.5 h-1.5 rounded-full bg-slate-100" />;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = used >= limit ? "bg-red-500" : used >= limit * 0.9 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A shop's customer usage against its limits, with per-shop overrides for finance admins. */
export default function ShopLimitsCard({
  shopId,
  usage,
  canEdit,
  onSaved,
}: {
  shopId: string;
  usage: CustomerUsage;
  canEdit: boolean;
  onSaved: (usage: CustomerUsage) => void;
}) {
  // "" = use the platform setting; a number = this shop's own limit (0 = none).
  const initial = (u: LimitUsage) => (u.source === "shop" ? String(u.limit) : "");
  const [values, setValues] = useState<Record<Key, string>>({
    customers: initial(usage.customers),
    appCustomers: initial(usage.appCustomers),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty = ROWS.some(({ key }) => values[key] !== initial(usage[key]));

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = Object.fromEntries(
        ROWS.map(({ key, field }) => [field, values[key].trim() === "" ? null : Math.max(0, Math.round(Number(values[key])))]),
      );
      const result = await apiRequest<CustomerUsage>(
        `/admin/shops/${shopId}/limits`,
        { method: "PUT", body: JSON.stringify(body) },
        getAdminToken() ?? undefined,
      );
      onSaved(result);
      setValues({ customers: initial(result.customers), appCustomers: initial(result.appCustomers) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save limits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Gauge className="w-4 h-4 text-slate-400" />
          Customer limits
        </p>
        {usage.trial && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Trial limits</span>}
      </div>
      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
        {ROWS.map(({ key, label }) => {
          const u = usage[key];
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className={`text-sm font-semibold ${u.limit > 0 && u.used >= u.limit ? "text-red-600" : "text-slate-800"}`}>
                  {u.used.toLocaleString()} / {u.limit > 0 ? u.limit.toLocaleString() : "∞"}
                </p>
              </div>
              <Meter used={u.used} limit={u.limit} />
              <p className="mt-1.5 text-xs text-slate-400">{u.source === "shop" ? "Custom limit for this shop" : "Platform setting"}</p>
              {canEdit && (
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  This shop:
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={values[key]}
                    placeholder="Platform"
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-right text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    aria-label={`${label} limit for this shop`}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save limits
          </button>
          <p className="text-xs text-slate-400">Empty uses the platform setting. 0 means no limit.</p>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
