import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { Customer, CustomerDocument } from "../customers/schemas/customer.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { Notification, NotificationDocument, NotificationType } from "./schemas/notification.schema";

interface OrderRef {
  _id: unknown;
  orderNo?: number;
  customerId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Tells the new assignee they got the order, and the previous one that it moved.
   * Never notifies people about their own actions. Failures are logged, not thrown,
   * so a notification problem can't block saving the order.
   */
  async orderAssignmentChanged(shopId: string, order: OrderRef, previous: string | null | undefined, next: string | null | undefined, actorId?: string) {
    if ((previous ?? null) === (next ?? null)) return;
    try {
      const [actor, customer] = await Promise.all([
        actorId && isValidObjectId(actorId) ? this.userModel.findById(actorId).select("name email").lean() : null,
        isValidObjectId(order.customerId) ? this.customerModel.findById(order.customerId).select("name").lean() : null,
      ]);
      const data = {
        orderId: String(order._id),
        orderNo: order.orderNo,
        customerName: customer?.name,
        actorName: actor?.name || actor?.email,
      };
      const notify = (userId: string | null | undefined, type: NotificationType) =>
        userId && userId !== actorId ? this.notificationModel.create({ shopId, userId, type, data }) : null;
      await Promise.all([notify(next, "order_assigned"), notify(previous, "order_unassigned")]);
    } catch (err) {
      this.logger.warn(`Could not create assignment notification: ${err instanceof Error ? err.message : err}`);
    }
  }

  async listForUser(shopId: string, userId: string) {
    const [items, unread] = await Promise.all([
      this.notificationModel.find({ shopId, userId }).sort({ createdAt: -1 }).limit(50).lean(),
      this.notificationModel.countDocuments({ shopId, userId, readAt: null }),
    ]);
    return { items, unread };
  }

  async markRead(shopId: string, userId: string, id: string) {
    if (!isValidObjectId(id)) return { success: true };
    await this.notificationModel.updateOne({ _id: id, shopId, userId, readAt: null }, { $set: { readAt: new Date() } });
    return { success: true };
  }

  async markAllRead(shopId: string, userId: string) {
    await this.notificationModel.updateMany({ shopId, userId, readAt: null }, { $set: { readAt: new Date() } });
    return { success: true };
  }
}
