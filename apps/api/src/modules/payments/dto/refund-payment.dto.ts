import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class RefundPaymentDto {
  /** Taka to refund; defaults to everything not refunded yet. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amountBdt?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  /** Manual (Send Money) payments only: the TrxID of the money sent back to the shop. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  refundTrxId?: string;
}
