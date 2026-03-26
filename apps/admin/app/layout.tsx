import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import AdminShell from "../components/AdminShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dorjee Admin",
  description: "Super admin dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
