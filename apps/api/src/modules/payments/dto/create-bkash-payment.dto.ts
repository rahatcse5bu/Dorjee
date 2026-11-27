import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { PLAN_CODES, PlanCode } from "../../subscriptions/plans";

export class CreateBkashPaymentDto {
  // Defaults to the monthly plan.
  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;

  /** The shop app's origin (e.g. https://dorjee.shop), where bKash sends the user back to. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnOrigin?: string;
}
