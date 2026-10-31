"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Lock, Menu } from "lucide-react";
import { getShopToken } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { NotificationsProvider } from "../lib/notifications";
import { moduleForPath, PermissionsProvider, usePermissions } from "../lib/permissions";
import { NotificationBell } from "./NotificationBell";
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

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <PermissionsProvider>
      {isBarePage(pathname) ? (
        <PermissionGate pathname={pathname}>{children}</PermissionGate>
      ) : (
        <NotificationsProvider>
          <AppFrame pathname={pathname} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}>
            {children}
          </AppFrame>
        </NotificationsProvider>
      )}
    </PermissionsProvider>
  );
}

/** Blocks pages whose module the user can't view. */
function PermissionGate({ pathname, children }: { pathname: string | null; children: ReactNode }) {
  const { t } = useI18n();
  const { can, loading } = usePermissions();
  const module = pathname ? moduleForPath(pathname) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />
      </div>
    );
  }
  if (module && !can(module)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">
          <Lock className="h-6 w-6" />
        </div>
        <p className="font-semibold text-ink">{t("perm.noAccess")}</p>
        <p className="text-sm text-ink/55">{t("perm.noAccessSub")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AppFrame({
  pathname,
  drawerOpen,
  setDrawerOpen,
  children,
}: {
  pathname: string | null;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-sm font-bold text-white">D</div>
          <span className="font-bold text-ink">
            Dorjee <span className="text-teal">Shop</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell className="h-10 w-10" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink/70 hover:bg-ink/5"
            aria-label={t("nav.menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-in absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-ink/10 bg-paper">
            <SidebarNav onNavigate={() => setDrawerOpen(false)} showBell={false} />
          </div>
        </div>
      )}

      {/* Desktop sidebar: a full-height rail flush with the left edge */}
      <div className="hidden lg:block lg:w-[260px] lg:shrink-0">
        <div className="sticky top-0 h-screen border-r border-ink/10 bg-white/75 backdrop-blur">
          <SidebarNav />
        </div>
      </div>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <PermissionGate pathname={pathname}>{children}</PermissionGate>
        </div>
      </main>
    </div>
  );
}
