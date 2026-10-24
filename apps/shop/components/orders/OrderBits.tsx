"use client";

import { useI18n } from "../../lib/i18n";
import { daysUntilDelivery, OPEN_STATUSES, Order, ORDER_STATUSES } from "../../lib/orders";
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
