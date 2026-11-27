import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { normalizePlanCode, payableFor, Plan } from "../subscriptions/plans";
import { PlatformSettingsService } from "../subscriptions/platform-settings.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { BkashResponse, BkashService } from "./bkash.service";
import { Payment, PaymentDocument } from "./schemas/payment.schema";

/** Shop app origins bKash may send the user back to (SHOP_APP_URLS, comma separated). */
function allowedOrigins() {
  return (process.env.SHOP_APP_URLS ?? "https://dorjee.shop,https://www.dorjee.shop")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function safeReturnOrigin(origin?: string) {
  const allowed = allowedOrigins();
  if (!origin) return allowed[0];
  try {
    const url = new URL(origin);
    // Local development of the shop app is always allowed.
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return url.origin;
    if (allowed.includes(url.origin)) return url.origin;
  } catch {
    // Not a URL; fall back below.
  }
  return allowed[0];
}

export type BkashOutcome = "success" | "failure" | "cancel";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly bkash: BkashService,
    private readonly settings: PlatformSettingsService,
  ) {}

  /** The plan a stored payment bought, at the price that was actually charged. */
  private paidPlan(payment: { planCode: string; months: number; amountBdt: number }): Plan {
    return { code: normalizePlanCode(payment.planCode), months: payment.months, priceBdt: payment.amountBdt };
  }

  /**
   * Starts a bKash checkout for a plan and returns the bKash page to send the user to.
   * The amount is the plan price (no cash-out charge: the money goes to a merchant account).
   */
  async createBkash(payload: { shopId: string; planCode?: string; returnOrigin?: string; callbackURL: string }) {
    const { bkashOnline } = await this.settings.get();
    if (!bkashOnline || !this.bkash.enabled) throw new ServiceUnavailableException("bKash online payment is turned off");
    const plan = await this.settings.planForPurchase(payload.planCode);
    const payment = await this.paymentModel.create({
      shopId: payload.shopId,
      subscriptionId: payload.shopId,
      method: "bkash_online",
      planCode: plan.code,
      months: plan.months,
      amountBdt: plan.priceBdt,
      chargeBdt: 0,
      payableBdt: plan.priceBdt,
      returnOrigin: safeReturnOrigin(payload.returnOrigin),
      status: "initiated",
    });

    let result: BkashResponse;
    try {
      result = await this.bkash.createPayment({
        amount: plan.priceBdt,
        callbackURL: payload.callbackURL,
        invoice: `DRJ-${payment.id}`,
        payerReference: payload.shopId.slice(-12),
      });
    } catch (error) {
      await this.paymentModel.updateOne({ _id: payment._id }, { status: "failed", reviewNote: "bKash unreachable" });
      throw error instanceof ServiceUnavailableException
        ? error
        : new ServiceUnavailableException("bKash is not available right now. Please try again.");
    }

    if (result.statusCode !== "0000" || !result.paymentID || !result.bkashURL) {
      const reason = result.statusMessage ?? result.errorMessage ?? result.message ?? "bKash refused the payment";
      this.logger.warn(`bKash create failed for shop ${payload.shopId}: ${reason}`);
      await this.paymentModel.updateOne({ _id: payment._id }, { status: "failed", reviewNote: reason });
      throw new BadRequestException(reason);
    }

    await this.paymentModel.updateOne({ _id: payment._id }, { bkashPaymentId: result.paymentID });
    return { paymentId: payment.id, bkashURL: result.bkashURL };
  }

  /**
   * bKash sends the user's browser here after checkout. Nothing in the URL is
   * trusted: the payment is executed (or looked up) on bKash's side, and the plan
   * is activated only when bKash reports it Completed for the expected amount.
   * Returns where to send the user next.
   */
  async completeBkash(paymentID: string | undefined, status: string | undefined) {
    const payment = paymentID ? await this.paymentModel.findOne({ bkashPaymentId: paymentID, method: "bkash_online" }) : null;
    const back = (outcome: BkashOutcome, extra: Record<string, string> = {}) => {
      const url = new URL("/subscription", payment?.returnOrigin ?? allowedOrigins()[0]);
      url.searchParams.set("bkash", outcome);
      for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
      return url.toString();
    };
    if (!payment) return back("failure");

    // Already settled (the user reloaded the callback, or bKash called twice).
    if (payment.status === "approved") return back("success", { trx: payment.transactionId ?? "" });
    if (payment.status === "failed") return back("failure");

    if (status !== "success") {
      await this.paymentModel.updateOne(
        { _id: payment._id, status: "initiated" },
        { status: "failed", reviewNote: status === "cancel" ? "Cancelled by user" : "Failed at bKash" },
      );
      return back(status === "cancel" ? "cancel" : "failure");
    }

    // Claim the payment so two concurrent callbacks can't both activate the plan.
    const claimed = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: "initiated" },
      { status: "processing" },
      { new: true },
    );
    if (!claimed) return back("failure");

    let result: BkashResponse | null = null;
    try {
      result = await this.bkash.executePayment(paymentID!);
    } catch (error) {
      this.logger.warn(`bKash execute errored for ${paymentID}: ${(error as Error).message}`);
    }
    // Execute can fail after bKash already completed it (timeout, retried callback): ask for the status.
    if (!result || result.transactionStatus !== "Completed") {
      try {
        result = await this.bkash.queryPayment(paymentID!);
      } catch (error) {
        this.logger.warn(`bKash query errored for ${paymentID}: ${(error as Error).message}`);
      }
    }

    if (!result) {
      // Outcome unknown: leave it claimable so reopening the callback link tries again.
      await this.paymentModel.updateOne({ _id: payment._id, status: "processing" }, { status: "initiated" });
      return back("failure", { retry: "1" });
    }

    const paid =
      result.transactionStatus === "Completed" &&
      Number(result.amount) === payment.amountBdt &&
      (!result.paymentID || result.paymentID === paymentID);

    if (!paid) {
      const reason = result.statusMessage ?? result.errorMessage ?? result.transactionStatus ?? "Not completed";
      await this.paymentModel.updateOne({ _id: payment._id }, { status: "failed", reviewNote: reason });
      return back("failure");
    }

    await this.paymentModel.updateOne(
      { _id: payment._id },
      {
        status: "approved",
        transactionId: result.trxID,
        senderNumber: result.customerMsisdn,
        reviewedBy: "bkash",
        reviewNote: "Paid via bKash checkout",
      },
    );
    await this.subscriptionsService.activate(payment.shopId, this.paidPlan(payment));
    return back("success", { trx: result.trxID ?? "" });
  }

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
    const settings = await this.settings.get();
    if (!settings.manualPaymentEnabled) throw new BadRequestException("Manual bKash payment is turned off. Please pay online.");
    // The price always comes from the plan, never from the client.
    const plan = await this.settings.planForPurchase(payload.planCode);
    return this.paymentModel.create({
      ...payload,
      method: "bkash_manual",
      planCode: plan.code,
      months: plan.months,
      amountBdt: plan.priceBdt,
      ...payableFor(plan.priceBdt, settings.cashoutPerThousand),
      subscriptionId: payload.shopId,
      status: "pending",
    });
  }

  listPending() {
    return this.paymentModel.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
  }

  listByShop(shopId: string) {
    return this.paymentModel
      .find({ shopId, status: { $in: ["pending", "approved", "rejected", "refunded"] } })
      .sort({ createdAt: -1 })
      .lean();
  }

  listReviewed() {
    return this.paymentModel
      .find({ status: { $in: ["approved", "rejected", "refunded"] } })
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

    await this.subscriptionsService.activate(payment.shopId, this.paidPlan(payment));

    return payment.toObject();
  }

  /**
   * Refunds an approved payment. bKash checkout payments go back through the
   * bKash refund API; manual Send Money payments are refunded by hand and only
   * recorded here. A full refund also removes the plan's months.
   */
  async refund(paymentId: string, by: string, input: { amountBdt?: number; reason: string; refundTrxId?: string }) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "approved") throw new BadRequestException("Only approved payments can be refunded");

    const paid = payment.method === "bkash_online" ? payment.amountBdt : (payment.payableBdt ?? payment.amountBdt);
    const remaining = Math.round((paid - (payment.refundedBdt ?? 0)) * 100) / 100;
    const amount = input.amountBdt ?? remaining;
    if (amount <= 0 || amount > remaining) {
      throw new BadRequestException(`Refund must be between 1 and ${remaining} tk`);
    }
    if (payment.method === "bkash_online") {
      if (!payment.bkashPaymentId || !payment.transactionId) throw new BadRequestException("This payment has no bKash reference");
    } else if (!input.refundTrxId) {
      throw new BadRequestException("Send the money back by bKash first, then enter that transaction ID");
    }

    // Claim the payment so a double click or a second admin can't refund it twice.
    const claimed = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: "approved", refundLock: { $ne: true } },
      { refundLock: true },
      { new: true },
    );
    if (!claimed) throw new BadRequestException("A refund for this payment is already in progress");

    try {
      let refundTrxId = input.refundTrxId?.trim().toUpperCase();
      if (payment.method === "bkash_online") {
        let result: BkashResponse | null = null;
        try {
          result = await this.bkash.refund({
            paymentID: payment.bkashPaymentId!,
            trxID: payment.transactionId!,
            amount,
            reason: input.reason,
            sku: `${payment.planCode}-${payment.months}m`,
          });
        } catch (error) {
          this.logger.warn(`bKash refund errored for ${payment.bkashPaymentId}: ${(error as Error).message}`);
          // The refund may have gone through before the connection dropped: ask bKash.
          const known = new Set((payment.refunds ?? []).map((r) => r.refundTrxId));
          const status = await this.bkash.refundStatus(payment.bkashPaymentId!, payment.transactionId!).catch(() => null);
          if (status?.transactionStatus === "Completed" && status.refundTrxID && !known.has(status.refundTrxID)) {
            result = status;
          } else {
            throw new ServiceUnavailableException(
              "bKash did not answer. Check the payment in the bKash merchant panel before trying again.",
            );
          }
        }
        if (result.transactionStatus !== "Completed" || !result.refundTrxID) {
          throw new BadRequestException(result.statusMessage ?? result.errorMessage ?? result.message ?? "bKash refused the refund");
        }
        refundTrxId = result.refundTrxID;
      }

      const refundedBdt = Math.round(((payment.refundedBdt ?? 0) + amount) * 100) / 100;
      const full = refundedBdt >= paid;
      const updated = await this.paymentModel.findByIdAndUpdate(
        payment._id,
        {
          $push: {
            refunds: {
              amountBdt: amount,
              refundTrxId,
              reason: input.reason,
              by,
              at: new Date(),
              via: payment.method === "bkash_online" ? "bkash_api" : "manual",
            },
          },
          refundedBdt,
          ...(full ? { status: "refunded" } : {}),
        },
        { new: true },
      );
      if (full) await this.subscriptionsService.revoke(payment.shopId, payment.months);
      return updated!.toObject();
    } finally {
      await this.paymentModel.updateOne({ _id: payment._id }, { refundLock: false });
    }
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
