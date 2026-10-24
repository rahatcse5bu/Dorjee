"use client";

import { FormEvent, useEffect, useState } from "react";
import { LucideIcon, Plus, Save, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TranslationKey, useI18n } from "../lib/i18n";
import { usePermissions } from "../lib/permissions";
import { errorMessage, useSession } from "../lib/session";
import { useToast } from "./Toast";
import { Alert, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton } from "./ui";

/** Edits one of the shop catalog's string lists (measurement labels or cloth types). */
export function CatalogListEditor({
  field,
  endpoint,
  icon: Icon,
  suggestions = [],
  keys,
}: {
  field: "measurementLabels" | "clothTypes";
  endpoint: "measurements" | "cloth-types";
  icon: LucideIcon;
  suggestions?: string[];
  keys: {
    title: TranslationKey;
    sub: TranslationKey;
    newLabel: TranslationKey;
    placeholder: TranslationKey;
    list: TranslationKey;
    empty: TranslationKey;
    saved: TranslationKey;
    save: TranslationKey;
  };
}) {
  const { t, num } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const canEdit = usePermissions().can("catalog", "manage");
  const [values, setValues] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await apiRequest<Record<string, string[]>>(`/shops/${shopId}/catalog`, {}, token);
        setValues(catalog[field] ?? []);
        setSaved(catalog[field] ?? []);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function add(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    if (!values.some((v) => v.toLowerCase() === normalized.toLowerCase())) {
      setValues((prev) => [...prev, normalized]);
    }
    setDraft("");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(
        `/shops/${shopId}/catalog/${endpoint}`,
        { method: "PUT", body: JSON.stringify({ [field]: values }) },
        token,
      );
      setSaved(values);
      toast(t(keys.saved));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSaving(false);
    }
  }

  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <section className="space-y-5">
      <PageHeader title={t(keys.title)} subtitle={t(keys.sub)} />

      {!canEdit && <Alert kind="info">{t("perm.readOnlyPage")}</Alert>}

      <form onSubmit={onSave} className={`${cardClass} space-y-5 p-5 sm:p-6`}>
        {canEdit && (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-ink/60">{t(keys.newLabel)}</span>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder={t(keys.placeholder)}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(draft);
                }
              }}
            />
            <button
              type="button"
              onClick={() => add(draft)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal/10 px-4 text-sm font-semibold text-teal hover:bg-teal/20"
            >
              <Plus className="h-4 w-4" />
              {t("common.add")}
            </button>
          </div>
        </label>
        )}

        {canEdit && remaining.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink/50">{t("measurements.quickAdd")}</p>
            <div className="flex flex-wrap gap-2">
              {remaining.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-teal/35 px-3 py-1 text-xs font-medium text-teal/80 hover:border-teal hover:bg-teal/5 hover:text-teal"
                >
                  <Plus className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">{t(keys.list, { n: num(values.length) })}</p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          ) : values.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/15">
              <EmptyState icon={Icon} title={t(keys.empty)} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-white py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-ink/80"
                >
                  <Icon className="h-3 w-3 shrink-0 text-teal/60" />
                  {value}
                  {canEdit && (
                  <button
                    type="button"
                    onClick={() => setValues((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`${t("common.remove")} ${value}`}
                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-ink/35 hover:bg-coral/15 hover:text-coral"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink/10 pt-4">
          {dirty && <span className="text-sm font-medium text-amber-700">{t("catalog.unsaved")}</span>}
          <button type="submit" className={btnPrimary} disabled={!dirty || saving}>
            <Save className="h-4 w-4" />
            {t(keys.save)}
          </button>
        </div>
        )}
      </form>
    </section>
  );
}
