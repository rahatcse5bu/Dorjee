export const SHOP_TOKEN_KEY = "dorjee_shop_token";
export const SHOP_USER_KEY = "dorjee_shop_user";

export interface AuthUser {
  sub: string;
  role: string;
  shopId?: string;
}

export function getShopToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(SHOP_TOKEN_KEY);
}

export function getShopUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SHOP_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setShopAuth(accessToken: string, user: AuthUser): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SHOP_TOKEN_KEY, accessToken);
  window.localStorage.setItem(SHOP_USER_KEY, JSON.stringify(user));
}

export function clearShopAuth(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SHOP_TOKEN_KEY);
  window.localStorage.removeItem(SHOP_USER_KEY);
}
