import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { Customer, CustomerDocument } from "../customers/schemas/customer.schema";
import { Order, OrderDocument } from "../orders/schemas/order.schema";
import { Payment, PaymentDocument } from "../payments/schemas/payment.schema";
import { Shop, ShopDocument } from "../shops/schemas/shop.schema";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { User, UserDocument } from "../users/schemas/user.schema";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Everything the admin app shows on a shop's page. Order contents and customer details stay private. */
  async shopOverview(shopId: string): Promise<Record<string, unknown>> {
    if (!isValidObjectId(shopId)) throw new NotFoundException("Shop not found");
    const shop = (await this.shopModel
      .findById(shopId)
      .select("name ownerName phone email address createdAt updatedAt clothTypes measurementLabels")
      .lean()) as Record<string, unknown> | null;
    if (!shop) throw new NotFoundException("Shop not found");

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [subscription, access, users, payments, customers, orderStats, lastOrder] = await Promise.all([
      this.subscriptions.getByShopId(shopId),
      this.subscriptions.getAccess(shopId),
      this.userModel.find({ shopId }).select("email name phone role active createdAt").sort({ createdAt: 1 }).lean(),
      this.paymentModel
        .find({ shopId, status: { $in: ["pending", "approved", "rejected", "refunded"] } })
        .select("-refundLock -returnOrigin")
        .sort({ createdAt: -1 })
        .lean(),
      this.customerModel.countDocuments({ shopId }),
      this.orderModel.aggregate<{ _id: null; total: number; last30: number; delivered: number; revenue: number; collected: number }>([
        { $match: { shopId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            last30: { $sum: { $cond: [{ $gte: ["$createdAt", since30] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            revenue: { $sum: { $subtract: ["$amount", { $ifNull: ["$discount", 0] }] } },
            collected: { $sum: { $ifNull: ["$paidAmount", 0] } },
          },
        },
      ]),
      this.orderModel.findOne({ shopId }).select("createdAt").sort({ createdAt: -1 }).lean(),
    ]);

    const stats = orderStats[0] ?? { total: 0, last30: 0, delivered: 0, revenue: 0, collected: 0 };
    const paidBdt = payments
      .filter((p) => p.status === "approved" || p.status === "refunded")
      .reduce((sum, p) => sum + (p.method === "bkash_online" ? p.amountBdt : (p.payableBdt ?? p.amountBdt)) - (p.refundedBdt ?? 0), 0);

    return {
      shop,
      subscription,
      access,
      users,
      payments,
      stats: {
        customers,
        orders: stats.total,
        ordersLast30Days: stats.last30,
        delivered: stats.delivered,
        orderValueBdt: stats.revenue,
        collectedBdt: stats.collected,
        lastOrderAt: (lastOrder as { createdAt?: Date } | null)?.createdAt ?? null,
        subscriptionPaidBdt: Math.round(paidBdt * 100) / 100,
      },
    };
  }
}
