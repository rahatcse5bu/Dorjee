"use client";

import { usePathname } from "next/navigation";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";
import { getShopToken, getShopUser } from "./auth";

/** Fired by apiRequest when the API refuses a call because the subscription ended. */
export const SUBSCRIPTION_LOCKED_EVENT = "dorjee:subscription-locked";

export interface SubscriptionAccess {
  locked: boolean;
  status: string;
  trialEndsAt: string | null;
  nextBillingDate: string | null;
}

interface AccessValue {
  loading: boolean;
  access: SubscriptionAccess | null;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessValue>({ loading: true, access: null, refresh: async () => {} });

/** Pages that stay open after the subscription ends, so the shop can pay or take its data. */
export const OPEN_WHEN_LOCKED = ["/subscription", "/backup"];

export function SubscriptionAccessProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<SubscriptionAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const shopId = getShopUser()?.shopId;
    const token = getShopToken();
    if (!shopId || !token) {
      setLoading(false);
      return;
    }
    try {
      setAccess(await apiRequest<SubscriptionAccess>(`/shops/${shopId}/subscription/access`, {}, token));
    } catch {
      // Leave the last known state; the API still refuses calls if the shop is locked.
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-check on every page change, so an approved payment unlocks without a reload.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onLocked = () => setAccess((prev) => ({ trialEndsAt: null, nextBillingDate: null, status: "expired", ...prev, locked: true }));
    window.addEventListener(SUBSCRIPTION_LOCKED_EVENT, onLocked);
    return () => window.removeEventListener(SUBSCRIPTION_LOCKED_EVENT, onLocked);
  }, []);

  return <AccessContext.Provider value={{ loading, access, refresh }}>{children}</AccessContext.Provider>;
}

export function useSubscriptionAccess() {
  return useContext(AccessContext);
}
