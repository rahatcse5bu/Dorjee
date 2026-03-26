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

  @Prop({ type: Object, default: {} })
  measurements!: Record<string, string | number>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ shopId: 1, createdAt: -1 });
