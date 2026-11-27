"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Languages, LogOut } from "lucide-react";
import { clearCustomerAuth, getCustomerToken } from "../lib/customer-auth";
import { useI18n } from "../lib/i18n";

const PUBLIC = ["/my/login", "/my/join"];

/** The customer app's frame: its own sign-in, a slim header, and a phone-width column. */
export function CustomerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const isPublic = PUBLIC.includes(pathname);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isPublic && !getCustomerToken()) {
      router.replace("/my/login");
      return;
    }
    setReady(true);
  }, [isPublic, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />
      </div>
    );
  }

  if (isPublic) return <>{children}</>;

  function signOut() {
    clearCustomerAuth();
    router.replace("/my/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/my" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-sm font-bold text-white">D</span>
            <span className="font-bold text-ink">
              Dorjee <span className="font-medium text-ink/50">· {t("my.myOrders")}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink/60 hover:bg-ink/[0.05] hover:text-ink"
            >
              <Languages className="h-4 w-4" />
              {t("nav.language")}
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label={t("my.signOut")}
              title={t("my.signOut")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/50 hover:bg-ink/[0.05] hover:text-coral"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
