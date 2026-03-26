import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

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
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
