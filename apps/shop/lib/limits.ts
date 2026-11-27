export interface LimitUsage {
  used: number;
  /** 0 means no limit. */
  limit: number;
  source: "shop" | "platform";
}

export interface CustomerUsage {
  trial: boolean;
  customers: LimitUsage;
  appCustomers: LimitUsage;
}

export const isFull = (u: Pick<LimitUsage, "used" | "limit">) => u.limit > 0 && u.used >= u.limit;
export const isNearlyFull = (u: Pick<LimitUsage, "used" | "limit">) => u.limit > 0 && u.used >= u.limit * 0.9;
