import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateManualPaymentDto {
  @IsEnum(["bkash_manual", "nagad_manual"])
  method!: "bkash_manual" | "nagad_manual";

  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}
