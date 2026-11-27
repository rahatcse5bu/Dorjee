import { ReactNode } from "react";

// The customer app installs as its own home-screen app ("My Dorjee"), opening on
// the customer's orders instead of the shop dashboard.
export const metadata = {
  title: "My Dorjee",
  description: "Track your tailoring orders and order again from your tailor.",
  manifest: "/my/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Dorjee",
    statusBarStyle: "default",
  },
};

export default function CustomerAppLayout({ children }: { children: ReactNode }) {
  return children;
}
