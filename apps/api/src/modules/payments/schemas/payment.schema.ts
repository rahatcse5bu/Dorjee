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

  // The plan this payment buys; see subscriptions/plans.ts.
  @Prop({ required: true, default: "MONTHLY" })
  planCode!: string;

  @Prop({ required: true, default: 1 })
  months!: number;

  // bkash_online: paid through the bKash checkout page and confirmed by bKash, no review needed.
  @Prop({ required: true, enum: ["bkash_manual", "nagad_manual", "bkash_online"] })
  method!: "bkash_manual" | "nagad_manual" | "bkash_online";

  // bKash's TrxID. An online payment gets it only once bKash completes it.
  @Prop({ trim: true })
  transactionId?: string;

  // bKash checkout: the gateway's paymentID, and the shop app origin to send the user back to.
  @Prop({ trim: true })
  bkashPaymentId?: string;

  @Prop({ trim: true })
  returnOrigin?: string;

  // The bKash number the shop sent from. Older payments don't have one.
  @Prop({ trim: true })
  senderNumber?: string;

  // Cash-out charge added to the plan price, and the total the shop sent.
  @Prop({ default: 0 })
  chargeBdt?: number;

  @Prop()
  payableBdt?: number;

  @Prop({ trim: true })
  proofImageUrl?: string;

  // initiated/processing/failed are only used by bKash checkout payments.
  @Prop({ required: true, default: "pending" })
  status!: "pending" | "approved" | "rejected" | "initiated" | "processing" | "failed";

  @Prop({ default: null })
  reviewedBy?: string;

  @Prop({ trim: true })
  reviewNote?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ shopId: 1, createdAt: -1 });
PaymentSchema.index({ bkashPaymentId: 1 }, { unique: true, sparse: true });
