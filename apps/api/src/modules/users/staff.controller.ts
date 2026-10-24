import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CreateStaffDto, UpdateStaffDto } from "./dto/staff.dto";
import { UsersService } from "./users.service";
import { PermissionsGuard, RequirePermission } from "../permissions/permissions.guard";

@Controller("shops/:shopId/staff")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly usersService: UsersService) {}

  // Every shop member can see the team (names are needed to show and pick assignees).
  @Get()
  list(@Param("shopId") shopId: string) {
    return this.usersService.listByShop(shopId);
  }

  @Post()
  @RequirePermission(["staff", "manage"])
  async create(
    @Param("shopId") shopId: string,
    @Body() dto: CreateStaffDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    this.assertCanGrantRole(currentUser, dto.role);
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      shopId,
      name: dto.name,
      phone: dto.phone,
    });
    return this.usersService.findInShop(shopId, user.id);
  }

  @Patch(":userId")
  @RequirePermission(["staff", "manage"])
  async update(
    @Param("shopId") shopId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const target = await this.assertManageable(shopId, userId, currentUser);
    if (dto.role && dto.role !== target.role) this.assertCanGrantRole(currentUser, dto.role);
    if (userId === currentUser.sub && dto.active === false) {
      throw new BadRequestException("You cannot disable your own account");
    }

    const { password, ...fields } = dto;
    return this.usersService.updateInShop(shopId, userId, {
      ...fields,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    });
  }

  @Delete(":userId")
  @RequirePermission(["staff", "manage"])
  async remove(
    @Param("shopId") shopId: string,
    @Param("userId") userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    await this.assertManageable(shopId, userId, currentUser);
    if (userId === currentUser.sub) {
      throw new BadRequestException("You cannot remove your own account");
    }
    await this.usersService.removeFromShop(shopId, userId);
    return { success: true };
  }

  private assertCanGrantRole(currentUser: AuthUser, role: string) {
    if (currentUser.role !== "shop_owner" && role === "manager") {
      throw new ForbiddenException("Only the shop owner can add managers");
    }
  }

  private async assertManageable(shopId: string, userId: string, currentUser: AuthUser) {
    const target = await this.usersService.findInShop(shopId, userId);
    if (!target) {
      throw new NotFoundException("Staff member not found");
    }
    if (target.role === "shop_owner") {
      throw new ForbiddenException("The shop owner account cannot be changed here");
    }
    if (currentUser.role !== "shop_owner" && target.role === "manager" && target._id.toString() !== currentUser.sub) {
      throw new ForbiddenException("Only the shop owner can change managers");
    }
    return target;
  }
}
