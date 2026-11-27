import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Subscription, SubscriptionSchema } from "./schemas/subscription.schema";
import { PlansController, PlatformSettingsController } from "./plans.controller";
import { PlatformSettingsService } from "./platform-settings.service";
import { PlatformSettings, PlatformSettingsSchema } from "./schemas/platform-settings.schema";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

// Global so TenantGuard can check the subscription in every feature module.
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
    ]),
  ],
  controllers: [SubscriptionsController, PlansController, PlatformSettingsController],
  providers: [SubscriptionsService, PlatformSettingsService],
  exports: [SubscriptionsService, PlatformSettingsService],
})
export class SubscriptionsModule {}
