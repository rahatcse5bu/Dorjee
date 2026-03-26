"use client";

import { FormEvent, useEffect, useState } from "react";

interface LocalPlatformSettings {
  monthlyFeeBdt: number;
  trialDays: number;
  graceDays: number;
}

const SETTINGS_KEY = "dorjee_admin_platform_settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<LocalPlatformSettings>({
    monthlyFeeBdt: 500,
    trialDays: 7,
    graceDays: 14,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }

    try {
      setSettings(JSON.parse(raw) as LocalPlatformSettings);
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMessage("Platform settings saved locally in this browser.");
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate">Platform Settings</h2>
      <p className="mt-1 text-sm text-slate/70">Configure pricing, trial duration, and payment verification policy.</p>

      <form className="mt-4 grid gap-3 rounded-xl border border-slate/10 bg-fog p-4 md:grid-cols-3" onSubmit={onSubmit}>
        <label className="text-sm text-slate/80">
          Monthly fee (BDT)
          <input
            className="mt-1 w-full rounded-lg border border-slate/20 bg-white px-3 py-2"
            type="number"
            min={1}
            value={settings.monthlyFeeBdt}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, monthlyFeeBdt: Number(event.target.value) }))
            }
          />
        </label>

        <label className="text-sm text-slate/80">
          Trial days
          <input
            className="mt-1 w-full rounded-lg border border-slate/20 bg-white px-3 py-2"
            type="number"
            min={0}
            value={settings.trialDays}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, trialDays: Number(event.target.value) }))
            }
          />
        </label>

        <label className="text-sm text-slate/80">
          Grace days
          <input
            className="mt-1 w-full rounded-lg border border-slate/20 bg-white px-3 py-2"
            type="number"
            min={0}
            value={settings.graceDays}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, graceDays: Number(event.target.value) }))
            }
          />
        </label>

        {message ? <p className="text-sm text-green-700 md:col-span-3">{message}</p> : null}

        <button className="rounded-lg bg-slate px-4 py-2 text-fog md:col-span-3" type="submit">
          Save settings
        </button>
      </form>
    </section>
  );
}
