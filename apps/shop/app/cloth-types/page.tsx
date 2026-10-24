"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Check, Plus, Ruler, Save, Scissors, Trash2 } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Alert, btnIcon, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Catalog, EMPTY_CATALOG, normalizeCatalog } from "../../lib/orders";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

const SUGGESTED_EN = ["Shirt", "Pant", "Panjabi", "Pajama", "Salwar", "Kameez", "Blouse", "Coat"];
const SUGGESTED_BN = ["শার্ট", "প্যান্ট", "পাঞ্জাবি", "পায়জামা", "সালোয়ার", "কামিজ", "ব্লাউজ", "কোট"];

export default function ClothTypesPage() {
  const { t, lang, num } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const canEdit = usePermissions().can("catalog", "manage");

  const [saved, setSaved] = useState<Catalog>(EMPTY_CATALOG);
  const [types, setTypes] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = normalizeCatalog(await apiRequest<Partial<Catalog>>(`/shops/${shopId}/catalog`, {}, token));
        setSaved(catalog);
        setTypes(catalog.clothTypes);
        setMapping(catalog.clothTypeMeasurements);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = saved.measurementLabels;
  const cleanMapping = (m: Record<string, string[]>) =>
    Object.fromEntries(types.filter((type) => m[type]?.length).map((type) => [type, labels.filter((l) => m[type].includes(l))]));
  const dirty =
    JSON.stringify(types) !== JSON.stringify(saved.clothTypes) ||
    JSON.stringify(cleanMapping(mapping)) !== JSON.stringify(cleanMapping(saved.clothTypeMeasurements));

  function addType(value: string) {
    const name = value.trim();
    if (!name) return;
    if (!types.some((type) => type.toLowerCase() === name.toLowerCase())) setTypes((prev) => [...prev, name]);
    setDraft("");
  }

  function removeType(type: string) {
    setTypes((prev) => prev.filter((t) => t !== type));
    setMapping(({ [type]: _removed, ...rest }) => rest);
  }

  function toggleLabel(type: string, label: string) {
    setMapping((prev) => {
      const current = prev[type] ?? [];
      const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
      return { ...prev, [type]: next };
    });
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const clothTypeMeasurements = cleanMapping(mapping);
      await apiRequest(
        `/shops/${shopId}/catalog/cloth-types`,
        { method: "PUT", body: JSON.stringify({ clothTypes: types, clothTypeMeasurements }) },
        token,
      );
      setSaved({ ...saved, clothTypes: types, clothTypeMeasurements });
      toast(t("clothTypes.saved"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSaving(false);
    }
  }

  const suggestions = (lang === "bn" ? SUGGESTED_BN : SUGGESTED_EN).filter(
    (s) => !types.some((type) => type.toLowerCase() === s.toLowerCase()),
  );

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("clothTypes.title")}
        subtitle={t("clothTypes.sub")}
        actions={
          <Link href="/measurements" className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline">
            <Ruler className="h-4 w-4" />
            {t("clothTypes.editLabels")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

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
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addType(draft);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addType(draft)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal/10 px-4 text-sm font-semibold text-teal hover:bg-teal/20"
                >
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </button>
              </div>
            </label>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
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
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : types.length === 0 ? (
          <div className={cardClass}>
            <EmptyState icon={Scissors} title={t("clothTypes.empty")} />
          </div>
        ) : (
          <>
            {labels.length === 0 && <Alert kind="info">{t("clothTypes.noLabels")}</Alert>}
            <div className="grid gap-4 md:grid-cols-2">
              {types.map((type) => {
                const selected = mapping[type] ?? [];
                const activeCount = labels.filter((l) => selected.includes(l)).length;
                return (
                  <div key={type} className={`${cardClass} p-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                          <Scissors className="h-4 w-4" />
                        </span>
                        {type}
                      </h2>
                      {canEdit && (
                        <button
                          type="button"
                          className={`${btnIcon} hover:bg-coral/10 hover:text-coral`}
                          aria-label={`${t("common.remove")} ${type}`}
                          onClick={() => removeType(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {labels.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-ink/55">
                            {t("clothTypes.measurementsFor")}
                            {activeCount > 0 && <span className="ml-1.5 font-medium text-teal">· {t("clothTypes.selectedCount", { n: num(activeCount) })}</span>}
                          </span>
                          {canEdit && (
                            <span className="flex gap-3">
                              <button type="button" className="font-medium text-teal hover:underline" onClick={() => setMapping((m) => ({ ...m, [type]: [...labels] }))}>
                                {t("clothTypes.selectAll")}
                              </button>
                              {activeCount > 0 && (
                                <button type="button" className="font-medium text-ink/50 hover:text-coral" onClick={() => setMapping((m) => ({ ...m, [type]: [] }))}>
                                  {t("clothTypes.clear")}
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {labels.map((label) => {
                            const on = selected.includes(label);
                            return (
                              <button
                                key={label}
                                type="button"
                                disabled={!canEdit}
                                aria-pressed={on}
                                onClick={() => toggleLabel(type, label)}
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border py-1.5 pl-2 pr-3 text-sm font-medium transition disabled:cursor-default ${
                                  on
                                    ? "border-teal bg-teal/10 text-teal"
                                    : "border-ink/15 bg-white text-ink/65 enabled:hover:border-teal/50 enabled:hover:bg-teal/5 enabled:hover:text-teal"
                                }`}
                              >
                                {/* Checkbox-style marker so it reads as selectable */}
                                <span
                                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                                    on ? "border-teal bg-teal text-white" : "border-ink/25 bg-white"
                                  }`}
                                >
                                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        {activeCount === 0 && canEdit && <p className="mt-2 text-xs text-amber-700">{t("clothTypes.usesAll")}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
