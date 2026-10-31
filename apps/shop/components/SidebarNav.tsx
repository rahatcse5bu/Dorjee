"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Languages,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Scissors,
  Settings2,
  UserCog,
  Users,
} from "lucide-react";
import { clearShopAuth, getShopUser } from "../lib/auth";
import { TranslationKey, useI18n } from "../lib/i18n";
import { PermissionModule, usePermissions } from "../lib/permissions";

interface NavItem {
  href: string;
  label: TranslationKey;
  icon: LucideIcon;
  /** Module the user needs view access to; everyone sees the link when omitted. */
  module?: PermissionModule;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "nav.orders", icon: ClipboardList, module: "orders" },
  { href: "/customers", label: "nav.customers", icon: Users, module: "customers" },
  { href: "/staff", label: "nav.staff", icon: UserCog, module: "staff" },
];

const setupNav: NavItem[] = [
  { href: "/cloth-types", label: "nav.clothTypes", icon: Scissors, module: "catalog" },
  { href: "/settings", label: "nav.settings", icon: Settings2, module: "settings" },
  { href: "/subscription", label: "nav.subscription", icon: CreditCard, module: "subscription" },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const user = getShopUser();
  const { can } = usePermissions();

  function handleLogout() {
    clearShopAuth();
    router.push("/login");
  }

  const visible = (items: NavItem[]) => items.filter((item) => !item.module || can(item.module));
  const setupItems = visible(setupNav);

  function renderLink(item: NavItem) {
    const isActive = !!pathname && (pathname === item.href || pathname.startsWith(item.href + "/"));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? "bg-teal text-white shadow-sm" : "text-ink/70 hover:bg-ink/[0.05] hover:text-ink"
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-ink/40"}`} />
        <span className="flex-1">{t(item.label)}</span>
      </Link>
    );
  }

  const roleKey = `role.${user?.role ?? "shop_staff"}` as TranslationKey;
  const displayName = user?.name || user?.email || "";

  return (
    <aside className="flex h-full flex-col overflow-y-auto p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal font-bold text-white shadow-sm">
          D
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight text-ink">
            Dorjee <span className="text-teal">Shop</span>
          </div>
          <div className="text-[11px] font-medium text-ink/45">{t("nav.tagline")}</div>
        </div>
      </div>

      <nav className="mt-6 space-y-1">{visible(mainNav).map(renderLink)}</nav>

      {setupItems.length > 0 && (
        <>
          <p className="mb-1.5 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
            {t("nav.setup")}
          </p>
          <nav className="space-y-1">{setupItems.map(renderLink)}</nav>
        </>
      )}

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
          className="flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-white/60 px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:border-teal/30 hover:text-teal"
        >
          <Languages className="h-[18px] w-[18px] shrink-0 text-ink/40" />
          <span className="flex-1 text-left">{t("nav.language")}</span>
          <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink/50">
            {lang === "en" ? "EN" : "বাং"}
          </span>
        </button>

        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-sm font-bold text-brass">
            {(displayName[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="text-xs text-ink/50">{t(roleKey)}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={t("nav.logout")}
            aria-label={t("nav.logout")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/40 transition hover:bg-coral/10 hover:text-coral"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
