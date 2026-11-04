import { Controller, Get } from "@nestjs/common";
import { SUBSCRIPTION_PLANS } from "./plans";

/** Public price list, so the shop app and website show the same prices. */
@Controller("subscription-plans")
export class PlansController {
  @Get()
  list() {
    return SUBSCRIPTION_PLANS;
  }
}
