import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuthUser } from "../common/auth-user";
import { Shop, ShopDocument } from "../shops/schemas/shop.schema";
import {
  CONFIGURABLE_ROLES,
  ConfigurableRole,
  DEFAULT_PERMISSIONS,
  FULL_ACCESS,
  meetsLevel,
  PERMISSION_LEVELS,
  PERMISSION_MODULES,
  PermissionLevel,
  PermissionMatrix,
  PermissionModule,
  RolePermissions,
} from "./permissions.constants";

@Injectable()
export class PermissionsService {
  constructor(@InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>) {}

  /** The shop's permission matrix: stored overrides merged over the defaults. */
  async getMatrix(shopId: string): Promise<PermissionMatrix> {
    const shop = await this.shopModel.findById(shopId).select("rolePermissions").lean();
    const stored = (shop?.rolePermissions ?? {}) as Partial<Record<string, Partial<RolePermissions>>>;

    const matrix = {} as PermissionMatrix;
    for (const role of CONFIGURABLE_ROLES) {
      matrix[role] = { ...DEFAULT_PERMISSIONS[role] };
      for (const module of PERMISSION_MODULES) {
        const level = stored[role]?.[module];
        if (level && (PERMISSION_LEVELS as readonly string[]).includes(level)) {
          matrix[role][module] = level;
        }
      }
    }
    return matrix;
  }

  /** What one user can do in a shop. Owners and platform admins have full access. */
  async forUser(user: AuthUser, shopId: string): Promise<RolePermissions> {
    if (this.hasFullAccess(user)) return { ...FULL_ACCESS };
    if (!(CONFIGURABLE_ROLES as readonly string[]).includes(user.role)) {
      return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, "none"])) as RolePermissions;
    }
    const matrix = await this.getMatrix(shopId);
    return matrix[user.role as ConfigurableRole];
  }

  async can(user: AuthUser, shopId: string, module: PermissionModule, level: PermissionLevel) {
    if (this.hasFullAccess(user)) return true;
    const permissions = await this.forUser(user, shopId);
    return meetsLevel(permissions[module], level);
  }

  async updateMatrix(shopId: string, roles: Partial<Record<string, Partial<RolePermissions>>>) {
    const current = await this.getMatrix(shopId);
    for (const role of CONFIGURABLE_ROLES) {
      for (const module of PERMISSION_MODULES) {
        const level = roles[role]?.[module];
        if (level && (PERMISSION_LEVELS as readonly string[]).includes(level)) {
          current[role][module] = level;
        }
      }
    }
    await this.shopModel.updateOne({ _id: shopId }, { $set: { rolePermissions: current } });
    return current;
  }

  private hasFullAccess(user: AuthUser) {
    return user.role === "shop_owner" || user.role === "super_admin" || user.role.startsWith("admin");
  }
}
