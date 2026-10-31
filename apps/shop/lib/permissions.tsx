"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { getShopToken, getShopUser } from "./auth";

export const MODULES = ["orders", "customers", "payments", "staff", "catalog", "settings", "subscription", "reports"] as const;
export type PermissionModule = (typeof MODULES)[number];
export type PermissionLevel = "none" | "view" | "manage";
export const CONFIGURABLE_ROLES = ["manager", "shop_staff", "tailor", "accountant"] as const;
export type PermissionMatrix = Record<string, Record<PermissionModule, PermissionLevel>>;

const RANK: Record<PermissionLevel, number> = { none: 0, view: 1, manage: 2 };

interface PermissionsValue {
  loading: boolean;
  matrix: PermissionMatrix;
  can: (module: PermissionModule, level?: PermissionLevel) => boolean;
  /** Reloads after the owner edits the role matrix. */
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState<Partial<Record<PermissionModule, PermissionLevel>>>({});
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const shopId = getShopUser()?.shopId;
    const token = getShopToken();
    if (!shopId || !token) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiRequest<{ mine: Record<PermissionModule, PermissionLevel>; matrix: PermissionMatrix }>(
        `/shops/${shopId}/permissions`,
        {},
        token,
      );
      setMine(result.mine);
      setMatrix(result.matrix);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<PermissionsValue>(
    () => ({
      loading,
      matrix,
      refresh,
      can: (module, level = "view") => RANK[mine[module] ?? "none"] >= RANK[level],
    }),
    [loading, matrix, mine, refresh],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}

/** The module a page belongs to, used to block pages the user can't view. */
export function moduleForPath(pathname: string): PermissionModule | null {
  const map: Array<[string, PermissionModule]> = [
    ["/orders", "orders"],
    ["/customers", "customers"],
    ["/staff", "staff"],
    ["/measurements", "catalog"],
    ["/cloth-types", "catalog"],
    ["/settings", "settings"],
    ["/subscription", "subscription"],
    ["/reports", "reports"],
  ];
  return map.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))?.[1] ?? null;
}
