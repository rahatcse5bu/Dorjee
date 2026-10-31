import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type NotificationDocument = HydratedDocument<Notification>;

export const NOTIFICATION_TYPES = ["order_assigned", "order_unassigned"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const NINETY_DAYS = 90 * 24 * 60 * 60;

// Text is not stored: the app renders it from `type` and `data` in the reader's language.
@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  shopId!: string;

  // The user who receives it.
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true, enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @Prop({ type: Object, default: {} })
  data!: {
    orderId?: string;
    orderNo?: number;
    customerName?: string;
    actorName?: string;
  };

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  createdAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, shopId: 1, createdAt: -1 });
// Old notifications clean themselves up.
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS });
