import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const MATERIAL_CATEGORIES = ["fabric", "thread", "button", "lining", "zipper", "lace", "other"] as const;
export const MATERIAL_UNITS = ["yard", "meter", "piece", "reel", "packet", "dozen", "kg"] as const;

export type MaterialDocument = HydratedDocument<Material>;

/** A raw material the shop keeps in stock: fabric (kapor), thread, buttons and so on. */
@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true })
  shopId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: MATERIAL_CATEGORIES, default: "fabric" })
  category!: string;

  @Prop({ trim: true })
  color?: string;

  // Optional swatch, e.g. "#1f3a93".
  @Prop({ trim: true })
  colorHex?: string;

  @Prop({ required: true, enum: MATERIAL_UNITS, default: "yard" })
  unit!: string;

  // Current stock, kept to 2 decimals (e.g. 12.5 yards). Changed only through stock movements.
  @Prop({ required: true, default: 0, min: 0 })
  quantity!: number;

  // Warn when stock falls to this level or below; null for no warning.
  @Prop({ type: Number, default: null })
  lowStockAt?: number | null;

  // Purchase cost per unit, for the stock value.
  @Prop({ type: Number, default: null })
  costPerUnit?: number | null;

  @Prop({ trim: true })
  supplier?: string;

  @Prop({ trim: true })
  notes?: string;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.index({ shopId: 1, category: 1, name: 1 });
