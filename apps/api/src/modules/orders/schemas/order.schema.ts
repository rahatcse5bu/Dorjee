import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OrderDocument = HydratedDocument<Order>;

export const ORDER_STATUSES = [
  "draft",
  "confirmed",
  "in_tailoring",
  "ready",
  "delivered",
  "cancelled",
] as const;

export const PAYMENT_METHODS = ["cash", "bkash", "nagad", "card", "other"] as const;

/** Whose cloth the garment is made from. */
export const FABRIC_SOURCES = ["customer", "shop"] as const;

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

  @Prop({ type: String, enum: FABRIC_SOURCES })
  fabricSource?: string;

  // Fabric material / texture, e.g. "Cotton", "Linen".
  @Prop({ trim: true })
  fabric?: string;

  @Prop({ trim: true })
  color?: string;

  // Optional swatch, e.g. "#1f3a93".
  @Prop({ trim: true })
  colorHex?: string;

  @Prop({ trim: true })
  styleNotes?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class OrderPayment {
  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, default: "cash" })
  method!: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ type: Date, default: () => new Date() })
  paidAt!: Date;

  @Prop({ type: String, default: null })
  receivedBy?: string | null;
}

const OrderPaymentSchema = SchemaFactory.createForClass(OrderPayment);

@Schema({ _id: false })
class StatusChange {
  @Prop({ required: true })
  status!: string;

  @Prop({ type: Date, default: () => new Date() })
  at!: Date;

  @Prop({ type: String, default: null })
  by?: string | null;
}

const StatusChangeSchema = SchemaFactory.createForClass(StatusChange);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  shopId!: string;

  // Human-friendly, per-shop sequential number (1, 2, 3, ...).
  @Prop({ type: Number })
  orderNo?: number;

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

  // Gross amount: sum of item price × quantity.
  @Prop({ required: true, default: 0 })
  amount!: number;

  @Prop({ default: 0, min: 0 })
  discount!: number;

  // Sum of payments, kept in sync so dues can be queried directly.
  @Prop({ default: 0, min: 0 })
  paidAmount!: number;

  @Prop({ type: [OrderPaymentSchema], default: [] })
  payments!: OrderPayment[];

  @Prop({ type: [StatusChangeSchema], default: [] })
  statusHistory!: StatusChange[];

  @Prop({ type: Date, default: null })
  deliveryDate?: Date;

  // User id of the tailor responsible for this order.
  @Prop({ type: String, default: null })
  assignedTo?: string | null;

  @Prop({ trim: true })
  notes?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, orderNo: 1 });
