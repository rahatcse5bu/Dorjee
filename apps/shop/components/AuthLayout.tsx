"use client";

import { ReactNode } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "../lib/i18n";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "bn" : "en")}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/70 px-3 py-2 text-sm font-medium text-ink/70 hover:text-teal"
      >
        <Languages className="h-4 w-4" />
        {t("nav.language")}
      </button>
      <div className="w-full max-w-md space-y-7">
        <div className="text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-[#0f4250] text-2xl font-bold text-white shadow-lg">
            D
          </div>
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm shop-quiet">{subtitle}</p>
        </div>
        <section className="shop-surface rounded-2xl p-6 sm:p-8">{children}</section>
        <p className="text-center text-sm text-ink/60">{footer}</p>
      </div>
    </div>
  );
}
