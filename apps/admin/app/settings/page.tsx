"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Clock, CreditCard, Loader2, Settings, Smartphone, Tag } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken, getAdminUser } from "../../lib/auth";

interface PlanSetting {
  code: string;
  months: number;
  priceBdt: number;
  active: boolean;
}

interface PlatformSettings {
  plans: PlanSetting[];
  trialDays: number;
  graceDays: number;
  bkashNumber: string;
  cashoutPerThousand: number;
  manualPaymentEnabled: boolean;
  bkashOnlineEnabled: boolean;
  bkashCredentials: boolean;
  updatedAt?: string;
}

const PLAN_NAMES: Record<string, string> = {
  MONTHLY: "1 month",
  QUARTERLY: "3 months",
  HALF_YEARLY: "6 months",
  YEARLY: "1 year",
};

const inputClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition disabled:opacity-60";

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-sky-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Tag; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  // Only these roles may change settings; support staff can view them.
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    setCanEdit(["super_admin", "admin_finance"].includes(getAdminUser()?.role ?? ""));
    apiRequest<PlatformSettings>("/admin/settings", {}, getAdminToken() ?? undefined)
      .then(setSettings)
      .catch((err: Error) => setLoadError(err.message || "Could not load settings"));
  }, []);

  function set<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setPlan(code: string, change: Partial<PlanSetting>) {
    setSettings((prev) => (prev ? { ...prev, plans: prev.plans.map((p) => (p.code === code ? { ...p, ...change } : p)) } : prev));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError("");
    setSaving(true);
    try {
      const saved = await apiRequest<PlatformSettings>(
        "/admin/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            plans: settings.plans.map(({ code, priceBdt, active }) => ({ code, priceBdt: Math.round(priceBdt), active })),
            trialDays: settings.trialDays,
            graceDays: settings.graceDays,
            bkashNumber: settings.bkashNumber.trim(),
            cashoutPerThousand: settings.cashoutPerThousand,
            manualPaymentEnabled: settings.manualPaymentEnabled,
            bkashOnlineEnabled: settings.bkashOnlineEnabled,
          }),
        },
        getAdminToken() ?? undefined,
      );
      setSettings(saved);
      setMessage("Settings saved. Shops see the new values within a minute.");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError((err as Error).message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  const monthly = settings?.plans.find((p) => p.months === 1)?.priceBdt ?? 0;
  const locked = !canEdit || saving;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Plan prices, trial and grace periods, and how shops pay. Changes apply to every shop.</p>
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 max-w-3xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {loadError}
        </div>
      )}

      {!settings && !loadError && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
        </div>
      )}

      {settings && (
        <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
          {!canEdit && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              Only super admins and finance admins can change settings.
            </div>
          )}

          <Section icon={Tag} title="Subscription plans" description="Prices shops pay. Turning a plan off hides it from new purchases; shops already on it keep it.">
            {settings.plans.map((plan) => {
              const saving = monthly * plan.months - plan.priceBdt;
              return (
                <Row
                  key={plan.code}
                  label={PLAN_NAMES[plan.code] ?? plan.code}
                  hint={
                    plan.months > 1
                      ? `৳${Math.round(plan.priceBdt / plan.months)} / month${saving > 0 ? ` · saves ৳${saving} vs monthly` : ""}`
                      : "Base monthly price"
                  }
                >
                  <span className="text-xs text-slate-400">৳</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={plan.priceBdt}
                    disabled={locked}
                    onChange={(e) => setPlan(plan.code, { priceBdt: Number(e.target.value) })}
                    className={`${inputClass} w-28`}
                    aria-label={`${PLAN_NAMES[plan.code]} price`}
                  />
                  <Toggle label={`${PLAN_NAMES[plan.code]} available`} checked={plan.active} disabled={locked} onChange={(v) => setPlan(plan.code, { active: v })} />
                </Row>
              );
            })}
          </Section>

          <Section icon={Clock} title="Trial & grace" description="How long new shops try Dorjee free, and how long a paid shop keeps working after its billing date.">
            <Row label="Free trial" hint="Applies to shops that register from now on.">
              <input type="number" min={0} max={365} required value={settings.trialDays} disabled={locked} onChange={(e) => set("trialDays", Number(e.target.value))} className={`${inputClass} w-24`} aria-label="Trial days" />
              <span className="text-xs text-slate-400 w-8">days</span>
            </Row>
            <Row label="Grace period" hint="0 locks a shop as soon as its billing date passes.">
              <input type="number" min={0} max={90} required value={settings.graceDays} disabled={locked} onChange={(e) => set("graceDays", Number(e.target.value))} className={`${inputClass} w-24`} aria-label="Grace days" />
              <span className="text-xs text-slate-400 w-8">days</span>
            </Row>
          </Section>

          <Section icon={CreditCard} title="Payment methods" description="At least one must stay on.">
            <Row
              label="bKash online checkout"
              hint={
                settings.bkashCredentials
                  ? "Shops pay on bKash's page; the plan activates instantly."
                  : "bKash credentials are not set on the API server (BKASH_* env vars), so this stays off for shops."
              }
            >
              {!settings.bkashCredentials && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Not configured</span>
              )}
              <Toggle label="bKash online checkout" checked={settings.bkashOnlineEnabled} disabled={locked} onChange={(v) => set("bkashOnlineEnabled", v)} />
            </Row>
            <Row label="Manual bKash Send Money" hint="Shops send money and submit the TrxID; you approve it under Payments.">
              <Toggle label="Manual bKash payments" checked={settings.manualPaymentEnabled} disabled={locked} onChange={(v) => set("manualPaymentEnabled", v)} />
            </Row>
            <Row label="Send Money number" hint="Personal bKash number shown to shops.">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                pattern="^01[3-9][0-9]{8}$"
                value={settings.bkashNumber}
                disabled={locked}
                onChange={(e) => set("bkashNumber", e.target.value)}
                className={`${inputClass} w-40 font-mono`}
                aria-label="bKash number"
              />
            </Row>
            <Row label="Cash-out charge" hint="Added to manual payments so you receive the full plan price.">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                required
                value={settings.cashoutPerThousand}
                disabled={locked}
                onChange={(e) => set("cashoutPerThousand", Number(e.target.value))}
                className={`${inputClass} w-24`}
                aria-label="Cash-out charge per 1000"
              />
              <span className="text-xs text-slate-400">tk / 1,000</span>
            </Row>
          </Section>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                Save Settings
              </button>
            )}
            {message && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                {message}
              </div>
            )}
            {settings.updatedAt && !message && (
              <p className="text-xs text-slate-400">Last saved {new Date(settings.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
