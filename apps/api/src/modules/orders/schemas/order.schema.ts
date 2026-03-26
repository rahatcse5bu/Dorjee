import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
class OrderItem {
  @Prop({ required: true, trim: true })
  clothType!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 1, default: 1 })
  quantity!: number;

  @Prop({ type: Object, default: {} })
  measurements!: Record<string, string | number>;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true })
  customerId!: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  orderItems!: OrderItem[];

  // Legacy field kept for backward compatibility.
  @Prop({ required: true })
  clothType!: string;

  // Legacy field kept for backward compatibility.
  @Prop({ type: Object, default: {} })
  measurements!: Record<string, string | number>;

  @Prop({ required: true, default: "draft" })
  status!: string;

  @Prop({ required: true, default: 0 })
  amount!: number;

  @Prop({ type: Date, default: null })
  deliveryDate?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
