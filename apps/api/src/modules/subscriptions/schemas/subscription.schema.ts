import { SubscriptionStatus } from "@dorjee/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, unique: true })
  shopId!: string;

  // The last plan paid for; see plans.ts. Older records hold "MONTHLY_500_BDT".
  @Prop({ required: true, default: "MONTHLY" })
  planCode!: string;

  @Prop({ required: true, default: 500 })
  amountBdt!: number;

  @Prop({ required: true, default: 1 })
  months!: number;

  @Prop({ required: true, default: "trial" })
  status!: SubscriptionStatus;

  @Prop({ type: Date, default: null })
  trialEndsAt?: Date | null;

  @Prop({ type: Date, default: null })
  nextBillingDate?: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });
