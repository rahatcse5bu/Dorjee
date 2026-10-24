import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { SubscriptionsService } from "./subscriptions.service";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";

@Controller("shops/:shopId/subscription")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequirePermission(["subscription", "view"])
  getOne(@Param("shopId") shopId: string) {
    return this.subscriptionsService.getByShopId(shopId);
  }
}
