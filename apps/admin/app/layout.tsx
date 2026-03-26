import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";
import { Manrope, Merriweather } from "next/font/google";

const headingFont = Merriweather({ subsets: ["latin"], weight: ["700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "Dorjee Admin",
  description: "Super admin dashboard",
};

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/shops", label: "Shops" },
  { href: "/payments", label: "Payments" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/users", label: "Admins & Users" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={bodyFont.className}>
        <div className="mx-auto grid min-h-screen max-w-[1260px] grid-cols-1 gap-5 p-4 lg:grid-cols-[300px_1fr] lg:p-6">
          <aside className="admin-surface sticky top-4 h-fit rounded-2xl p-5 lg:top-6">
            <h1 className={`${headingFont.className} text-3xl text-slate`}>Dorjee Admin</h1>
            <p className="mt-1 text-sm admin-quiet">Role-separated platform operations</p>
            <nav className="mt-6 space-y-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-slate transition hover:border-slate/15 hover:bg-[#f5f9fc]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="admin-surface fade-in-up rounded-2xl p-5 md:p-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
