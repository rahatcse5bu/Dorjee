import "./globals.css";
import { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PageShell } from "../components/PageShell";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Dorjee Shop",
  description: "Tailor shop dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={bodyFont.className}>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
