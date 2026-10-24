import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

/** Fields a shop can edit about itself. Billing and permission fields are not editable here. */
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ownerName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
