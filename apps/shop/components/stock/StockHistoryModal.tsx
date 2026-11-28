"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { Material, StockMovement } from "../../lib/inventory";
import { errorMessage } from "../../lib/session";
import { Alert, EmptyState, Modal, Skeleton } from "../ui";

const TONE = { in: "text-emerald-700", out: "text-coral", adjust: "text-amber-700" } as const;

export function StockHistoryModal({
  material,
  shopId,
  token,
  onClose,
}: {
  material: Material | null;
  shopId: string;
  token: string | null;
  onClose: () => void;
}) {
  const { t, num, money, date } = useI18n();
  const [items, setItems] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!material) return;
    setItems(null);
    setError("");
    apiRequest<StockMovement[]>(`/shops/${shopId}/materials/${material._id}/movements`, {}, token)
      .then(setItems)
      .catch((err) => setError(errorMessage(err, t("common.somethingWrong"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?._id]);

  if (!material) return null;
  const unit = t(`stock.unit.${material.unit}` as TranslationKey);

  return (
    <Modal open onClose={onClose} title={t("stock.historyTitle", { name: material.name })} icon={History} size="md">
      {error && <Alert>{error}</Alert>}
      {!items && !error && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {items && items.length === 0 && <EmptyState icon={History} title={t("stock.noHistory")} />}
      {items && items.length > 0 && (
        <ul className="divide-y divide-ink/[0.07]">
          {items.map((m) => (
            <li key={m._id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {t(`stock.type.${m.type}` as TranslationKey)}
                  {m.orderNo ? <span className="ml-2 font-mono text-xs font-medium text-ink/50">{t("stock.forOrder", { no: m.orderNo })}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {date(m.createdAt)} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {m.byName && <> · {m.byName}</>}
                </p>
                {(m.note || m.costPerUnit != null) && (
                  <p className="mt-0.5 text-xs text-ink/60">
                    {m.note}
                    {m.note && m.costPerUnit != null && " · "}
                    {m.costPerUnit != null && `${money(m.costPerUnit)}/${unit}`}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold ${TONE[m.type]}`}>
                  {m.change > 0 ? "+" : "−"}
                  {num(Math.abs(m.change))} {unit}
                </p>
                <p className="text-xs text-ink/45">{t("stock.balance", { qty: `${num(m.balance)} ${unit}` })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
