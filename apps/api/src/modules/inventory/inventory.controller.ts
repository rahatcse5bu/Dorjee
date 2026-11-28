import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";
import { PermissionsService } from "../permissions/permissions.service";
import { CreateMaterialDto, StockMovementDto, UpdateMaterialDto } from "./dto/material.dto";
import { InventoryService } from "./inventory.service";

/** Raw-material stock: fabric, thread, buttons and the like. */
@Controller("shops/:shopId/materials")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly permissions: PermissionsService,
  ) {}

  /** Costs and stock value are money: only people who may see payments get them. */
  private seesMoney(user: AuthUser, shopId: string) {
    return this.permissions.can(user, shopId, "payments", "view");
  }

  private async present<T>(user: AuthUser, shopId: string, result: T): Promise<T> {
    if (await this.seesMoney(user, shopId)) return result;
    const strip = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(strip);
      if (value && typeof value === "object" && !(value instanceof Date) && !("_bsontype" in (value as object))) {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => key !== "costPerUnit" && key !== "stockValue")
            .map(([key, v]) => [key, strip(v)]),
        );
      }
      return value;
    };
    return strip(result) as T;
  }

  /** Someone who can't see costs can't set them either. */
  private async withoutCost<T extends { costPerUnit?: number | null }>(user: AuthUser, shopId: string, dto: T): Promise<T> {
    if (await this.seesMoney(user, shopId)) return dto;
    return { ...dto, costPerUnit: undefined };
  }

  @Get()
  @RequirePermission(["inventory", "view"])
  async list(@Param("shopId") shopId: string, @CurrentUser() user: AuthUser) {
    return this.present(user, shopId, await this.inventory.list(shopId));
  }

  @Get(":materialId")
  @RequirePermission(["inventory", "view"])
  async getOne(@Param("shopId") shopId: string, @Param("materialId") materialId: string, @CurrentUser() user: AuthUser) {
    return this.present(user, shopId, await this.inventory.findOne(shopId, materialId));
  }

  @Get(":materialId/movements")
  @RequirePermission(["inventory", "view"])
  async history(@Param("shopId") shopId: string, @Param("materialId") materialId: string, @CurrentUser() user: AuthUser) {
    return this.present(user, shopId, await this.inventory.history(shopId, materialId));
  }

  @Post()
  @RequirePermission(["inventory", "manage"])
  async create(@Param("shopId") shopId: string, @Body() dto: CreateMaterialDto, @CurrentUser() user: AuthUser) {
    const created = await this.inventory.create(shopId, await this.withoutCost(user, shopId, dto), user.sub);
    return this.present(user, shopId, created);
  }

  @Patch(":materialId")
  @RequirePermission(["inventory", "manage"])
  async update(
    @Param("shopId") shopId: string,
    @Param("materialId") materialId: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user: AuthUser,
  ) {
    const updated = await this.inventory.update(shopId, materialId, await this.withoutCost(user, shopId, dto));
    return this.present(user, shopId, updated);
  }

  @Post(":materialId/movements")
  @RequirePermission(["inventory", "manage"])
  async move(
    @Param("shopId") shopId: string,
    @Param("materialId") materialId: string,
    @Body() dto: StockMovementDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.inventory.move(shopId, materialId, await this.withoutCost(user, shopId, dto), user.sub);
    return this.present(user, shopId, result);
  }

  @Delete(":materialId")
  @RequirePermission(["inventory", "manage"])
  remove(@Param("shopId") shopId: string, @Param("materialId") materialId: string) {
    return this.inventory.remove(shopId, materialId);
  }
}
