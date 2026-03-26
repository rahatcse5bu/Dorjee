import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthUser } from "../auth-user";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const shopId = request.params.shopId ?? request.body.shopId ?? request.query.shopId;

    if (!shopId || user.role.startsWith("admin") || user.role === "super_admin") {
      return true;
    }

    if (user.shopId !== shopId) {
      throw new ForbiddenException("You are not allowed to access this shop data");
    }

    return true;
  }
}
