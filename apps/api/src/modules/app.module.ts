import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { ShopsModule } from "./shops/shops.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/dorjee"),
    UsersModule,
    AuthModule,
    ShopsModule,
    CatalogModule,
    CustomersModule,
    OrdersModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
