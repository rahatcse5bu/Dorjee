"use client";

import { useState } from "react";
import { AuthUser, getShopToken, getShopUser } from "./auth";

/**
 * The signed-in user and token. PageShell only renders pages after confirming
 * a session exists, so reading localStorage on first render is safe here.
 */
export function useSession(): { user: AuthUser | null; token: string | null; shopId: string } {
  const [session] = useState(() => {
    const user = getShopUser();
    return { user, token: getShopToken(), shopId: user?.shopId ?? "" };
  });
  return session;
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}
