"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Ruler, Save, Scissors, Trash2, X } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Alert, btnIcon, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Catalog, labelsForType, normalizeCatalog } from "../../lib/orders";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

const SUGGESTED_EN = ["Shirt", "Pant", "Panjabi", "Pajama", "Salwar", "Kameez", "Blouse", "Coat"];
const SUGGESTED_BN = ["শার্ট", "প্যান্ট", "পাঞ্জাবি", "পায়জামা", "সালোয়ার", "কামিজ", "ব্লাউজ", "কোট"];

/** Each cloth type with the measurement names it owns. */
type Garments = Array<{ name: string; measurements: string[] }>;

function toGarments(catalog: Catalog): Garments {
  // A type without its own list starts with what orders show today (the shop-wide labels).
  return catalog.clothTypes.map((name) => ({ name, measurements: [...labelsForType(catalog, name)] }));
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function ClothTypesPage() {
  const { t, lang, num } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const canEdit = usePermissions().can("catalog", "manage");

  const [garments, setGarments] = useState<Garments>([]);
  const [baseline, setBaseline] = useState("");
  const [newType, setNewType] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = normalizeCatalog(await apiRequest<Partial<Catalog>>(`/shops/${shopId}/catalog`, {}, token));
        const initial = toGarments(catalog);
        setGarments(initial);
        setBaseline(JSON.stringify(initial));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = JSON.stringify(garments) !== baseline;

  // Every measurement name in use, so one garment can reuse another's in a click.
  const allNames = useMemo(() => {
    const names: string[] = [];
    for (const g of garments) for (const m of g.measurements) if (!names.some((n) => sameName(n, m))) names.push(m);
    return names;
  }, [garments]);

  function addType(value: string) {
    const name = value.trim();
    if (!name) return;
    if (!garments.some((g) => sameName(g.name, name))) setGarments((prev) => [...prev, { name, measurements: [] }]);
    setNewType("");
  }

  function addMeasurement(garment: string, value: string) {
    const label = value.trim();
    if (!label) return;
    const target = garments.find((g) => g.name === garment);
    if (target?.measurements.some((m) => sameName(m, label))) {
      toast(t("clothTypes.duplicate", { name: garment, label }), "error");
      return;
    }
    // Reuse the existing spelling when another garment already has this name.
    const canonical = allNames.find((n) => sameName(n, label)) ?? label;
    setGarments((prev) => prev.map((g) => (g.name === garment ? { ...g, measurements: [...g.measurements, canonical] } : g)));
    setDrafts((d) => ({ ...d, [garment]: "" }));
  }

  function removeMeasurement(garment: string, label: string) {
    setGarments((prev) =>
      prev.map((g) => (g.name === garment ? { ...g, measurements: g.measurements.filter((m) => m !== label) } : g)),
    );
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(
        `/shops/${shopId}/catalog/cloth-types`,
        {
          method: "PUT",
          body: JSON.stringify({
            clothTypes: garments.map((g) => g.name),
            clothTypeMeasurements: Object.fromEntries(garments.map((g) => [g.name, g.measurements])),
          }),
        },
        token,
      );
      setBaseline(JSON.stringify(garments));
      toast(t("clothTypes.saved"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSaving(false);
    }
  }

  const typeSuggestions = (lang === "bn" ? SUGGESTED_BN : SUGGESTED_EN).filter(
    (s) => !garments.some((g) => sameName(g.name, s)),
  );

  return (
    <section className="space-y-5">
      <PageHeader title={t("clothTypes.title")} subtitle={t("clothTypes.sub")} />

      {!canEdit && <Alert kind="info">{t("perm.readOnlyPage")}</Alert>}

      <form onSubmit={onSave} className="space-y-4">
        {canEdit && (
          <div className={`${cardClass} space-y-3 p-5`}>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-ink/60">{t("clothTypes.new")}</span>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder={t("clothTypes.placeholder")}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addType(newType);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addType(newType)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal/10 px-4 text-sm font-semibold text-teal hover:bg-teal/20"
                >
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </button>
              </div>
            </label>
            {typeSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {typeSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addType(s)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-teal/35 px-3 py-1 text-xs font-medium text-teal/80 hover:border-teal hover:bg-teal/5 hover:text-teal"
                  >
                    <Plus className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : garments.length === 0 ? (
          <div className={cardClass}>
            <EmptyState icon={Scissors} title={t("clothTypes.empty")} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {garments.map((garment) => {
              const suggestions = allNames.filter((n) => !garment.measurements.some((m) => sameName(m, n)));
              const draft = drafts[garment.name] ?? "";
              return (
                <div key={garment.name} className={`${cardClass} flex flex-col p-5`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                        <Scissors className="h-4 w-4" />
                      </span>
                      {garment.name}
                      <span className="text-xs font-normal text-ink/45">
                        · {t("clothTypes.measurementCount", { n: num(garment.measurements.length) })}
                      </span>
                    </h2>
                    {canEdit && (
                      <button
                        type="button"
                        className={`${btnIcon} hover:bg-coral/10 hover:text-coral`}
                        aria-label={`${t("common.remove")} ${garment.name}`}
                        onClick={() => setGarments((prev) => prev.filter((g) => g.name !== garment.name))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* This garment's own measurement names */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {garment.measurements.length === 0 ? (
                      <p className="text-sm text-amber-700">{t("clothTypes.noMeasurementsYet")}</p>
                    ) : (
                      garment.measurements.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/[0.07] py-1 pl-2.5 pr-1 text-sm font-medium text-ink"
                        >
                          <Ruler className="h-3.5 w-3.5 text-teal/70" />
                          {label}
                          {canEdit ? (
                            <button
                              type="button"
                              aria-label={`${t("common.remove")} ${label}`}
                              onClick={() => removeMeasurement(garment.name, label)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink/40 hover:bg-coral/15 hover:text-coral"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="w-1.5" />
                          )}
                        </span>
                      ))
                    )}
                  </div>

                  {canEdit && (
                    <div className="mt-auto space-y-2 pt-4">
                      <div className="flex gap-2">
                        <input
                          className={`${inputClass} py-2`}
                          placeholder={t("clothTypes.addMeasurement")}
                          aria-label={`${t("orderForm.addMeasurement")}: ${garment.name}`}
                          value={draft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [garment.name]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addMeasurement(garment.name, draft);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addMeasurement(garment.name, draft)}
                          disabled={!draft.trim()}
                          aria-label={t("common.add")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-teal/10 px-3 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                          {t("common.add")}
                        </button>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-ink/45">{t("clothTypes.suggestions")}</span>
                          {suggestions.slice(0, 10).map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => addMeasurement(garment.name, name)}
                              className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-ink/20 px-2 py-0.5 text-xs text-ink/60 hover:border-teal hover:text-teal"
                            >
                              <Plus className="h-3 w-3" />
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canEdit && (
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3">
            {dirty && <span className="rounded-lg bg-paper/90 px-2 py-1 text-sm font-medium text-amber-700">{t("catalog.unsaved")}</span>}
            <button type="submit" className={`${btnPrimary} shadow-lg`} disabled={!dirty || saving}>
              <Save className="h-4 w-4" />
              {t("clothTypes.save")}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
