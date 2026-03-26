import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

const adminRoles = ["super_admin", "admin_finance", "admin_support"] as const;

export class AdminRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsIn(adminRoles)
  role!: (typeof adminRoles)[number];
}
