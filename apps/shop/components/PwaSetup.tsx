"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";

// Chrome/Edge/Android fire this before showing their own install UI.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The shop app and the customer app (/my) install separately, so each remembers its own "Not now".
const DISMISS_KEY = "dorjee_pwa_dismissed_at";
const CUSTOMER_DISMISS_KEY = "dorjee_my_pwa_dismissed_at";

const isCustomerPath = (pathname: string | null) => !!pathname && (pathname === "/my" || pathname.startsWith("/my/"));
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(key: string) {
  const at = Number(localStorage.getItem(key) || 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/** Registers the service worker and offers "Install app" where the browser allows it. */
export function PwaSetup() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const customerApp = isCustomerPath(pathname);
  const dismissKey = customerApp ? CUSTOMER_DISMISS_KEY : DISMISS_KEY;

  useEffect(() => {
    // Only in production builds: in dev, a service worker would cache hot-reloaded chunks.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* the app works without it */
      });
    }

    if (isStandalone() || recentlyDismissed(dismissKey)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone/iPad Safari has no install prompt; explain the manual step instead.
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // Moving between the shop app and the customer app switches which app is offered.
  }, [dismissKey]);

  const dismiss = () => {
    localStorage.setItem(dismissKey, String(Date.now()));
    setInstallEvent(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "dismissed") dismiss();
    else setInstallEvent(null);
  };

  if (pathname?.endsWith("/print")) return null;
  if (!installEvent && !showIosHint) return null;

  return (
    <div
      role="dialog"
      aria-label={t("pwa.title")}
      className={`fixed inset-x-3 ${customerApp ? "bottom-[calc(1rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"} z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-ink/10 sm:left-auto sm:right-6 sm:mx-0 lg:bottom-6`}
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t(customerApp ? "pwa.myTitle" : "pwa.title")}</p>
          {installEvent ? (
            <p className="mt-0.5 text-sm text-ink/70">{t(customerApp ? "pwa.myBody" : "pwa.body")}</p>
          ) : (
            <p className="mt-0.5 text-sm text-ink/70">
              {t("pwa.iosHint")} <Share className="mb-0.5 inline h-4 w-4" aria-label="Share" />{" "}
              {t("pwa.iosHint2")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("pwa.later")}
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {installEvent && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={dismiss} className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5">
            {t("pwa.later")}
          </button>
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            {t("pwa.install")}
          </button>
        </div>
      )}
    </div>
  );
}
