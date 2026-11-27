import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";
import {
  bkashCredentialsPresent,
  CustomerLimitSettings,
  DEFAULT_CUSTOMER_LIMITS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_PLANS,
  normalizePlanCode,
  payableFor,
  Plan,
} from "./plans";
import { PlatformSettings, PlatformSettingsDocument } from "./schemas/platform-settings.schema";

export interface EffectiveSettings extends CustomerLimitSettings {
  plans: Array<Plan & { active: boolean }>;
  trialDays: number;
  graceDays: number;
  bkashNumber: string;
  cashoutPerThousand: number;
  manualPaymentEnabled: boolean;
  bkashOnlineEnabled: boolean;
  /** bkashOnlineEnabled and the server has bKash credentials. */
  bkashOnline: boolean;
  bkashCredentials: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

// Settings change rarely; a short cache keeps them off every request without going stale for long.
const CACHE_MS = 30_000;

@Injectable()
export class PlatformSettingsService {
  private cache: { value: EffectiveSettings; at: number } | null = null;

  constructor(
    @InjectModel(PlatformSettings.name) private readonly model: Model<PlatformSettingsDocument>,
  ) {}

  /** Saved settings merged over the defaults, so a missing field or plan never breaks billing. */
  async get(): Promise<EffectiveSettings> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const saved = await this.model.findOne({ key: "platform" }).lean();
    const plans = DEFAULT_PLANS.map((plan) => {
      const override = saved?.plans?.find((p) => p.code === plan.code);
      return {
        code: plan.code as string,
        months: plan.months as number,
        priceBdt: override?.priceBdt ?? plan.priceBdt,
        active: override?.active ?? true,
      };
    });
    const bkashOnlineEnabled = saved?.bkashOnlineEnabled ?? true;
    const value: EffectiveSettings = {
      plans,
      trialDays: saved?.trialDays ?? DEFAULT_PAYMENT_SETTINGS.trialDays,
      graceDays: saved?.graceDays ?? DEFAULT_PAYMENT_SETTINGS.graceDays,
      bkashNumber: saved?.bkashNumber || DEFAULT_PAYMENT_SETTINGS.bkashNumber,
      cashoutPerThousand: saved?.cashoutPerThousand ?? DEFAULT_PAYMENT_SETTINGS.cashoutPerThousand,
      manualPaymentEnabled: saved?.manualPaymentEnabled ?? true,
      bkashOnlineEnabled,
      bkashCredentials: bkashCredentialsPresent(),
      bkashOnline: bkashOnlineEnabled && bkashCredentialsPresent(),
      customerLimit: saved?.customerLimit ?? DEFAULT_CUSTOMER_LIMITS.customerLimit,
      appCustomerLimit: saved?.appCustomerLimit ?? DEFAULT_CUSTOMER_LIMITS.appCustomerLimit,
      trialCustomerLimit: saved?.trialCustomerLimit ?? DEFAULT_CUSTOMER_LIMITS.trialCustomerLimit,
      trialAppCustomerLimit: saved?.trialAppCustomerLimit ?? DEFAULT_CUSTOMER_LIMITS.trialAppCustomerLimit,
      updatedAt: (saved as { updatedAt?: Date } | null)?.updatedAt,
      updatedBy: saved?.updatedBy,
    };
    this.cache = { value, at: Date.now() };
    return value;
  }

  async update(dto: UpdatePlatformSettingsDto, updatedBy: string) {
    const current = await this.get();
    const plans = current.plans.map((plan) => {
      const change = dto.plans?.find((p) => p.code === plan.code);
      return { code: plan.code, months: plan.months, priceBdt: change?.priceBdt ?? plan.priceBdt, active: change?.active ?? plan.active };
    });
    if (!plans.some((p) => p.active)) throw new BadRequestException("At least one plan must stay available");

    const manual = dto.manualPaymentEnabled ?? current.manualPaymentEnabled;
    const online = dto.bkashOnlineEnabled ?? current.bkashOnlineEnabled;
    if (!manual && !(online && current.bkashCredentials)) {
      throw new BadRequestException("Keep at least one way to pay turned on");
    }

    await this.model.findOneAndUpdate(
      { key: "platform" },
      {
        key: "platform",
        plans,
        trialDays: dto.trialDays ?? current.trialDays,
        graceDays: dto.graceDays ?? current.graceDays,
        bkashNumber: dto.bkashNumber ?? current.bkashNumber,
        cashoutPerThousand: dto.cashoutPerThousand ?? current.cashoutPerThousand,
        manualPaymentEnabled: manual,
        bkashOnlineEnabled: online,
        customerLimit: dto.customerLimit ?? current.customerLimit,
        appCustomerLimit: dto.appCustomerLimit ?? current.appCustomerLimit,
        trialCustomerLimit: dto.trialCustomerLimit ?? current.trialCustomerLimit,
        trialAppCustomerLimit: dto.trialAppCustomerLimit ?? current.trialAppCustomerLimit,
        updatedBy,
      },
      { upsert: true, new: true },
    );
    this.cache = null;
    return this.get();
  }

  /** Plans a shop can buy now, with the Send Money total (cash-out charge included). */
  async purchasablePlans() {
    const s = await this.get();
    return s.plans.filter((p) => p.active).map(({ active: _active, ...plan }) => ({ ...plan, ...payableFor(plan.priceBdt, s.cashoutPerThousand) }));
  }

  /** The plan to charge for a new payment; hidden plans can't be bought. */
  async planForPurchase(code: string | undefined | null): Promise<Plan> {
    const s = await this.get();
    const plan = s.plans.find((p) => p.code === normalizePlanCode(code));
    if (!plan || !plan.active) throw new BadRequestException("This plan is not available");
    return { code: plan.code, months: plan.months, priceBdt: plan.priceBdt };
  }
}
