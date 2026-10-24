import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Shop, ShopSchema } from "../shops/schemas/shop.schema";
import { PermissionsController } from "./permissions.controller";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionsService } from "./permissions.service";

// Global so every feature module can use PermissionsGuard without importing this module.
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }])],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
