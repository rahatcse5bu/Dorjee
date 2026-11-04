import { SetMetadata } from "@nestjs/common";

export const SKIP_SUBSCRIPTION_KEY = "skipSubscriptionCheck";

/**
 * Keeps a shop route usable after the shop's trial or paid period has ended:
 * the routes needed to see the subscription, pay for it, and export data.
 */
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);
