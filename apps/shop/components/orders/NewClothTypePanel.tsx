"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Ruler, Shirt, ToggleRight, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Catalog, labelsForType, normalizeCatalog } from "../../lib/orders";
import { errorMessage, useSession } from "../../lib/session";
import { useToast } from "../Toast";
import { btnIcon, btnPrimary, btnSecondary, inputClass } from "../ui";

type Kind = "number" | "boolean";

/**
 * Adds a cloth type and its measurements from inside the order form, so the shop
 * doesn't have to leave the order to visit the cloth types page.
 */
export function NewClothTypePanel({
  catalog,
  onCreated,
  onCancel,
}: {
  catalog: Catalog;
  /** Called with the saved catalog and the new type's name. */
  onCreated: (catalog: Catalog, clothType: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { token, shopId } = useSession();
  const toast = useToast();

  const [name, setName] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  // Kinds for labels new to the shop; labels used elsewhere keep their shop-wide kind.
  const [newKinds, setNewKinds] = useState<Record<string, Kind>>({});
  const [draft, setDraft] = useState("");
  const [draftKind, setDraftKind] = useState<Kind>("number");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const known = useMemo(() => {
    const all = new Set(catalog.measurementLabels);
    for (const type of catalog.clothTypes) labelsForType(catalog, type).forEach((l) => all.add(l));
    return [...all];
  }, [catalog]);

  const kindOf = (label: string): Kind =>
    known.includes(label)
      ? catalog.booleanMeasurements.includes(label) ? "boolean" : "number"
      : newKinds[label] ?? "number";

  function add(label: string, kind: Kind = draftKind) {
    const clean = label.trim();
    if (!clean || labels.includes(clean)) return;
    setLabels((prev) => [...prev, clean]);
    if (!known.includes(clean)) setNewKinds((prev) => ({ ...prev, [clean]: kind }));
  }

  function remove(label: string) {
    setLabels((prev) => prev.filter((l) => l !== label));
  }

  function toggleKind(label: string) {
    setNewKinds((prev) => ({ ...prev, [label]: kindOf(label) === "boolean" ? "number" : "boolean" }));
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    const clothType = name.trim();
    if (!clothType) return setError(t("quickType.errName"));
    // A label typed but not yet added is almost certainly meant to be included.
    const finalLabels = draft.trim() && !labels.includes(draft.trim()) ? [...labels, draft.trim()] : labels;
    const finalKinds = { ...newKinds };
    if (draft.trim() && !known.includes(draft.trim()) && !finalKinds[draft.trim()]) finalKinds[draft.trim()] = draftKind;

    setSaving(true);
    setError("");
    try {
      // Merge into the latest catalog so edits made elsewhere aren't overwritten.
      const latest = normalizeCatalog(await apiRequest<Partial<Catalog>>(`/shops/${shopId}/catalog`, {}, token));
      if (latest.clothTypes.some((type) => type.toLowerCase() === clothType.toLowerCase())) {
        setError(t("quickType.errExists", { name: clothType }));
        return;
      }
      const clothTypes = [...latest.clothTypes, clothType];
      const clothTypeMeasurements = Object.fromEntries(clothTypes.map((type) => [type, labelsForType(latest, type)]));
      clothTypeMeasurements[clothType] = finalLabels;
      const booleans = new Set(latest.booleanMeasurements);
      for (const label of finalLabels) if (finalKinds[label] === "boolean") booleans.add(label);

      await apiRequest(
        `/shops/${shopId}/catalog/cloth-types`,
        {
          method: "PUT",
          body: JSON.stringify({ clothTypes, clothTypeMeasurements, booleanMeasurements: [...booleans] }),
        },
        token,
      );
      const saved = normalizeCatalog(await apiRequest<Partial<Catalog>>(`/shops/${shopId}/catalog`, {}, token));
      toast(t("quickType.saved", { name: clothType }));
      onCreated(saved, clothType);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSaving(false);
    }
  }

  const suggestions = known.filter((l) => !labels.includes(l));

  return (
    <div className="mb-3 rounded-xl border border-teal/30 bg-white p-3 shadow-sm" role="group" aria-label={t("quickType.title")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Shirt className="h-4 w-4 text-teal" />
          {t("quickType.title")}
        </span>
        <button type="button" onClick={onCancel} className={`${btnIcon} h-7 w-7`} aria-label={t("common.cancel")}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-ink/55">{t("quickType.name")}</span>
        <input
          autoFocus
          className={inputClass}
          placeholder={t("clothTypes.placeholder")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
      </label>

      <div className="mt-3">
        <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink/55">
          <Ruler className="h-3.5 w-3.5" />
          {t("quickType.measurements")}
        </span>

        {labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const yesNo = kindOf(label) === "boolean";
              const fixed = known.includes(label);
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-1 pr-2 text-xs font-medium ${
                    yesNo ? "border-amber-300 bg-amber-50 text-amber-800" : "border-teal/30 bg-teal/5 text-teal"
                  }`}
                >
                  <button
                    type="button"
                    disabled={fixed}
                    onClick={() => toggleKind(label)}
                    title={fixed ? undefined : t("clothTypes.toggleKind", { label })}
                    aria-label={t("clothTypes.toggleKind", { label })}
                    className="rounded-full p-0.5 enabled:hover:bg-black/5 disabled:cursor-default"
                  >
                    {yesNo ? <ToggleRight className="h-3.5 w-3.5" /> : <Ruler className="h-3.5 w-3.5" />}
                  </button>
                  {label}
                  <button type="button" onClick={() => remove(label)} aria-label={t("common.remove")} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-ink/15" role="radiogroup" aria-label={t("quickType.kind")}>
            {(["number", "boolean"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={draftKind === kind}
                onClick={() => setDraftKind(kind)}
                className={`px-2.5 py-1.5 text-xs font-semibold transition ${
                  draftKind === kind ? (kind === "boolean" ? "bg-amber-500 text-white" : "bg-teal text-white") : "bg-white text-ink/60"
                }`}
              >
                {t(kind === "number" ? "clothTypes.kindNumber" : "clothTypes.kindYesNo")}
              </button>
            ))}
          </div>
          <input
            className={`${inputClass} order-first min-w-0 basis-full py-1.5 sm:order-none sm:basis-0 sm:flex-1`}
            placeholder={t("clothTypes.addMeasurement")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
                setDraft("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              add(draft);
              setDraft("");
            }}
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("common.add")}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink/45">{t("clothTypes.suggestions")}</span>
            {suggestions.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => add(label)}
                className={`rounded-full border border-dashed px-2 py-0.5 text-[11px] font-medium transition ${
                  catalog.booleanMeasurements.includes(label)
                    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                    : "border-ink/20 text-ink/60 hover:border-teal/40 hover:text-teal"
                }`}
              >
                + {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${btnSecondary} px-3 py-1.5 text-sm`}>
          {t("common.cancel")}
        </button>
        <button type="button" onClick={() => save()} disabled={saving} className={`${btnPrimary} px-3 py-1.5 text-sm`}>
          {saving ? t("common.saving") : t("quickType.save")}
        </button>
      </div>
    </div>
  );
}
