import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true })
  subscriptionId!: string;

  @Prop({ required: true, default: 500 })
  amountBdt!: number;

  @Prop({ required: true, enum: ["bkash_manual", "nagad_manual"] })
  method!: "bkash_manual" | "nagad_manual";

  @Prop({ required: true, trim: true })
  transactionId!: string;

  @Prop({ trim: true })
  proofImageUrl?: string;

  @Prop({ required: true, default: "pending" })
  status!: "pending" | "approved" | "rejected";

  @Prop({ default: null })
  reviewedBy?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ shopId: 1, createdAt: -1 });
