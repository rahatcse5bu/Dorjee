import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { addMonths, Plan } from "./plans";
import { Subscription, SubscriptionDocument } from "./schemas/subscription.schema";

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
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
