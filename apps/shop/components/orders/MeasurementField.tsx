"use client";

import { Check, X } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { inputClass } from "../ui";

/**
 * The value input for one measurement: a number box, or a Yes / No switch for
 * yes/no measurements. Yes/no values are "true" / "false" ("" = not set).
 */
export function MeasurementInput({
  value,
  onChange,
  boolean,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  boolean: boolean;
  label: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  if (!boolean) {
    return (
      <input
        className={`${inputClass} py-2`}
        inputMode="decimal"
        disabled={disabled}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const options = [
    { v: "true", text: t("measure.yes"), Icon: Check, on: "bg-teal text-white" },
    { v: "false", text: t("measure.no"), Icon: X, on: "bg-ink/70 text-white" },
  ];
  return (
    <div className="flex h-[38px] overflow-hidden rounded-xl ring-1 ring-inset ring-ink/15" role="radiogroup" aria-label={label}>
      {options.map(({ v, text, Icon, on }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            // Tapping the chosen answer again clears it.
            onClick={() => onChange(active ? "" : v)}
            className={`flex flex-1 items-center justify-center gap-1 text-xs font-semibold transition disabled:opacity-60 ${
              active ? on : "bg-white text-ink/55 hover:text-teal"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Shows a saved measurement value: numbers localised, booleans as Yes / No. */
export function MeasurementValue({ value }: { value: string | number | boolean }) {
  const { t, num } = useI18n();
  if (typeof value === "boolean") {
    return (
      <span className={`inline-flex items-center gap-1 ${value ? "text-teal" : "text-ink/55"}`}>
        {value ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {t(value ? "measure.yes" : "measure.no")}
      </span>
    );
  }
  return <>{typeof value === "number" ? num(value) : value}</>;
}
