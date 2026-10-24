import { UserRole } from "@dorjee/types";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

// Public sign-up only creates a new shop and its owner. Staff accounts are
// created by the shop owner through /shops/:shopId/staff.
const allowedRoles: UserRole[] = ["shop_owner"];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsIn(allowedRoles)
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  shopName!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;
}
