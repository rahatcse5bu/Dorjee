import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Customer, CustomerSchema } from "../customers/schemas/customer.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { Notification, NotificationSchema } from "./schemas/notification.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
