import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Customer, CustomerSchema } from "../customers/schemas/customer.schema";
import { OrderCounter, OrderCounterSchema } from "../orders/schemas/order-counter.schema";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Shop, ShopSchema } from "../shops/schemas/shop.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderCounter.name, schema: OrderCounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
