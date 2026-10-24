export type Measurements = Record<string, string | number>;

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  measurements?: Measurements;
  createdAt?: string;
}

export interface OrderItem {
  clothType: string;
  price: number;
  quantity: number;
  measurements?: Measurements;
}

export interface OrderPayment {
  _id: string;
  amount: number;
  method: string;
  note?: string;
  paidAt: string;
  receivedBy?: string | null;
}

export interface Order {
  _id: string;
  orderNo?: number;
  customerId: string;
  clothType?: string;
  orderItems?: OrderItem[];
  status: string;
  amount: number;
  discount?: number;
  paidAmount?: number;
  payments?: OrderPayment[];
  statusHistory?: Array<{ status: string; at: string; by?: string | null }>;
  deliveryDate?: string | null;
  assignedTo?: string | null;
  notes?: string;
  createdAt?: string;
}

export interface StaffMember {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  active?: boolean;
}

export const ORDER_STATUSES = [
  "draft",
  "confirmed",
  "in_tailoring",
  "ready",
  "delivered",
  "cancelled",
] as const;

/** Orders still being worked on (not finished, not cancelled). */
export const OPEN_STATUSES = ["draft", "confirmed", "in_tailoring", "ready"];

export const PAYMENT_METHODS = ["cash", "bkash", "nagad", "card", "other"] as const;

export const STATUS_STYLE: Record<string, { dot: string; badge: string }> = {
  draft: { dot: "bg-ink/30", badge: "bg-ink/[0.07] text-ink/70" },
  confirmed: { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200" },
  in_tailoring: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200" },
  ready: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" },
  delivered: { dot: "bg-teal", badge: "bg-teal/10 text-teal ring-1 ring-inset ring-teal/20" },
  cancelled: { dot: "bg-coral", badge: "bg-coral/10 text-coral ring-1 ring-inset ring-coral/20" },
};

export function formatOrderNo(order: Pick<Order, "_id" | "orderNo">) {
  return order.orderNo ? `#${String(order.orderNo).padStart(4, "0")}` : `#${order._id.slice(-6).toUpperCase()}`;
}

export function orderItems(order: Order): OrderItem[] {
  if (order.orderItems?.length) return order.orderItems;
  return [{ clothType: order.clothType ?? "—", price: order.amount, quantity: 1, measurements: {} }];
}

export function payable(order: Order) {
  return Math.max(order.amount - (order.discount ?? 0), 0);
}

export function dueAmount(order: Order) {
  if (order.status === "cancelled") return 0;
  return Math.max(payable(order) - (order.paidAmount ?? 0), 0);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Days from today until delivery; negative when overdue, null without a date. */
export function daysUntilDelivery(order: Order) {
  if (!order.deliveryDate) return null;
  const diff = startOfDay(new Date(order.deliveryDate)).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
}

export function isOverdue(order: Order) {
  const days = daysUntilDelivery(order);
  return days !== null && days < 0 && OPEN_STATUSES.includes(order.status);
}

/** Converts the editor's label/value rows into a measurements object. */
export function rowsToMeasurements(rows: Array<{ label: string; value: string }>): Measurements {
  return rows.reduce<Measurements>((acc, row) => {
    const label = row.label.trim();
    const raw = row.value.trim();
    if (!label || !raw) return acc;
    const num = Number(raw);
    acc[label] = Number.isNaN(num) ? raw : num;
    return acc;
  }, {});
}

/**
 * Builds editor rows: one per catalog label (pre-filled from `values`), then any
 * extra labels already present in `values`.
 */
export function measurementRows(labels: string[], values: Measurements = {}) {
  const rows = labels.map((label) => ({ label, value: values[label] !== undefined ? String(values[label]) : "" }));
  for (const [label, value] of Object.entries(values)) {
    if (!labels.includes(label)) rows.push({ label, value: String(value) });
  }
  return rows;
}
