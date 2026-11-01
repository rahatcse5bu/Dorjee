"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, LucideIcon, Menu, Plus, Users } from "lucide-react";
import { TranslationKey, useI18n } from "../lib/i18n";
import { PermissionModule, usePermissions } from "../lib/permissions";

/** Fired when "New order" is tapped while already on the orders page. */
export const NEW_ORDER_EVENT = "dorjee:new-order";

interface Tab {
  href: string;
  label: TranslationKey;
  icon: LucideIcon;
  module?: PermissionModule;
}

const LEFT: Tab[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "nav.orders", icon: ClipboardList, module: "orders" },
];
const RIGHT: Tab[] = [{ href: "/customers", label: "nav.customers", icon: Users, module: "customers" }];

/** Phone-only tab bar: main sections, a raised New order button, and More for the full menu. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = usePermissions();
  const canCreate = can("orders", "manage");

  const isActive = (href: string) => !!pathname && (pathname === href || pathname.startsWith(href + "/"));

  function newOrder() {
    if (pathname === "/orders") window.dispatchEvent(new Event(NEW_ORDER_EVENT));
    else router.push("/orders?new=1");
  }

  const renderTab = (tab: Tab) => {
    if (tab.module && !can(tab.module)) return null;
    const active = isActive(tab.href);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
          active ? "text-teal" : "text-ink/55 active:text-ink"
        }`}
      >
        <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-teal/10" : ""}`}>
          <tab.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="max-w-full truncate px-1">{t(tab.label)}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t("nav.menu")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-1">
        {LEFT.map(renderTab)}
        {canCreate && (
          <div className="flex flex-1 items-start justify-center">
            <button
              type="button"
              onClick={newOrder}
              aria-label={t("orders.new")}
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal text-white shadow-[0_10px_24px_-8px_rgba(23,126,137,0.8)] ring-4 ring-paper transition active:scale-95"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        )}
        {RIGHT.map(renderTab)}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-ink/55 active:text-ink"
        >
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <Menu className="h-5 w-5" />
          </span>
          {t("nav.more")}
        </button>
      </div>
    </nav>
  );
}
