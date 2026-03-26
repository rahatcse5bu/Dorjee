"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Ruler,
  Scissors,
  Settings2,
  CreditCard,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/measurements", label: "Measurements", icon: Ruler },
  { href: "/cloth-types", label: "Cloth Types", icon: Scissors },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("dorjee_shop_token");
    localStorage.removeItem("dorjee_shop_user");
    router.push("/login");
  }

  return (
    <aside className="shop-surface sticky top-4 h-fit rounded-2xl p-5 lg:top-6">
      {/* Brand */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal font-bold text-white shadow-sm">
            D
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-ink">
              Dorjee <span className="text-teal">Shop</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Tailor Management
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed shop-quiet">
          Tailoring operations made fast, clear, and organized
        </p>
      </div>

      <div className="mb-3 h-px bg-ink/10" />

      {/* Nav */}
      <nav className="space-y-0.5">
        {nav.map((item) => {
          const isActive =
            !!pathname &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "border-teal/25 bg-teal/10 text-teal"
                  : "border-transparent text-ink/65 hover:border-ink/10 hover:bg-[#f5efe3] hover:text-ink"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? "text-teal" : "text-ink/35"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-teal/70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-ink/10 pt-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-ink/45 transition-all duration-150 hover:border-coral/20 hover:bg-coral/5 hover:text-coral"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
