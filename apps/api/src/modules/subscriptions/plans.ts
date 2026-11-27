/** The plans a shop can pay for. Codes and lengths are fixed; prices and availability come from platform settings. */
export const DEFAULT_PLANS = [
  { code: "MONTHLY", months: 1, priceBdt: 500 },
  { code: "QUARTERLY", months: 3, priceBdt: 1450 },
  { code: "HALF_YEARLY", months: 6, priceBdt: 2800 },
  { code: "YEARLY", months: 12, priceBdt: 5100 },
] as const;

export type PlanCode = (typeof DEFAULT_PLANS)[number]["code"];
export const PLAN_CODES = DEFAULT_PLANS.map((p) => p.code) as PlanCode[];

export interface Plan {
  code: string;
  months: number;
  priceBdt: number;
}

/** Defaults used until an admin saves settings. */
export const DEFAULT_PAYMENT_SETTINGS = {
  bkashNumber: process.env.BKASH_NUMBER ?? "01793278360",
  cashoutPerThousand: 18.75,
  trialDays: 7,
  graceDays: 0,
};

/**
 * How many customers a shop may keep, and how many may use the customer app.
 * 0 means no limit. Trial shops get the smaller trial limits.
 */
export const DEFAULT_CUSTOMER_LIMITS = {
  customerLimit: 1000,
  appCustomerLimit: 300,
  trialCustomerLimit: 50,
  trialAppCustomerLimit: 10,
};

export type CustomerLimitSettings = typeof DEFAULT_CUSTOMER_LIMITS;

/** Plan price plus the bKash cash-out charge for Send Money, rounded up to whole taka. */
export function payableFor(priceBdt: number, cashoutPerThousand: number) {
  const payableBdt = Math.ceil(priceBdt + (priceBdt * cashoutPerThousand) / 1000);
  return { chargeBdt: payableBdt - priceBdt, payableBdt };
}

// Subscriptions and payments created before plans existed were monthly.
const LEGACY_CODES: Record<string, PlanCode> = { MONTHLY_500_BDT: "MONTHLY" };

export function normalizePlanCode(code: string | undefined | null): PlanCode {
  const resolved = (code && LEGACY_CODES[code]) ?? code;
  return PLAN_CODES.includes(resolved as PlanCode) ? (resolved as PlanCode) : "MONTHLY";
}

/** Whether bKash checkout credentials are set on the server. */
export function bkashCredentialsPresent() {
  return Boolean(
    process.env.BKASH_USER_NAME && process.env.BKASH_PASSWORD && process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET,
  );
}

/** `date` plus whole months, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
