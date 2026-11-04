import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { findPlan, payableFor } from "../subscriptions/plans";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { Payment, PaymentDocument } from "./schemas/payment.schema";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async createManual(payload: {
    shopId: string;
    senderNumber: string;
    transactionId: string;
    planCode?: string;
  }) {
    // One bKash transaction can only pay for one plan (a rejected one may be resubmitted).
    const used = await this.paymentModel.exists({
      transactionId: payload.transactionId,
      status: { $ne: "rejected" },
    });
    if (used) {
      throw new BadRequestException("This transaction ID has already been submitted");
    }
    // The price always comes from the plan, never from the client.
    const plan = findPlan(payload.planCode);
    return this.paymentModel.create({
      ...payload,
      method: "bkash_manual",
      planCode: plan.code,
      months: plan.months,
      amountBdt: plan.priceBdt,
      ...payableFor(plan.priceBdt),
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

  async approve(paymentId: string, reviewedBy: string, note?: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    // Approving twice would add the plan's months twice.
    if (payment.status !== "pending") {
      throw new BadRequestException("Payment was already reviewed");
    }

    payment.status = "approved";
    payment.reviewedBy = reviewedBy;
    payment.reviewNote = note;
    await payment.save();

    await this.subscriptionsService.activate(payment.shopId, findPlan(payment.planCode));

    return payment.toObject();
  }

  async reject(paymentId: string, reviewedBy: string, note?: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    // Rejecting an approved payment would leave its months on the subscription.
    if (payment.status !== "pending") {
      throw new BadRequestException("Payment was already reviewed");
    }

    payment.status = "rejected";
    payment.reviewedBy = reviewedBy;
    payment.reviewNote = note;
    await payment.save();
    return payment.toObject();
  }
}
