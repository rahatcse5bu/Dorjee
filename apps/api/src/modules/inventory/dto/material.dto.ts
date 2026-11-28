import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from "../schemas/material.schema";
import { MOVEMENT_TYPES } from "../schemas/stock-movement.schema";

const MAX_QTY = 1_000_000;

export class CreateMaterialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(MATERIAL_CATEGORIES)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Color swatch must look like #1f3a93" })
  colorHex?: string;

  @IsIn(MATERIAL_UNITS)
  unit!: string;

  // Opening stock; recorded as the first stock movement.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  quantity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  lowStockAt?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  costPerUnit?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Details only: the quantity changes through stock movements, so it has a history. */
export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(MATERIAL_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @Matches(/^(#[0-9a-fA-F]{6})?$/, { message: "Color swatch must look like #1f3a93" })
  colorHex?: string;

  @IsOptional()
  @IsIn(MATERIAL_UNITS)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  lowStockAt?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  costPerUnit?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class StockMovementDto {
  @IsIn(MOVEMENT_TYPES)
  type!: string;

  // in/out: how much came in or went out; adjust: the counted stock.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderNo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_QTY)
  costPerUnit?: number;
}
