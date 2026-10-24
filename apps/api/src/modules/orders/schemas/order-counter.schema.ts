import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OrderCounterDocument = HydratedDocument<OrderCounter>;

@Schema()
export class OrderCounter {
  @Prop({ required: true, unique: true })
  shopId!: string;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export const OrderCounterSchema = SchemaFactory.createForClass(OrderCounter);
