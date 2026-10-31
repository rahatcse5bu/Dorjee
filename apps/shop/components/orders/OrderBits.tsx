"use client";

import { useI18n } from "../../lib/i18n";
import { daysUntilDelivery, hasFabricDetails, OPEN_STATUSES, Order, OrderItem, ORDER_STATUSES } from "../../lib/orders";
import { StatusBadge } from "../ui";

export function DeliveryLabel({ order }: { order: Order }) {
  const { t, date } = useI18n();
  const days = daysUntilDelivery(order);
  if (days === null) return <span className="text-ink/35">{t("common.noDate")}</span>;
  const open = OPEN_STATUSES.includes(order.status);
  const overdue = open && days < 0;
  const soon = open && days >= 0 && days <= 2;
  const relative =
    days === 0 ? t("common.today") : days === 1 ? t("common.tomorrow") : days > 1 ? t("common.inDays", { n: days }) : t("common.daysLate", { n: -days });
  return (
    <span className="flex flex-col">
      <span className={overdue ? "font-semibold text-coral" : "text-ink/80"}>{date(order.deliveryDate)}</span>
      {open && (
        <span className={`text-xs ${overdue ? "text-coral" : soon ? "font-medium text-amber-700" : "text-ink/45"}`}>
          {relative}
        </span>
      )}
    </span>
  );
}

export function StatusSelect({ order, onChange }: { order: Order; onChange: (status: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="relative inline-flex">
      <StatusBadge status={order.status} />
      <select
        aria-label={t("order.changeStatus")}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={order.status}
        onChange={(e) => onChange(e.target.value)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Fabric source, fabric, colour and style notes for one order item. */
export function ItemFabricDetails({ item, variant = "screen" }: { item: OrderItem; variant?: "screen" | "print" }) {
  const { t } = useI18n();
  if (!hasFabricDetails(item)) return null;
  const pill = variant === "print" ? "border border-ink/30 px-2 py-0.5" : "bg-paper px-2.5 py-1";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink/75">
        {item.fabricSource && (
          <span className={`rounded-md font-semibold ${pill} ${variant === "screen" ? "text-teal" : ""}`}>
            {t(item.fabricSource === "customer" ? "item.source.customer" : "item.source.shop")}
          </span>
        )}
        {item.fabric && (
          <span className={`rounded-md ${pill}`}>
            {t("item.fabric")}: <span className="font-semibold text-ink">{item.fabric}</span>
          </span>
        )}
        {(item.color || item.colorHex) && (
          <span className={`inline-flex items-center gap-1.5 rounded-md ${pill}`}>
            {item.colorHex && (
              <span className="h-3 w-3 rounded-full border border-ink/20" style={{ backgroundColor: item.colorHex }} />
            )}
            {t("item.color")}: <span className="font-semibold text-ink">{item.color || item.colorHex}</span>
          </span>
        )}
      </div>
      {item.styleNotes && (
        <p className="text-xs text-ink/70">
          <span className="font-semibold">{t("item.styleNotes")}:</span> {item.styleNotes}
        </p>
      )}
    </div>
  );
}
