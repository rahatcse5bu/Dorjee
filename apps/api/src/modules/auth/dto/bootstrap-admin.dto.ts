import { IsEmail, IsString, MinLength } from "class-validator";

export class BootstrapAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  bootstrapKey!: string;
}
