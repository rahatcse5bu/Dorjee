import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  measurementLabels?: string[];

  @IsOptional()
  clothTypes?: string[];
}
