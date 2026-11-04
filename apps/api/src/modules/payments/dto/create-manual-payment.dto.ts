import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { PLAN_CODES, PlanCode } from "../../subscriptions/plans";

export class CreateManualPaymentDto {
  // Only bKash Send Money is accepted for now.
  @IsOptional()
  @IsIn(["bkash_manual"])
  method?: "bkash_manual";

  /** The bKash number the money was sent from, e.g. 01712345678. */
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/[\s-]/g, "").replace(/^\+?88/, "") : value))
  @Matches(/^01[3-9]\d{8}$/, { message: "Enter a valid bKash number, e.g. 01712345678" })
  senderNumber!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  // Defaults to the monthly plan.
  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;
}
