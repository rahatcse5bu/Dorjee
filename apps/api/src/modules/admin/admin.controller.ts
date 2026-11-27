import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminService } from "./admin.service";

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
}
