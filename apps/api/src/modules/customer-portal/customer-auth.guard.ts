import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { CustomerAccount, CustomerAccountDocument } from "./schemas/customer-account.schema";

/**
 * Customer tokens are signed with their own key, so they can never pass the
 * staff JwtAuthGuard, and staff tokens can never pass this guard.
 */
export function customerTokenSecret() {
  return `${process.env.JWT_ACCESS_SECRET ?? "change_me_access"}:customer-app`;
}

export const CUSTOMER_TOKEN_TTL = "30d";

export interface CustomerTokenPayload {
  sub: string;
  kind: "customer";
}

export type SignedInCustomer = { _id: string; phone: string; name: string };

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(CustomerAccount.name) private readonly accountModel: Model<CustomerAccountDocument>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header: string = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    let payload: CustomerTokenPayload;
    try {
      payload = this.jwtService.verify<CustomerTokenPayload>(token, { secret: customerTokenSecret() });
    } catch {
      throw new UnauthorizedException("Please sign in again");
    }
    if (payload.kind !== "customer" || !isValidObjectId(payload.sub)) {
      throw new UnauthorizedException("Please sign in again");
    }
    const account = await this.accountModel.findById(payload.sub).select("phone name active").lean();
    if (!account || account.active === false) {
      throw new UnauthorizedException("Please sign in again");
    }
    request.customer = { _id: String(account._id), phone: account.phone, name: account.name } satisfies SignedInCustomer;
    return true;
  }
}

export const CurrentCustomer = createParamDecorator(
  (_: unknown, context: ExecutionContext): SignedInCustomer => context.switchToHttp().getRequest().customer,
);
