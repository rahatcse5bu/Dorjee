import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { Material, MaterialSchema } from "./schemas/material.schema";
import { StockMovement, StockMovementSchema } from "./schemas/stock-movement.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
