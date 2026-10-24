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
  measurements!: Record<string, string | number>;

  // Saved measurements per cloth type, e.g. { Shirt: { Length: 30 }, Pant: { Length: 40 } }.
  @Prop({ type: Object, default: {} })
  measurementsByType!: Record<string, Record<string, string | number>>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ shopId: 1, createdAt: -1 });
