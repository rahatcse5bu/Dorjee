import { Controller, Get } from "@nestjs/common";
import { PAYMENT_INFO, payableFor, SUBSCRIPTION_PLANS } from "./plans";

/** Public price list, so the shop app and website show the same prices. */
@Controller("subscription-plans")
export class PlansController {
  /** Each plan with the amount to send, cash-out charge included. */
  @Get()
  list() {
    return SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, ...payableFor(plan.priceBdt) }));
  }

  /** Where and how to pay. */
  @Get("payment-info")
  paymentInfo() {
    return PAYMENT_INFO;
  }
}
