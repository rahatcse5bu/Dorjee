import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { Customer, CustomerSchema } from "../customers/schemas/customer.schema";
import { OrdersModule } from "../orders/orders.module";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Shop, ShopSchema } from "../shops/schemas/shop.schema";
import { CustomerAuthGuard } from "./customer-auth.guard";
import { CustomerPortalController } from "./customer-portal.controller";
import { CustomerPortalService } from "./customer-portal.service";
import { CustomerAccount, CustomerAccountSchema } from "./schemas/customer-account.schema";

@Module({
  imports: [
    JwtModule.register({}),
    OrdersModule,
    MongooseModule.forFeature([
      { name: CustomerAccount.name, schema: CustomerAccountSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService, CustomerAuthGuard],
})
export class CustomerPortalModule {}
