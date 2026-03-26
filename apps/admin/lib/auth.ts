export const ADMIN_TOKEN_KEY = "dorjee_admin_token";
export const ADMIN_USER_KEY = "dorjee_admin_user";

export interface AdminUser {
  sub: string;
  role: string;
  shopId?: string;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setAdminAuth(accessToken: string, user: AdminUser): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function clearAdminAuth(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_USER_KEY);
}
