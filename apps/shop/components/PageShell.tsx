"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { getShopToken } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { SidebarNav } from "./SidebarNav";

// Pages anyone can open without signing in.
const PUBLIC_PATHS = ["/", "/login", "/register"];

function isBarePage(pathname: string | null) {
  if (!pathname) return false;
  // Printable memos render without the app chrome.
  return PUBLIC_PATHS.includes(pathname) || pathname.endsWith("/print");
}

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isPublicPage = !!pathname && PUBLIC_PATHS.includes(pathname);

  // Signed-out visitors are sent to login; pages render only after this check
  // so they can read the session from localStorage safely.
  useEffect(() => {
    if (!isPublicPage && !getShopToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [isPublicPage, router]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />
      </div>
    );
  }

  if (isBarePage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1320px] lg:grid lg:grid-cols-[264px_1fr] lg:gap-6 lg:p-6">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-sm font-bold text-white">D</div>
          <span className="font-bold text-ink">
            Dorjee <span className="text-teal">Shop</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink/70 hover:bg-ink/5"
          aria-label={t("nav.menu")}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-in absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto bg-paper p-3">
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <div className="sticky top-6">
          <SidebarNav />
        </div>
      </div>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-2 lg:py-2">{children}</main>
    </div>
  );
}
