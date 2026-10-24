import "./globals.css";
import { ReactNode } from "react";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { PageShell } from "../components/PageShell";
import { ToastProvider } from "../components/Toast";
import { LanguageProvider } from "../lib/i18n";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
});

// Bengali glyphs fall through to this font, so mixed text renders cleanly.
const bengaliFont = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
});

export const metadata = {
  title: "Dorjee Shop",
  description: "Tailor shop dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#177e89",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${bengaliFont.variable}`}>
      <body>
        <LanguageProvider>
          <ToastProvider>
            <PageShell>{children}</PageShell>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
