// The customer app keeps its own session, separate from the shop staff session,
// so a shop owner can also use the customer app on the same phone.
export const CUSTOMER_TOKEN_KEY = "dorjee_customer_token";
export const CUSTOMER_KEY = "dorjee_customer";

export interface CustomerSession {
  _id: string;
  phone: string;
  name: string;
}

export interface CustomerAuthResponse {
  accessToken: string;
  customer: CustomerSession;
}

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function getCustomer(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function setCustomerAuth(result: CustomerAuthResponse) {
  window.localStorage.setItem(CUSTOMER_TOKEN_KEY, result.accessToken);
  window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(result.customer));
}

export function clearCustomerAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.localStorage.removeItem(CUSTOMER_KEY);
}
