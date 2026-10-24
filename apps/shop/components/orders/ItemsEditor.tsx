"use client";

import { Plus, Ruler, Scissors, Trash2 } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { measurementRows, Measurements, OrderItem, rowsToMeasurements } from "../../lib/orders";
import { btnIcon, inputClass } from "../ui";

export interface DraftItem {
  clothType: string;
  price: string;
  quantity: string;
  rows: Array<{ label: string; value: string }>;
}

export function newDraftItem(clothType: string, labels: string[], saved?: Measurements): DraftItem {
  return { clothType, price: "", quantity: "1", rows: measurementRows(labels, saved) };
}

export function itemToDraft(item: OrderItem, labels: string[]): DraftItem {
  return {
    clothType: item.clothType,
    price: String(item.price),
    quantity: String(item.quantity || 1),
    rows: measurementRows(labels, item.measurements),
  };
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
  clothTypes,
  measurementLabels,
  savedMeasurements,
  prefillHint = true,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  clothTypes: string[];
  measurementLabels: string[];
  /** The customer's saved measurements, used to pre-fill new items. */
  savedMeasurements?: Measurements;
  /** Shows the "filled from saved measurements" note; off when editing an existing order. */
  prefillHint?: boolean;
}) {
  const { t, money } = useI18n();
  const hasSaved = !!savedMeasurements && Object.keys(savedMeasurements).length > 0;

  function update(index: number, patch: Partial<DraftItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
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
                    onClick={() => update(index, { clothType: type })}
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
                  onChange={(e) => update(index, { clothType: e.target.value })}
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
                {prefillHint && hasSaved && <span className="text-[11px] font-medium text-teal">{t("orderForm.prefilled")}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {item.rows.map((row, rowIndex) => {
                  const isCatalogLabel = measurementLabels.includes(row.label);
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
          onChange([...items, newDraftItem(clothTypes[0] ?? "", measurementLabels, savedMeasurements)])
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
