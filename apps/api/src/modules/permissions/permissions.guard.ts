import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUser } from "../common/auth-user";
import { PermissionLevel, PermissionModule } from "./permissions.constants";
import { PermissionsService } from "./permissions.service";

export const PERMISSION_KEY = "requiredPermission";

type Requirement = [PermissionModule, PermissionLevel];

/**
 * Requires a module permission for the route's :shopId. Pass several
 * requirements to allow access when any one of them is met.
 */
export const RequirePermission = (...anyOf: Requirement[]) => SetMetadata(PERMISSION_KEY, anyOf);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const anyOf = this.reflector.getAllAndOverride<Requirement[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!anyOf || anyOf.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    const shopId = request.params.shopId as string;

    for (const [module, level] of anyOf) {
      if (await this.permissionsService.can(user, shopId, module, level)) return true;
    }
    throw new ForbiddenException("You don't have permission to do this");
  }
}
