import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminService } from "./admin.service";
import { UpdateShopLimitsDto } from "./dto/update-shop-limits.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("health")
  @Roles("super_admin", "admin_finance", "admin_support")
  health() {
    return { ok: true, system: "dorjee-admin" };
  }

  /** One shop's profile, subscription, staff, payments and usage numbers. */
  @Get("shops/:shopId")
  @Roles("super_admin", "admin_finance", "admin_support")
  shop(@Param("shopId") shopId: string) {
    return this.adminService.shopOverview(shopId);
  }

  /** Raise or lower one shop's customer limits; null returns to the platform setting. */
  @Put("shops/:shopId/limits")
  @Roles("super_admin", "admin_finance")
  updateLimits(@Param("shopId") shopId: string, @Body() dto: UpdateShopLimitsDto) {
    return this.adminService.updateShopLimits(shopId, dto);
  }
}
