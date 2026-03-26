import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { Payment, PaymentDocument } from "./schemas/payment.schema";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  createManual(payload: {
    shopId: string;
    method: "bkash_manual" | "nagad_manual";
    transactionId: string;
    proofImageUrl?: string;
  }) {
    return this.paymentModel.create({
      ...payload,
      amountBdt: 500,
      subscriptionId: payload.shopId,
      status: "pending",
    });
  }

  listPending() {
    return this.paymentModel.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
  }

  listByShop(shopId: string) {
    return this.paymentModel.find({ shopId }).sort({ createdAt: -1 }).lean();
  }

  listReviewed() {
    return this.paymentModel
      .find({ status: { $in: ["approved", "rejected"] } })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async approve(paymentId: string, reviewedBy: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    payment.status = "approved";
    payment.reviewedBy = reviewedBy;
    await payment.save();

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    await this.subscriptionsService.activate(payment.shopId, nextBillingDate);

    return payment.toObject();
  }

  async reject(paymentId: string, reviewedBy: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    payment.status = "rejected";
    payment.reviewedBy = reviewedBy;
    await payment.save();
    return payment.toObject();
  }
}
