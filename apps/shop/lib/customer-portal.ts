import { apiRequest } from "./api";
import { getCustomerToken } from "./customer-auth";

export type Measurements = Record<string, string | number | boolean>;

export type OrderingBlock = "shop_unavailable" | "no_previous_order" | "no_measurements" | "too_many_pending";

export interface PortalShop {
  _id: string;
  name: string;
  phone: string;
  address: string | null;
}

export interface PortalLink {
  shop: PortalShop;
  customerName: string;
  canOrder: boolean;
  blockedBy: OrderingBlock | null;
  garments: Array<{ clothType: string; lastPrice: number }>;
}

export interface PortalMe {
  customer: { _id: string; phone: string; name: string };
  shops: PortalLink[];
}

export interface PortalGarment {
  clothType: string;
  lastPrice: number;
  measurements: Measurements;
}

export interface PortalOrderForm {
  shop: PortalShop;
  canOrder: boolean;
  blockedBy: OrderingBlock | null;
  message: string | null;
  garments: PortalGarment[];
}

export interface PortalOrderItem {
  clothType: string;
  quantity: number;
  price: number;
  measurements?: Measurements;
  fabricSource: "customer" | "shop" | null;
  fabric: string | null;
  color: string | null;
  colorHex: string | null;
  styleNotes: string | null;
}

export interface PortalOrder {
  _id: string;
  orderNo: number | null;
  shop: PortalShop | null;
  status: string;
  source: "shop" | "customer";
  customerNote: string | null;
  items: PortalOrderItem[];
  amount: number;
  discount: number;
  payable: number;
  paidAmount: number;
  due: number;
  payments?: Array<{ amount: number; method: string; paidAt: string }>;
  statusHistory?: Array<{ status: string; at: string }>;
  deliveryDate: string | null;
  createdAt: string | null;
  canCancel: boolean;
}

/** Calls the customer API with the signed-in customer's token. */
export function portalRequest<T>(path: string, options: RequestInit = {}) {
  return apiRequest<T>(`/customer${path}`, options, getCustomerToken());
}

export function portalOrderNo(order: Pick<PortalOrder, "_id" | "orderNo">) {
  return order.orderNo ? `#${String(order.orderNo).padStart(4, "0")}` : `#${order._id.slice(-6).toUpperCase()}`;
}

/** A customer request the shop hasn't confirmed yet. */
export function isPending(order: Pick<PortalOrder, "status" | "source">) {
  return order.status === "draft";
}
