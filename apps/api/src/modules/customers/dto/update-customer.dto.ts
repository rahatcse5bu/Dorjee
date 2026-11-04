import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number | boolean>;

  @IsOptional()
  @IsObject()
  measurementsByType?: Record<string, Record<string, string | number | boolean>>;
}
