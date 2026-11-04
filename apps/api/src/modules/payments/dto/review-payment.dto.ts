import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewPaymentDto {
  /** The reviewer's note, e.g. why a payment was rejected. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  // Older name for the same note.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
