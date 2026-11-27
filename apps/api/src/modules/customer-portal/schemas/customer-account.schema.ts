import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CustomerAccountDocument = HydratedDocument<CustomerAccount>;

/**
 * A customer's sign-in for the customer app. One account can be linked to the
 * customer's record at several shops (Customer.accountId points here).
 */
@Schema({ timestamps: true })
export class CustomerAccount {
  // Bangladeshi mobile number in 01XXXXXXXXX form.
  @Prop({ required: true, unique: true, trim: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: true })
  active!: boolean;

  // Wrong-password counter and temporary lock, against password guessing.
  @Prop({ default: 0 })
  failedLogins!: number;

  @Prop({ type: Date, default: null })
  lockedUntil?: Date | null;
}

export const CustomerAccountSchema = SchemaFactory.createForClass(CustomerAccount);
