"use client";

import { usePathname } from "next/navigation";
import SidebarNav from "./SidebarNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <SidebarNav />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8 fade-in-up">{children}</div>
      </main>
    </div>
  );
}
