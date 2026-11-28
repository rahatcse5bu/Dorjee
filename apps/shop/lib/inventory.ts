export const MATERIAL_CATEGORIES = ["fabric", "thread", "button", "lining", "zipper", "lace", "other"] as const;
export const MATERIAL_UNITS = ["yard", "meter", "piece", "reel", "packet", "dozen", "kg"] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];
export type MovementType = "in" | "out" | "adjust";

export interface Material {
  _id: string;
  name: string;
  category: MaterialCategory;
  color?: string | null;
  colorHex?: string | null;
  unit: MaterialUnit;
  quantity: number;
  lowStockAt?: number | null;
  /** Absent for users who can't see payments. */
  costPerUnit?: number | null;
  supplier?: string | null;
  notes?: string | null;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface MaterialList {
  items: Material[];
  summary: { count: number; lowStock: number; outOfStock: number; stockValue?: number };
}

export interface StockMovement {
  _id: string;
  type: MovementType;
  change: number;
  balance: number;
  note?: string;
  orderNo?: number | null;
  costPerUnit?: number | null;
  byName?: string | null;
  createdAt: string;
}

/** Quantities are kept to 2 decimals. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
