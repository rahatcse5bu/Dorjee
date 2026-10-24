import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export const STAFF_ROLES = ["manager", "tailor", "shop_staff", "accountant"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(STAFF_ROLES)
  role!: StaffRole;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Lets the owner reset a staff member's password.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
