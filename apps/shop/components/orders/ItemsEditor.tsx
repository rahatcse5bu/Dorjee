"use client";

import { Plus, Ruler, Scissors, Trash2 } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import {
  Catalog,
  Customer,
  labelsForType,
  measurementRows,
  OrderItem,
  rowsToMeasurements,
  savedForType,
} from "../../lib/orders";
import { btnIcon, inputClass } from "../ui";

export interface DraftItem {
  clothType: string;
  price: string;
  quantity: string;
  rows: Array<{ label: string; value: string }>;
}

/** A new item for a cloth type, pre-filled with the customer's saved measurements for it. */
export function newDraftItem(catalog: Catalog, customer: Customer | null | undefined, clothType: string): DraftItem {
  return {
    clothType,
    price: "",
    quantity: "1",
    rows: measurementRows(labelsForType(catalog, clothType), savedForType(catalog, customer, clothType)),
  };
}

export function itemToDraft(item: OrderItem, catalog: Catalog): DraftItem {
  return {
    clothType: item.clothType,
    price: item.price === undefined ? "" : String(item.price),
    quantity: String(item.quantity || 1),
    rows: measurementRows(labelsForType(catalog, item.clothType), item.measurements),
  };
}

/**
 * Switches an item to another cloth type: shows that type's measurements, keeping
 * values the user typed for labels both types share and the item's custom rows.
 */
function retarget(item: DraftItem, clothType: string, catalog: Catalog, customer?: Customer | null): DraftItem {
  const oldLabels = labelsForType(catalog, item.clothType);
  const newLabels = labelsForType(catalog, clothType);
  if (oldLabels.join("|") === newLabels.join("|")) return { ...item, clothType };

  // Only values the user entered travel across; pre-filled ones are replaced by the
  // new garment's saved values (a shirt's Length is not a pant's Length).
  const oldSaved = savedForType(catalog, customer, item.clothType);
  const typed = Object.fromEntries(
    item.rows
      .filter((r) => r.value.trim() !== "" && r.value !== String(oldSaved[r.label] ?? ""))
      .map((r) => [r.label, r.value]),
  );
  const values = { ...savedForType(catalog, customer, clothType) };
  for (const label of newLabels) if (typed[label] !== undefined) values[label] = typed[label];
  const customRows = item.rows.filter((r) => !oldLabels.includes(r.label) && !newLabels.includes(r.label));
  return { ...item, clothType, rows: [...measurementRows(newLabels, values), ...customRows] };
}

export type ItemValidationError = "orderForm.errItems" | "orderForm.errClothType" | "orderForm.errPrice" | "orderForm.errQty";

/** Converts editor drafts into API items, or returns the first validation problem. */
export function draftsToItems(drafts: DraftItem[]): OrderItem[] | ItemValidationError {
  if (drafts.length === 0) return "orderForm.errItems";
  const items: OrderItem[] = [];
  for (const draft of drafts) {
    const clothType = draft.clothType.trim();
    const price = draft.price.trim() === "" ? NaN : Number(draft.price);
    const quantity = Number(draft.quantity || 1);
    if (!clothType) return "orderForm.errClothType";
    if (Number.isNaN(price) || price < 0) return "orderForm.errPrice";
    if (!Number.isInteger(quantity) || quantity < 1) return "orderForm.errQty";
    items.push({ clothType, price, quantity, measurements: rowsToMeasurements(draft.rows) });
  }
  return items;
}

export function draftsTotal(drafts: DraftItem[]) {
  return drafts.reduce((sum, d) => sum + (Number(d.price) || 0) * (Number(d.quantity) || 1), 0);
}

export function ItemsEditor({
  items,
  onChange,
  catalog,
  customer,
  prefillHint = true,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  catalog: Catalog;
  /** The order's customer; their saved measurements pre-fill new items. */
  customer?: Customer | null;
  /** Shows the "filled from saved measurements" note; off when editing an existing order. */
  prefillHint?: boolean;
}) {
  const { t, money } = useI18n();
  const clothTypes = catalog.clothTypes;

  function update(index: number, patch: Partial<DraftItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function changeType(index: number, clothType: string) {
    onChange(items.map((item, i) => (i === index ? retarget(item, clothType, catalog, customer) : item)));
  }

  function updateRow(index: number, rowIndex: number, patch: Partial<{ label: string; value: string }>) {
    const item = items[index];
    update(index, { rows: item.rows.map((row, r) => (r === rowIndex ? { ...row, ...patch } : row)) });
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        return (
          <div key={index} className="rounded-xl border border-ink/10 bg-paper/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
                <Scissors className="h-3.5 w-3.5 text-teal" />
                {t("orderForm.item", { n: index + 1 })}
              </span>
              <div className="flex items-center gap-2">
                {lineTotal > 0 && <span className="text-sm font-semibold text-ink">{money(lineTotal)}</span>}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                    className={`${btnIcon} h-8 w-8 hover:bg-coral/10 hover:text-coral`}
                    aria-label={t("common.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cloth type chips for one-tap selection */}
            {clothTypes.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {clothTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeType(index, type)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      item.clothType === type
                        ? "border-teal bg-teal text-white"
                        : "border-ink/15 bg-white text-ink/70 hover:border-teal/40 hover:text-teal"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-6 gap-2">
              <label className="col-span-6 sm:col-span-3">
                <span className="sr-only">{t("orderForm.clothType")}</span>
                <input
                  className={inputClass}
                  placeholder={t("orderForm.clothType")}
                  list="dorjee-cloth-types"
                  value={item.clothType}
                  onChange={(e) => changeType(index, e.target.value)}
                />
              </label>
              <label className="col-span-4 sm:col-span-2">
                <span className="sr-only">{t("orderForm.price")}</span>
                <input
                  className={inputClass}
                  placeholder={t("orderForm.price")}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={item.price}
                  onChange={(e) => update(index, { price: e.target.value })}
                />
              </label>
              <label className="col-span-2 sm:col-span-1">
                <span className="sr-only">{t("orderForm.qty")}</span>
                <input
                  className={inputClass}
                  placeholder={t("orderForm.qty")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => update(index, { quantity: e.target.value })}
                />
              </label>
            </div>

            {/* Measurements */}
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                  <Ruler className="h-3.5 w-3.5" />
                  {t("orderForm.measurements")}
                </span>
                {prefillHint && Object.keys(savedForType(catalog, customer, item.clothType)).length > 0 && <span className="text-[11px] font-medium text-teal">{t("orderForm.prefilled")}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {item.rows.map((row, rowIndex) => {
                  const isCatalogLabel = labelsForType(catalog, item.clothType).includes(row.label);
                  return (
                    <div key={rowIndex} className="relative">
                      {isCatalogLabel ? (
                        <label className="block">
                          <span className="mb-1 block truncate text-[11px] font-medium text-ink/55">{row.label}</span>
                          <input
                            className={`${inputClass} py-2`}
                            inputMode="decimal"
                            value={row.value}
                            onChange={(e) => updateRow(index, rowIndex, { value: e.target.value })}
                          />
                        </label>
                      ) : (
                        <div className="space-y-1">
                          <input
                            className="w-full border-0 border-b border-dashed border-ink/20 bg-transparent px-0 py-0 text-[11px] font-medium text-ink/55 focus:ring-0"
                            placeholder={t("orderForm.measurementLabel")}
                            value={row.label}
                            onChange={(e) => updateRow(index, rowIndex, { label: e.target.value })}
                          />
                          <div className="flex gap-1">
                            <input
                              className={`${inputClass} py-2`}
                              placeholder={t("orderForm.measurementValue")}
                              value={row.value}
                              onChange={(e) => updateRow(index, rowIndex, { value: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => update(index, { rows: item.rows.filter((_, r) => r !== rowIndex) })}
                              className={`${btnIcon} h-auto w-8 hover:text-coral`}
                              aria-label={t("common.remove")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => update(index, { rows: [...item.rows, { label: "", value: "" }] })}
                  className="flex min-h-[58px] items-center justify-center gap-1 rounded-xl border border-dashed border-ink/20 text-xs font-medium text-ink/50 transition hover:border-teal/40 hover:text-teal"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("orderForm.addMeasurement")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          onChange([...items, newDraftItem(catalog, customer, clothTypes[0] ?? "")])
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal/40 py-3 text-sm font-medium text-teal transition hover:border-teal hover:bg-teal/5"
      >
        <Plus className="h-4 w-4" />
        {t("orderForm.addItem")}
      </button>

      <datalist id="dorjee-cloth-types">
        {clothTypes.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
    </div>
  );
}
