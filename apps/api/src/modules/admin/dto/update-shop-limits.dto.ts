import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Per-shop customer limits. A number overrides the platform setting (0 = no
 * limit); null goes back to the platform setting. Omitted fields are unchanged.
 */
export class UpdateShopLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  customerLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  appCustomerLimit?: number | null;
}
