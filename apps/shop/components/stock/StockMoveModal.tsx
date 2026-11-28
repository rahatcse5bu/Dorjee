"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClipboardCheck, Minus, Plus } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { Material, MovementType, round2 } from "../../lib/inventory";
import { errorMessage } from "../../lib/session";
import { useToast } from "../Toast";
import { Alert, btnPrimary, btnSecondary, Field, inputClass, Modal } from "../ui";

const TITLE: Record<MovementType, TranslationKey> = { in: "stock.inTitle", out: "stock.useTitle", adjust: "stock.countTitle" };
const QTY: Record<MovementType, TranslationKey> = { in: "stock.qtyIn", out: "stock.qtyOut", adjust: "stock.qtyCount" };
const ICON = { in: Plus, out: Minus, adjust: ClipboardCheck };

/** Records stock coming in, being used, or a recount. */
export function StockMoveModal({
  material,
  type,
  shopId,
  token,
  showCost,
  onClose,
  onSaved,
}: {
  material: Material | null;
  type: MovementType;
  shopId: string;
  token: string | null;
  showCost: boolean;
  onClose: () => void;
  onSaved: (material: Material) => void;
}) {
  const { t, num, money } = useI18n();
  const toast = useToast();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!material) return;
    setQuantity(type === "adjust" ? String(material.quantity) : "");
    setNote("");
    setOrderNo("");
    setCost(material.costPerUnit != null ? String(material.costPerUnit) : "");
    setError("");
  }, [material, type]);

  if (!material) return null;
  const unit = t(`stock.unit.${material.unit}` as TranslationKey);
  const amount = Number(quantity);
  const valid = quantity.trim() !== "" && !Number.isNaN(amount) && amount >= 0;
  const after = !valid ? null : type === "in" ? round2(material.quantity + amount) : type === "out" ? round2(material.quantity - amount) : round2(amount);
  const Icon = ICON[type];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!material) return;
    setError("");
    setSaving(true);
    try {
      const result = await apiRequest<{ material: Material }>(
        `/shops/${shopId}/materials/${material._id}/movements`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            quantity: amount,
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(type === "out" && orderNo ? { orderNo: Number(orderNo) } : {}),
            ...(type === "in" && showCost && cost.trim() !== "" ? { costPerUnit: Number(cost) } : {}),
          }),
        },
        token,
      );
      toast(t("stock.saved"));
      onSaved(result.material);
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(TITLE[type], { name: material.name })}
      icon={Icon}
      size="sm"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="stock-move-form" className={btnPrimary} disabled={saving || !valid || (after !== null && after < 0)}>
            <Icon className="h-4 w-4" />
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="stock-move-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-ink/[0.04] px-3 py-2.5 text-sm">
          <span className="text-ink/60">{t("stock.inStock", { qty: `${num(material.quantity)} ${unit}` })}</span>
          {after !== null && (
            <span className={`font-semibold ${after < 0 ? "text-coral" : "text-ink"}`}>{t("stock.after", { qty: `${num(after)} ${unit}` })}</span>
          )}
        </div>
        <Field label={`${t(QTY[type])} (${unit})`}>
          <input
            type="number"
            inputMode="decimal"
            min={type === "adjust" ? 0 : 0.01}
            max={type === "out" ? material.quantity : undefined}
            step={0.01}
            className={`${inputClass} text-lg font-semibold`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
        {type === "out" && (
          <Field label={`${t("stock.orderNo")} (${t("common.optional")})`}>
            <input type="number" inputMode="numeric" min={1} step={1} className={inputClass} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="#" />
          </Field>
        )}
        {type === "in" && showCost && (
          <Field
            label={`${t("stock.costPer", { unit })} (${t("common.optional")})`}
            hint={valid && cost ? `= ${money(round2(amount * Number(cost)))}` : undefined}
          >
            <input type="number" inputMode="decimal" min={0} step={0.01} className={inputClass} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="৳" />
          </Field>
        )}
        <Field label={`${t("stock.note")} (${t("common.optional")})`}>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={type === "in" ? t("stock.notePlaceholder") : undefined} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </form>
    </Modal>
  );
}
