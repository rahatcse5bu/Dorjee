export const PERMISSION_MODULES = [
  "orders",
  "customers",
  "payments",
  "staff",
  "catalog",
  "settings",
  "subscription",
  "reports",
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_LEVELS = ["none", "view", "manage"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/** Roles whose permissions the shop owner can configure. The owner always has full access. */
export const CONFIGURABLE_ROLES = ["manager", "shop_staff", "tailor", "accountant"] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export type RolePermissions = Record<PermissionModule, PermissionLevel>;
export type PermissionMatrix = Record<ConfigurableRole, RolePermissions>;

export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  manager: {
    orders: "manage",
    customers: "manage",
    payments: "manage",
    staff: "manage",
    catalog: "manage",
    settings: "manage",
    subscription: "none",
    reports: "view",
  },
  shop_staff: {
    orders: "manage",
    customers: "manage",
    payments: "manage",
    staff: "none",
    catalog: "view",
    settings: "none",
    subscription: "none",
    reports: "none",
  },
  tailor: {
    orders: "view",
    customers: "view",
    payments: "none",
    staff: "none",
    catalog: "view",
    settings: "none",
    subscription: "none",
    reports: "none",
  },
  accountant: {
    orders: "view",
    customers: "view",
    payments: "manage",
    staff: "none",
    catalog: "none",
    settings: "none",
    subscription: "view",
    reports: "view",
  },
};

export const FULL_ACCESS: RolePermissions = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [m, "manage"]),
) as RolePermissions;

const RANK: Record<PermissionLevel, number> = { none: 0, view: 1, manage: 2 };

export function meetsLevel(actual: PermissionLevel | undefined, required: PermissionLevel) {
  return RANK[actual ?? "none"] >= RANK[required];
}
