import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { FABRIC_SOURCES, ORDER_STATUSES, PAYMENT_METHODS } from "../schemas/order.schema";

class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  clothType!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number>;

  @IsOptional()
  @IsIn(FABRIC_SOURCES)
  fabricSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fabric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  colorHex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  styleNotes?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems?: CreateOrderItemDto[];

  @IsString()
  @IsNotEmpty()
  clothType!: string;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number>;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advance?: number;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  advanceMethod?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
