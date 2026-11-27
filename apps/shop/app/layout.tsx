import "./globals.css";
import { ReactNode } from "react";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { PageShell } from "../components/PageShell";
import { PwaSetup } from "../components/PwaSetup";
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
  applicationName: "Dorjee",
  // The shop app's manifest (public/manifest.webmanifest). It's a plain file linked
  // here, not app/manifest.ts, so the customer app's layout (app/my) can link its own.
  manifest: "/manifest.webmanifest",
  // iPhone/iPad home-screen app.
  appleWebApp: {
    capable: true,
    title: "Dorjee",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
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
            <PwaSetup />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
