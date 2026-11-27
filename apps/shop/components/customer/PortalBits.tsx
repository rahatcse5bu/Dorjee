"use client";

import { StatusBadge } from "../ui";
import { useI18n } from "../../lib/i18n";

/** Order status as a customer sees it: a draft is a request waiting for the shop. */
export function PortalStatus({ status }: { status: string }) {
  const { t } = useI18n();
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        {t("my.pending")}
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

/** Measurement values: yes/no answers read as words. */
export function measurementValue(value: string | number | boolean, t: (key: "my.yes" | "my.no") => string) {
  if (value === true) return t("my.yes");
  if (value === false) return t("my.no");
  return String(value);
}
