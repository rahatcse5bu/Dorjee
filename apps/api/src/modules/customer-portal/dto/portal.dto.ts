import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { FABRIC_SOURCES } from "../../orders/schemas/order.schema";

const PHONE_MESSAGE = "Enter a valid mobile number, e.g. 01712345678";
// Accepts 01XXXXXXXXX with an optional +88 / 88 prefix, spaces or dashes.
const PHONE_INPUT = /^(\+?88)?[\s-]*01[3-9](?:[\s-]*\d){8}$/;

export class CustomerLoginDto {
  @IsString()
  @Matches(PHONE_INPUT, { message: PHONE_MESSAGE })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class CustomerJoinDto {
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;

  @IsString()
  @Matches(PHONE_INPUT, { message: PHONE_MESSAGE })
  phone!: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(128)
  password!: string;

  // Only used when the phone has no account yet; defaults to the shop's name for the customer.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class CustomerLinkDto {
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;
}

export class CustomerOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  clothType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @IsOptional()
  @IsIn(FABRIC_SOURCES)
  fabricSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fabric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  styleNotes?: string;
}

export class PlaceCustomerOrderDto {
  @IsMongoId()
  shopId!: string;

  @ValidateNested({ each: true })
  @Type(() => CustomerOrderItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  items!: CustomerOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // The date the customer would like it by; the shop can change it.
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
