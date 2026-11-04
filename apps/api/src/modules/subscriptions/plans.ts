/** The plans a shop can pay for. Longer plans cost less per month. */
export const SUBSCRIPTION_PLANS = [
  { code: "MONTHLY", months: 1, priceBdt: 500 },
  { code: "QUARTERLY", months: 3, priceBdt: 1450 },
  { code: "HALF_YEARLY", months: 6, priceBdt: 2800 },
  { code: "YEARLY", months: 12, priceBdt: 5100 },
] as const;

/**
 * Where shops send money: bKash "Send Money" to a personal account. Cashing that
 * out costs 18.75 tk per 1,000, so the shop adds it on top of the plan price.
 */
export const PAYMENT_INFO = {
  method: "bkash_manual",
  bkashNumber: process.env.BKASH_NUMBER ?? "01793278360",
  accountType: "personal",
  cashoutPerThousand: 18.75,
} as const;

/** The plan price plus the cash-out charge, rounded up to whole taka. */
export function payableFor(priceBdt: number) {
  const payableBdt = Math.ceil(priceBdt + (priceBdt * PAYMENT_INFO.cashoutPerThousand) / 1000);
  return { chargeBdt: payableBdt - priceBdt, payableBdt };
}

export type PlanCode = (typeof SUBSCRIPTION_PLANS)[number]["code"];
export type Plan = (typeof SUBSCRIPTION_PLANS)[number];

export const PLAN_CODES = SUBSCRIPTION_PLANS.map((p) => p.code);

// Subscriptions and payments created before plans existed were monthly.
const LEGACY_CODES: Record<string, PlanCode> = { MONTHLY_500_BDT: "MONTHLY" };

export function findPlan(code: string | undefined | null): Plan {
  const resolved = (code && LEGACY_CODES[code]) ?? code;
  return SUBSCRIPTION_PLANS.find((p) => p.code === resolved) ?? SUBSCRIPTION_PLANS[0];
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
