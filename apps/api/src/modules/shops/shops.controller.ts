import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CreateShopDto } from "./dto/create-shop.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";
import { ShopsService } from "./shops.service";

@Controller("shops")
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  create(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "admin_finance", "admin_support")
  list() {
    return this.shopsService.list();
  }

  @Get(":shopId")
  @UseGuards(JwtAuthGuard, TenantGuard)
  getOne(@Param("shopId") shopId: string) {
    return this.shopsService.findOne(shopId);
  }

  @Patch(":shopId")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermission(["settings", "manage"])
  update(@Param("shopId") shopId: string, @Body() payload: UpdateShopDto) {
    return this.shopsService.update(shopId, payload);
  }
}
