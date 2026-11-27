"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "./api";

/** Free trial length from the platform settings (admin app); 7 until it loads. */
export function useTrialDays() {
  const [days, setDays] = useState(7);
  useEffect(() => {
    fetch(`${API_BASE}/subscription-plans/payment-info`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((info: { trialDays?: number } | null) => {
        if (typeof info?.trialDays === "number") setDays(info.trialDays);
      })
      .catch(() => {});
  }, []);
  return days;
}
