import { SubscriptionStatus } from "@dorjee/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ShopDocument = HydratedDocument<Shop>;

@Schema({ timestamps: true })
export class Shop {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  ownerName!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ default: "trial" })
  subscriptionStatus!: SubscriptionStatus;

  @Prop({ type: Date, default: null })
  trialEndsAt?: Date | null;

  @Prop({ type: [String], default: [] })
  measurementLabels!: string[];

  @Prop({ type: [String], default: [] })
  clothTypes!: string[];
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
