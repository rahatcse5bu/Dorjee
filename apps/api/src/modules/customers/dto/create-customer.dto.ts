import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, string | number>;
}
