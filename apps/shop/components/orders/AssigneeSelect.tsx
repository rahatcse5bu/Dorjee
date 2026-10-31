"use client";

import { TranslationKey, useI18n } from "../../lib/i18n";
import { StaffMember } from "../../lib/orders";
import { inputClass } from "../ui";

// Tailors first, since they do most of the work; the owner can take orders too.
const ROLE_ORDER = ["tailor", "shop_staff", "manager", "accountant", "shop_owner"];

/** Picks who an order is assigned to: any active member of the shop, grouped by role. */
export function AssigneeSelect({
  staff,
  value,
  onChange,
  disabled,
  className = inputClass,
  ariaLabel,
}: {
  staff: StaffMember[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const { t } = useI18n();
  // Disabled members can't receive new work, but a current assignee stays visible.
  const choices = staff.filter((member) => member.active !== false || member._id === value);
  const roles = [...ROLE_ORDER, ...new Set(choices.map((m) => m.role).filter((r) => !ROLE_ORDER.includes(r)))];

  return (
    <select
      className={className}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel ?? t("orderForm.assignTailor")}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t("common.unassigned")}</option>
      {roles.map((role) => {
        const members = choices.filter((m) => m.role === role);
        if (members.length === 0) return null;
        return (
          <optgroup key={role} label={t(`role.${role}` as TranslationKey)}>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name || member.email}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
