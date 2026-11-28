"use client";

import { FormEvent, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { Material, MATERIAL_CATEGORIES, MATERIAL_UNITS, MaterialCategory, MaterialUnit } from "../../lib/inventory";
import { errorMessage } from "../../lib/session";
import { useToast } from "../Toast";
import { Alert, btnPrimary, btnSecondary, Field, inputClass, Modal } from "../ui";

const DEFAULT_UNIT: Record<MaterialCategory, MaterialUnit> = {
  fabric: "yard",
  lining: "yard",
  lace: "yard",
  thread: "reel",
  button: "piece",
  zipper: "piece",
  other: "piece",
};

const empty = {
  name: "",
  category: "fabric" as MaterialCategory,
  color: "",
  colorHex: "",
  unit: "yard" as MaterialUnit,
  quantity: "",
  lowStockAt: "",
  costPerUnit: "",
  supplier: "",
  notes: "",
};

/** Add a material, or edit one's details. Stock itself changes through Add stock / Use / Recount. */
export function MaterialFormModal({
  open,
  material,
  shopId,
  token,
  showCost,
  onClose,
  onSaved,
}: {
  open: boolean;
  material: Material | null;
  shopId: string;
  token: string | null;
  showCost: boolean;
  onClose: () => void;
  onSaved: (material: Material) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = !!material;

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      material
        ? {
            name: material.name,
            category: material.category,
            color: material.color ?? "",
            colorHex: material.colorHex ?? "",
            unit: material.unit,
            quantity: String(material.quantity),
            lowStockAt: material.lowStockAt != null ? String(material.lowStockAt) : "",
            costPerUnit: material.costPerUnit != null ? String(material.costPerUnit) : "",
            supplier: material.supplier ?? "",
            notes: material.notes ?? "",
          }
        : empty,
    );
  }, [open, material]);

  const set = <K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      color: form.color.trim(),
      unit: form.unit,
      lowStockAt: optionalNumber(form.lowStockAt),
      supplier: form.supplier.trim(),
      notes: form.notes.trim(),
    };
    if (form.colorHex || editing) body.colorHex = form.colorHex;
    if (showCost) body.costPerUnit = optionalNumber(form.costPerUnit);
    if (!editing) {
      body.quantity = Number(form.quantity || 0);
      // The create endpoint treats these as optional; leave empty ones out.
      for (const key of ["color", "supplier", "notes"]) if (!body[key]) delete body[key];
      for (const key of ["lowStockAt", "costPerUnit"]) if (body[key] === null) delete body[key];
    }
    try {
      const saved = await apiRequest<Material>(
        editing ? `/shops/${shopId}/materials/${material!._id}` : `/shops/${shopId}/materials`,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) },
        token,
      );
      toast(t(editing ? "stock.updated" : "stock.created"));
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSaving(false);
    }
  }

  const unitLabel = t(`stock.unit.${form.unit}` as TranslationKey);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(editing ? "stock.editTitle" : "stock.newTitle")}
      icon={Package}
      size="lg"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="material-form" className={btnPrimary} disabled={saving}>
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="material-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("stock.name")} className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("stock.namePlaceholder")} required maxLength={80} />
          </Field>
          <Field label={t("stock.category")}>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => {
                const category = e.target.value as MaterialCategory;
                // A sensible unit for the type, unless one was already chosen while editing.
                setForm((f) => ({ ...f, category, unit: editing ? f.unit : DEFAULT_UNIT[category] }));
              }}
            >
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`stock.cat.${c}` as TranslationKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("stock.unit")}>
            <select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value as MaterialUnit)}>
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`stock.unit.${u}` as TranslationKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${t("stock.color")} (${t("common.optional")})`}>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={t("stock.color")}
                value={form.colorHex || "#ffffff"}
                onChange={(e) => set("colorHex", e.target.value)}
                className="h-[42px] w-12 shrink-0 cursor-pointer rounded-xl border border-ink/15 bg-white p-1"
              />
              <input className={inputClass} value={form.color} onChange={(e) => set("color", e.target.value)} maxLength={40} />
            </div>
          </Field>
          {!editing && (
            <Field label={`${t("stock.opening")} (${unitLabel})`}>
              <input type="number" inputMode="decimal" min={0} step={0.01} className={inputClass} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" />
            </Field>
          )}
          <Field label={`${t("stock.lowAt")} (${unitLabel})`} hint={t("stock.lowAtHint")}>
            <input type="number" inputMode="decimal" min={0} step={0.01} className={inputClass} value={form.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} />
          </Field>
          {showCost && (
            <Field label={`${t("stock.costPer", { unit: unitLabel })} (${t("common.optional")})`}>
              <input type="number" inputMode="decimal" min={0} step={0.01} className={inputClass} value={form.costPerUnit} onChange={(e) => set("costPerUnit", e.target.value)} placeholder="৳" />
            </Field>
          )}
          <Field label={`${t("stock.supplier")} (${t("common.optional")})`}>
            <input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} maxLength={80} />
          </Field>
          <Field label={`${t("common.notes")} (${t("common.optional")})`} className="sm:col-span-2">
            <input className={inputClass} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
      </form>
    </Modal>
  );
}
