import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Shop, ShopSchema } from "../shops/schemas/shop.schema";
import { CustomerLimitsService } from "./customer-limits.service";
import { Customer, CustomerSchema } from "./schemas/customer.schema";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerLimitsService],
  exports: [CustomersService, CustomerLimitsService],
})
export class CustomersModule {}
