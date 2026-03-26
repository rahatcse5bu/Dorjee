import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
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

  getByShopId(shopId: string) {
    return this.subscriptionModel.findOne({ shopId }).lean();
  }

  activate(shopId: string, nextBillingDate: Date) {
    return this.subscriptionModel
      .findOneAndUpdate(
        { shopId },
        {
          status: "active",
          nextBillingDate,
          trialEndsAt: null,
        },
        { new: true, upsert: true },
      )
      .lean();
  }
}
