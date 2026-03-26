import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("shops/:shopId/subscription")
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  getOne(@Param("shopId") shopId: string) {
    return this.subscriptionsService.getByShopId(shopId);
  }
}
