import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { Payment, PaymentSchema } from "./schemas/payment.schema";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { BkashService } from "./bkash.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    SubscriptionsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, BkashService],
})
export class PaymentsModule {}
