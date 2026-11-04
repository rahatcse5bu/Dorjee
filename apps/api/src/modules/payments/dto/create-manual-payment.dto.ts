import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PLAN_CODES, PlanCode } from "../../subscriptions/plans";

export class CreateManualPaymentDto {
  @IsEnum(["bkash_manual", "nagad_manual"])
  method!: "bkash_manual" | "nagad_manual";

  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  // Defaults to the monthly plan.
  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;
}
