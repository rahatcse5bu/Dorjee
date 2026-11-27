import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ trim: true })
  address?: string;

  // Legacy flat measurements, still used to pre-fill when no per-type value exists.
  @Prop({ type: Object, default: {} })
  measurements!: Record<string, string | number | boolean>;

  // Saved measurements per cloth type, e.g. { Shirt: { Length: 30 }, Pant: { Length: 40 } }.
  @Prop({ type: Object, default: {} })
  measurementsByType!: Record<string, Record<string, string | number | boolean>>;

  // The customer app account linked to this record, set when the customer redeems an invite.
  @Prop({ type: String, default: null })
  accountId?: string | null;

  // Hash of the current one-time invite code; never returned by default.
  @Prop({ type: String, default: null, select: false })
  appInviteHash?: string | null;

  @Prop({ type: Date, default: null })
  appInviteExpiresAt?: Date | null;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ shopId: 1, createdAt: -1 });
CustomerSchema.index({ accountId: 1 }, { sparse: true });
CustomerSchema.index({ appInviteHash: 1 }, { sparse: true });
