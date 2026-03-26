"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings, CheckCircle, DollarSign, Clock, AlertTriangle } from "lucide-react";

interface LocalPlatformSettings {
  monthlyFeeBdt: number;
  trialDays: number;
  graceDays: number;
}

const SETTINGS_KEY = "dorjee_admin_platform_settings";

const fields = [
  {
    key: "monthlyFeeBdt" as const,
    label: "Monthly Fee",
    unit: "BDT",
    description: "Subscription fee charged per shop per month.",
    icon: DollarSign,
    min: 1,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    key: "trialDays" as const,
    label: "Trial Period",
    unit: "days",
    description: "Number of free trial days for new shops.",
    icon: Clock,
    min: 0,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    key: "graceDays" as const,
    label: "Grace Period",
    unit: "days",
    description: "Days before a shop is suspended after payment due.",
    icon: AlertTriangle,
    min: 0,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<LocalPlatformSettings>({
    monthlyFeeBdt: 500,
    trialDays: 7,
    graceDays: 14,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      setSettings(JSON.parse(raw) as LocalPlatformSettings);
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("Settings saved.");
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure pricing, trial duration, and payment verification policy.
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Notice */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Stored locally</p>
            <p className="text-xs text-amber-700 mt-0.5">
              These settings are saved in this browser only. Backend sync is not yet implemented.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 mb-6">
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <div
                  key={field.key}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4"
                >
                  <div className={`w-10 h-10 rounded-lg ${field.iconBg} ${field.iconColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number"
                          min={field.min}
                          value={settings[field.key]}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              [field.key]: Number(e.target.value),
                            }))
                          }
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                        />
                        <span className="text-xs text-slate-400 w-8">{field.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Save Settings
            </button>
            {message && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                {message}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
