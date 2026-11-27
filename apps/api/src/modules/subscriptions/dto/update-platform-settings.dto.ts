import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { PLAN_CODES } from "../plans";

export class PlanSettingDto {
  @IsIn(PLAN_CODES)
  code!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  priceBdt!: number;

  @IsBoolean()
  active!: boolean;
}

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PLAN_CODES.length)
  @ValidateNested({ each: true })
  @Type(() => PlanSettingDto)
  plans?: PlanSettingDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  graceDays?: number;

  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, { message: "bKash number must look like 01712345678" })
  bkashNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cashoutPerThousand?: number;

  @IsOptional()
  @IsBoolean()
  manualPaymentEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  bkashOnlineEnabled?: boolean;

  // 0 means no limit.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  customerLimit?: number;

  // 0 means no limit.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  appCustomerLimit?: number;

  // 0 means no limit.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  trialCustomerLimit?: number;

  // 0 means no limit.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  trialAppCustomerLimit?: number;
}
