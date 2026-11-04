import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Subscription, SubscriptionSchema } from "./schemas/subscription.schema";
import { PlansController } from "./plans.controller";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
  ],
  controllers: [SubscriptionsController, PlansController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
