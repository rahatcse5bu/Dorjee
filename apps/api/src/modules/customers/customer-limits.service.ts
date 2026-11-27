import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { Shop, ShopDocument } from "../shops/schemas/shop.schema";
import { PlatformSettingsService } from "../subscriptions/platform-settings.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { Customer, CustomerDocument } from "./schemas/customer.schema";

export interface LimitUsage {
  used: number;
  /** 0 means no limit. */
  limit: number;
  /** Where the limit comes from: an admin override for this shop, or the platform setting. */
  source: "shop" | "platform";
}

export interface CustomerUsage {
  trial: boolean;
  customers: LimitUsage;
  appCustomers: LimitUsage;
}

const isFull = (u: LimitUsage, adding = 1) => u.limit > 0 && u.used + adding > u.limit;

/**
 * Per-shop caps on customer records and on customers connected to the customer
 * app. The platform settings set them (smaller during the trial); an admin can
 * override either for one shop.
 */
@Injectable()
export class CustomerLimitsService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    private readonly settings: PlatformSettingsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async usage(shopId: string): Promise<CustomerUsage> {
    const [settings, access, shop, customers, appCustomers] = await Promise.all([
      this.settings.get(),
      this.subscriptions.getAccess(shopId),
      isValidObjectId(shopId) ? this.shopModel.findById(shopId).select("customerLimitOverride appCustomerLimitOverride").lean() : null,
      this.customerModel.countDocuments({ shopId }),
      this.customerModel.countDocuments({ shopId, accountId: { $nin: [null, ""] } }),
    ]);
    const trial = access.status === "trial";
    const pick = (override: number | null | undefined, paid: number, trialValue: number): Omit<LimitUsage, "used"> =>
      override !== null && override !== undefined
        ? { limit: override, source: "shop" }
        : { limit: trial ? trialValue : paid, source: "platform" };
    return {
      trial,
      customers: { used: customers, ...pick(shop?.customerLimitOverride, settings.customerLimit, settings.trialCustomerLimit) },
      appCustomers: {
        used: appCustomers,
        ...pick(shop?.appCustomerLimitOverride, settings.appCustomerLimit, settings.trialAppCustomerLimit),
      },
    };
  }

  /** Throws when adding `count` more customers would go over the shop's limit. */
  async assertCanAddCustomers(shopId: string, count = 1, options: { replacingAll?: boolean } = {}) {
    if (count <= 0) return;
    const usage = await this.usage(shopId);
    const trial = usage.trial;
    // A full restore removes the current customers first, so only the incoming ones count.
    const customers = options.replacingAll ? { ...usage.customers, used: 0 } : usage.customers;
    if (!isFull(customers, count)) return;
    const room = Math.max(customers.limit - customers.used, 0);
    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code: "CUSTOMER_LIMIT",
        limit: customers.limit,
        used: customers.used,
        message:
          count === 1
            ? `Your shop has reached its limit of ${customers.limit} customers${trial ? " for the free trial" : ""}. Contact Dorjee support to raise it.`
            : `This would bring your shop to ${customers.used + count} customers, over its limit of ${customers.limit}${trial ? " for the free trial" : ""} (room for ${room} more). Contact Dorjee support to raise it.`,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * Throws when one more customer can't be connected to the customer app.
   * A record that is already connected doesn't need a new slot.
   */
  async assertCanConnectApp(shopId: string, customer: { accountId?: string | null }, audience: "shop" | "customer" = "shop") {
    if (customer.accountId) return;
    const { appCustomers, trial } = await this.usage(shopId);
    if (!isFull(appCustomers)) return;
    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code: "APP_CUSTOMER_LIMIT",
        limit: appCustomers.limit,
        used: appCustomers.used,
        message:
          audience === "customer"
            ? "This shop can't connect more customers to the app right now. Please let the shop know."
            : `${appCustomers.limit} customers already use the customer app, your shop's limit${trial ? " for the free trial" : ""}. Disconnect someone or contact Dorjee support to raise it.`,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
