import { UserRole } from "@dorjee/types";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

const allowedRoles: UserRole[] = [
  "shop_owner",
  "shop_staff",
  "tailor",
  "manager",
  "accountant",
];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsString()
  @IsIn(allowedRoles)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shopName?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
