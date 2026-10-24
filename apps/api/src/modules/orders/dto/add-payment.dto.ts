import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PAYMENT_METHODS } from "../schemas/order.schema";

export class AddPaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsIn(PAYMENT_METHODS)
  method!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
