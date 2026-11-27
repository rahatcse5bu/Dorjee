import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ _id: false })
export class PlanSetting {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  months!: number;

  @Prop({ required: true })
  priceBdt!: number;

  // Hidden plans can't be bought; shops already on one keep it.
  @Prop({ default: true })
  active!: boolean;
}

export type PlatformSettingsDocument = HydratedDocument<PlatformSettings>;

/** Platform-wide settings edited from the admin app. There is one document, key "platform". */
@Schema({ timestamps: true, collection: "platformsettings" })
export class PlatformSettings {
  @Prop({ required: true, unique: true, default: "platform" })
  key!: string;

  @Prop({ type: [SchemaFactory.createForClass(PlanSetting)], default: [] })
  plans!: PlanSetting[];

  /** Free trial length for newly registered shops. */
  @Prop({ default: 7 })
  trialDays!: number;

  /** Days a paid shop keeps working after its billing date before it is locked. */
  @Prop({ default: 0 })
  graceDays!: number;

  /** bKash personal number shops Send Money to (manual payments). */
  @Prop({ trim: true })
  bkashNumber!: string;

  @Prop({ default: 18.75 })
  cashoutPerThousand!: number;

  @Prop({ default: true })
  manualPaymentEnabled!: boolean;

  /** bKash checkout; also needs the BKASH_* credentials on the server. */
  @Prop({ default: true })
  bkashOnlineEnabled!: boolean;

  // Customer limits per shop; 0 means no limit. Admins can override them per shop.
  @Prop()
  customerLimit?: number;

  @Prop()
  appCustomerLimit?: number;

  @Prop()
  trialCustomerLimit?: number;

  @Prop()
  trialAppCustomerLimit?: number;

  @Prop()
  updatedBy?: string;
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
