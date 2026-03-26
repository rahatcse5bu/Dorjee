import { UserRole } from "@dorjee/types";

export interface AuthUser {
  sub: string;
  role: UserRole;
  shopId?: string;
}
