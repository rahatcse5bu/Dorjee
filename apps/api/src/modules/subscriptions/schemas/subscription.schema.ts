import { SubscriptionStatus } from "@dorjee/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, unique: true })
  shopId!: string;

  @Prop({ required: true, default: "MONTHLY_500_BDT" })
  planCode!: string;

  @Prop({ required: true, default: 500 })
  amountBdt!: number;

  @Prop({ required: true, default: "trial" })
  status!: SubscriptionStatus;

  @Prop({ type: Date, default: null })
  trialEndsAt?: Date | null;

  @Prop({ type: Date, default: null })
  nextBillingDate?: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });
