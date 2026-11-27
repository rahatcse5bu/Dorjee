import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { addDays, addMonths, Plan } from "./plans";
import { PlatformSettingsService } from "./platform-settings.service";
import { Subscription, SubscriptionDocument } from "./schemas/subscription.schema";

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly settings: PlatformSettingsService,
  ) {}

  upsertTrial(shopId: string, trialEndsAt: Date) {
    return this.subscriptionModel
      .findOneAndUpdate(
        { shopId },
        {
          shopId,
          status: "trial",
          trialEndsAt,
          nextBillingDate: trialEndsAt,
        },
        { upsert: true, new: true },
      )
      .lean();
  }

  /**
   * Returns the subscription with its effective status: a trial past its end
   * date reads as "expired", and an active plan past its billing date as
   * "past_due". Stored status is left untouched until a payment changes it.
   */
  async getByShopId(shopId: string) {
    const subscription = await this.subscriptionModel.findOne({ shopId }).lean();
    if (!subscription) return subscription;

    const now = Date.now();
    if (subscription.status === "trial" && subscription.trialEndsAt && subscription.trialEndsAt.getTime() < now) {
      return { ...subscription, status: "expired" as const };
    }
    if (subscription.status === "active" && subscription.nextBillingDate && subscription.nextBillingDate.getTime() < now) {
      return { ...subscription, status: "past_due" as const };
    }
    return subscription;
  }

  /**
   * Live subscription per shop for the admin app, keyed by shopId. Status is the
   * effective one, with "grace" for a paid shop past its billing date but still
   * inside the platform's grace days.
   */
  async summaryByShop(shopIds: string[]) {
    const [subscriptions, { graceDays }] = await Promise.all([
      this.subscriptionModel.find({ shopId: { $in: shopIds } }).lean(),
      this.settings.get(),
    ]);
    const now = Date.now();
    const result = new Map<string, { status: string; planCode: string; trialEndsAt: Date | null; nextBillingDate: Date | null; graceEndsAt: Date | null }>();
    for (const sub of subscriptions) {
      let status: string = sub.status;
      let graceEndsAt: Date | null = null;
      if (status === "trial" && sub.trialEndsAt && sub.trialEndsAt.getTime() < now) status = "expired";
      if (status === "active" && sub.nextBillingDate && sub.nextBillingDate.getTime() < now) {
        graceEndsAt = graceDays > 0 ? addDays(sub.nextBillingDate, graceDays) : null;
        status = graceEndsAt && graceEndsAt.getTime() > now ? "grace" : "past_due";
      }
      result.set(sub.shopId, {
        status,
        planCode: sub.planCode,
        trialEndsAt: sub.trialEndsAt ?? null,
        nextBillingDate: sub.nextBillingDate ?? null,
        graceEndsAt,
      });
    }
    return result;
  }

  /**
   * Whether the shop may use the app: during an unexpired trial, a paid period,
   * or the grace days (platform setting) after a paid period ends. Shops with no
   * subscription record are locked too.
   */
  async getAccess(shopId: string) {
    const subscription = await this.getByShopId(shopId);
    const status = subscription?.status ?? "inactive";
    let graceEndsAt: Date | null = null;
    if (status === "past_due" && subscription?.nextBillingDate) {
      const { graceDays } = await this.settings.get();
      if (graceDays > 0) graceEndsAt = addDays(subscription.nextBillingDate, graceDays);
    }
    const inGrace = !!graceEndsAt && graceEndsAt.getTime() > Date.now();
    return {
      locked: status !== "trial" && status !== "active" && !inGrace,
      status,
      trialEndsAt: subscription?.trialEndsAt ?? null,
      nextBillingDate: subscription?.nextBillingDate ?? null,
      graceEndsAt: inGrace ? graceEndsAt : null,
    };
  }

  /**
   * Activates a paid plan. Time still left on an active subscription is kept:
   * the plan's months are added to its billing date, otherwise to today.
   */
  async activate(shopId: string, plan: Plan) {
    const current = await this.subscriptionModel.findOne({ shopId }).lean();
    const now = new Date();
    const paidUntil = current?.status === "active" ? current.nextBillingDate : null;
    const from = paidUntil && paidUntil > now ? paidUntil : now;
    return this.subscriptionModel
      .findOneAndUpdate(
        { shopId },
        {
          status: "active",
          planCode: plan.code,
          amountBdt: plan.priceBdt,
          months: plan.months,
          nextBillingDate: addMonths(from, plan.months),
          trialEndsAt: null,
        },
        { new: true, upsert: true },
      )
      .lean();
  }
}
