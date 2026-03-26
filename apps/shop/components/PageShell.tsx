"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";

const AUTH_PATHS = ["/login", "/register"];

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = !!pathname && AUTH_PATHS.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1240px] grid-cols-1 gap-5 p-4 lg:grid-cols-[280px_1fr] lg:p-6">
      <SidebarNav />
      <main className="shop-surface rounded-2xl p-5 md:p-8">{children}</main>
    </div>
  );
}
