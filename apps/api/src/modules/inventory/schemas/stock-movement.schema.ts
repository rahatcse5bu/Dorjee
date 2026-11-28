import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/** in: bought or received; out: used or sold; adjust: stock counted and corrected. */
export const MOVEMENT_TYPES = ["in", "out", "adjust"] as const;

export type StockMovementDocument = HydratedDocument<StockMovement>;

/** One change to a material's stock; the history of how the quantity got where it is. */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class StockMovement {
  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true })
  materialId!: string;

  @Prop({ required: true, enum: MOVEMENT_TYPES })
  type!: string;

  // Signed change: positive for in, negative for out, either for adjust.
  @Prop({ required: true })
  change!: number;

  // Stock after this change.
  @Prop({ required: true })
  balance!: number;

  @Prop({ trim: true })
  note?: string;

  // The order this material was used for, by its shop order number.
  @Prop({ type: Number, default: null })
  orderNo?: number | null;

  // Cost per unit paid for a purchase.
  @Prop({ type: Number, default: null })
  costPerUnit?: number | null;

  // User who made the change.
  @Prop({ type: String, default: null })
  by?: string | null;

  createdAt?: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ shopId: 1, materialId: 1, createdAt: -1 });
