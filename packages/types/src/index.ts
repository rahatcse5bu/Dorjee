export type UserRole =
  | "super_admin"
  | "admin_finance"
  | "admin_support"
  | "shop_owner"
  | "shop_staff"
  | "tailor"
  | "manager"
  | "accountant";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "pending"
  | "past_due"
  | "inactive"
  | "cancelled";

export interface Shop {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  ownerName: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  address?: string;
  measurements: Record<string, string | number>;
}

export interface Order {
  id: string;
  shopId: string;
  customerId: string;
  clothType: string;
  status:
    | "draft"
    | "confirmed"
    | "in_tailoring"
    | "ready"
    | "delivered"
    | "cancelled";
  amount: number;
  deliveryDate?: string;
}
