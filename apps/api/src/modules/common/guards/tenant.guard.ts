import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SubscriptionsService } from "../../subscriptions/subscriptions.service";
import { AuthUser } from "../auth-user";
import { SKIP_SUBSCRIPTION_KEY } from "../decorators/skip-subscription.decorator";

/**
 * Limits shop users to their own shop's data, and locks the shop once its trial
 * or paid period has ended (402) until a payment is approved. Admins pass.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const shopId = request.params.shopId ?? request.body?.shopId ?? request.query.shopId;

    if (!shopId || user.role.startsWith("admin") || user.role === "super_admin") {
      return true;
    }

    if (user.shopId !== shopId) {
      throw new ForbiddenException("You are not allowed to access this shop data");
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const access = await this.subscriptionsService.getAccess(shopId);
    if (access.locked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: "SUBSCRIPTION_REQUIRED",
          status: access.status,
          message: "Your subscription has ended. Pay for a plan to keep using Dorjee.",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }
}
