import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Customer, CustomerSchema } from "../customers/schemas/customer.schema";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Payment, PaymentSchema } from "../payments/schemas/payment.schema";
import { Shop, ShopSchema } from "../shops/schemas/shop.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
