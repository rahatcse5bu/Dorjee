import { IsOptional, IsString } from "class-validator";

export class ReviewPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
