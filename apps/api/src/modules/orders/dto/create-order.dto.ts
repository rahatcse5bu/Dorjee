import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

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
  @IsString()
  status?: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
