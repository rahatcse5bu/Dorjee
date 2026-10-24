import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ORDER_STATUSES } from "../schemas/order.schema";

class UpdateOrderItemDto {
  @IsOptional()
  @IsString()
  clothType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number>;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  orderItems?: UpdateOrderItemDto[];

  @IsOptional()
  @IsString()
  clothType?: string;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number>;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  // null clears the delivery date.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  deliveryDate?: string | null;

  // null unassigns the order.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  assignedTo?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}
