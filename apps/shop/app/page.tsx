"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  Languages,
  PackageCheck,
  Printer,
  Ruler,
  Scissors,
  Users,
} from "lucide-react";
import { btnPrimary, btnSecondary } from "../components/ui";
import { getShopToken } from "../lib/auth";
import { TranslationKey, useI18n } from "../lib/i18n";

const FEATURES: Array<{ icon: typeof Ruler; title: TranslationKey; body: TranslationKey }> = [
  { icon: Ruler, title: "home.f1.title", body: "home.f1.body" },
  { icon: Banknote, title: "home.f2.title", body: "home.f2.body" },
  { icon: Printer, title: "home.f3.title", body: "home.f3.body" },
  { icon: CalendarClock, title: "home.f4.title", body: "home.f4.body" },
  { icon: Users, title: "home.f5.title", body: "home.f5.body" },
  { icon: Languages, title: "home.f6.title", body: "home.f6.body" },
];

const STEPS: Array<{ title: TranslationKey; body: TranslationKey }> = [
  { title: "home.s1.title", body: "home.s1.body" },
  { title: "home.s2.title", body: "home.s2.body" },
  { title: "home.s3.title", body: "home.s3.body" },
];

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal font-bold text-white shadow-sm">D</span>
      <span className="text-lg font-bold text-ink">
        Dorjee <span className="text-teal">Shop</span>
      </span>
    </span>
  );
}

/** A static product preview: an order card as it appears in the app. */
function ProductPreview() {
  const { t, money, num, lang } = useI18n();
  const labels = lang === "bn" ? ["বুক", "কোমর", "লম্বা", "কাঁধ"] : ["Chest", "Waist", "Length", "Shoulder"];
  const measurements = labels.map((label, i): [string, number] => [label, [40, 34, 30, 18][i]]);
  return (
    <div className="relative mx-auto mb-10 w-full max-w-md">
      <div className="absolute -right-4 -top-4 h-full w-full rotate-3 rounded-3xl bg-teal/15" aria-hidden />
      <div className="relative rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(22,32,50,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-bold text-ink">#0042</p>
            <p className="text-sm text-ink/55">
              {t("home.previewCustomer")}: <span className="font-medium text-ink">Rafiq Hasan</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t("status.in_tailoring")}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-paper p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Scissors className="h-4 w-4 text-teal" /> {lang === "bn" ? "পাঞ্জাবি" : "Panjabi"} × {num(2)}
            </p>
            <p className="font-semibold text-ink">{money(3200)}</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {measurements.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white px-2 py-1.5">
                <p className="text-[10px] text-ink/50">{label}</p>
                <p className="text-sm font-semibold text-ink">{num(value)}</p>
              </div>
            ))}
          </div>
        </div>

        <dl className="mt-5 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink/60">
            <dt>{t("orderForm.payable")}</dt>
            <dd>{money(3200)}</dd>
          </div>
          <div className="flex justify-between text-emerald-700">
            <dt>{t("orders.paid")} · {t("method.bkash")}</dt>
            <dd>{money(1500)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
            <dt className="text-ink">{t("orderForm.due")}</dt>
            <dd className="text-coral">{money(1700)}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/55">
          <CalendarClock className="h-3.5 w-3.5" />
          {t("home.previewDelivery")}: {t("common.tomorrow")}
        </p>
      </div>

      <div className="absolute -bottom-12 -left-4 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-lg sm:-left-10">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <PackageCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">#0039 · {t("status.ready")}</p>
          <p className="text-xs text-ink/50">{t("dash.readyPickup")}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, lang, setLang, money } = useI18n();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => setSignedIn(!!getShopToken()), []);

  const primaryCta = signedIn ? (
    <Link href="/dashboard" className={`${btnPrimary} px-6 py-3 text-base`}>
      {t("home.goDashboard")}
      <ArrowRight className="h-4 w-4" />
    </Link>
  ) : (
    <Link href="/register" className={`${btnPrimary} px-6 py-3 text-base`}>
      {t("home.startTrial")}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Dorjee">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink/65 hover:text-ink md:inline">
              {t("home.navFeatures")}
            </a>
            <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink/65 hover:text-ink md:inline">
              {t("home.navPricing")}
            </a>
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink/65 hover:text-teal"
            >
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.language")}</span>
            </button>
            {signedIn ? (
              <Link href="/dashboard" className={btnPrimary}>
                {t("home.goDashboard")}
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/80 hover:text-teal">
                  {t("home.login")}
                </Link>
                <Link href="/register" className={`${btnPrimary} hidden sm:inline-flex`}>
                  {t("home.startTrial")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/[0.07] px-3 py-1 text-xs font-semibold text-teal">
              <Scissors className="h-3.5 w-3.5" />
              {t("home.badge")}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] text-ink sm:text-5xl lg:text-[3.4rem]">{t("home.title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/65">{t("home.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primaryCta}
              {!signedIn && (
                <Link href="/login" className={`${btnSecondary} px-6 py-3 text-base`}>
                  {t("home.login")}
                </Link>
              )}
            </div>
            {!signedIn && <p className="mt-4 text-sm text-ink/50">{t("home.trialNote")}</p>}
          </div>
          <ProductPreview />
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-ink/[0.06] bg-white/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-ink sm:text-4xl">{t("home.featuresTitle")}</h2>
              <p className="mt-3 text-lg text-ink/60">{t("home.featuresSub")}</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-ink/[0.08] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{t(body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">{t("home.stepsTitle")}</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} className="relative rounded-2xl border border-ink/[0.08] bg-white/70 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{t(title)}</h3>
                <p className="mt-1.5 text-sm text-ink/60">{t(body)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold text-ink sm:text-4xl">{t("home.pricingTitle")}</h2>
            <p className="mt-3 text-lg text-ink/60">{t("home.pricingSub")}</p>
          </div>
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-teal/20 bg-white p-8 text-center shadow-[0_30px_60px_-35px_rgba(23,126,137,0.6)]">
            <p className="text-5xl font-bold text-ink">{money(500)}</p>
            <p className="mt-1 text-sm text-ink/55">{t("home.perMonth")}</p>
            <ul className="mt-6 space-y-3 text-left">
              {(["home.p1", "home.p2", "home.p3", "home.p4"] as TranslationKey[]).map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm text-ink/80">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-center">{primaryCta}</div>
            {!signedIn && <p className="mt-3 text-xs text-ink/50">{t("home.trialNote")}</p>}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-br from-[#0f4250] via-teal to-[#1d8f93] p-8 text-white sm:flex-row sm:items-center sm:p-12">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{t("home.ctaTitle")}</h2>
              <p className="mt-2 text-white/75">{t("home.ctaBody")}</p>
            </div>
            <Link
              href={signedIn ? "/dashboard" : "/register"}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal shadow-sm transition hover:bg-white/90"
            >
              {signedIn ? t("home.goDashboard") : t("home.startTrial")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-ink/50 sm:px-6">
          <Logo />
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
