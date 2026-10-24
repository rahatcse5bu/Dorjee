import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { UpdatePermissionsDto } from "./dto/update-permissions.dto";
import { CONFIGURABLE_ROLES, PERMISSION_LEVELS, PERMISSION_MODULES, RolePermissions } from "./permissions.constants";
import { PermissionsService } from "./permissions.service";

@Controller("shops/:shopId/permissions")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** The full role matrix plus the caller's own effective permissions. */
  @Get()
  async get(@Param("shopId") shopId: string, @CurrentUser() user: AuthUser) {
    return {
      modules: PERMISSION_MODULES,
      levels: PERMISSION_LEVELS,
      roles: CONFIGURABLE_ROLES,
      matrix: await this.permissionsService.getMatrix(shopId),
      mine: await this.permissionsService.forUser(user, shopId),
    };
  }

  @Put()
  @Roles("shop_owner")
  async update(@Param("shopId") shopId: string, @Body() dto: UpdatePermissionsDto) {
    const matrix = await this.permissionsService.updateMatrix(
      shopId,
      dto.roles as Partial<Record<string, Partial<RolePermissions>>>,
    );
    return { matrix };
  }
}
