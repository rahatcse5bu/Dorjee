"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, History, Minus, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { MaterialFormModal } from "../../components/stock/MaterialFormModal";
import { StockHistoryModal } from "../../components/stock/StockHistoryModal";
import { StockMoveModal } from "../../components/stock/StockMoveModal";
import { useToast } from "../../components/Toast";
import { Alert, btnIcon, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { Material, MATERIAL_CATEGORIES, MaterialCategory, MaterialList, MovementType } from "../../lib/inventory";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

const actionBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-teal/30 hover:text-teal disabled:opacity-40";

export default function StockPage() {
  const { t, num, money } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const { can } = usePermissions();
  const canManage = can("inventory", "manage");
  const showCost = can("payments");

  const [data, setData] = useState<MaterialList | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<MaterialCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [moving, setMoving] = useState<{ material: Material; type: MovementType } | null>(null);
  const [historyOf, setHistoryOf] = useState<Material | null>(null);

  async function load() {
    try {
      setData(await apiRequest<MaterialList>(`/shops/${shopId}/materials`, {}, token));
      setError("");
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saved changes come back from the API; re-read the list so the summary stays right.
  const onChanged = () => void load();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (m) =>
        (category === "all" || m.category === category) &&
        (!lowOnly || m.lowStock || m.outOfStock) &&
        (!q || [m.name, m.color, m.supplier].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data, category, query, lowOnly]);

  const usedCategories = useMemo(() => MATERIAL_CATEGORIES.filter((c) => data?.items.some((m) => m.category === c)), [data]);
  const attention = data?.items.filter((m) => m.lowStock || m.outOfStock).length ?? 0;

  async function remove(material: Material) {
    if (!window.confirm(t("stock.deleteConfirm", { name: material.name }))) return;
    try {
      await apiRequest(`/shops/${shopId}/materials/${material._id}`, { method: "DELETE" }, token);
      toast(t("stock.deleted"));
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  const unit = (m: Material) => t(`stock.unit.${m.unit}` as TranslationKey);

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("stock.title")}
        subtitle={t("stock.sub")}
        actions={
          canManage ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("stock.add")}
            </button>
          ) : undefined
        }
      />

      {error && <Alert>{error}</Alert>}

      {/* Summary */}
      {data && data.items.length > 0 && (
        <div className={`grid gap-3 ${showCost && data.summary.stockValue !== undefined ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
          {[
            { label: t("stock.items"), value: num(data.summary.count), tone: "text-ink" },
            { label: t("stock.lowCount"), value: num(data.summary.lowStock), tone: data.summary.lowStock ? "text-amber-700" : "text-ink" },
            { label: t("stock.outCount"), value: num(data.summary.outOfStock), tone: data.summary.outOfStock ? "text-coral" : "text-ink" },
            ...(showCost && data.summary.stockValue !== undefined ? [{ label: t("stock.value"), value: money(data.summary.stockValue), tone: "text-teal" }] : []),
          ].map((s) => (
            <div key={s.label} className={`${cardClass} px-4 py-3.5`}>
              <p className="text-xs font-medium text-ink/50">{s.label}</p>
              <p className={`mt-1 text-lg font-bold sm:text-2xl ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {attention > 0 && !lowOnly && (
        <button
          type="button"
          onClick={() => setLowOnly(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100/60"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {t("stock.lowBanner", { n: attention })}
          </span>
          <span className="font-semibold">{t("stock.lowOnly")} →</span>
        </button>
      )}

      {/* Filters */}
      {data && data.items.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input type="search" className={`${inputClass} pl-9`} placeholder={t("stock.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...usedCategories] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  category === c ? "bg-ink text-white" : "border border-ink/10 bg-white/70 text-ink/65 hover:text-ink"
                }`}
              >
                {c === "all" ? t("stock.all") : t(`stock.cat.${c}` as TranslationKey)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLowOnly((v) => !v)}
              aria-pressed={lowOnly}
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                lowOnly ? "bg-amber-500 text-white" : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("stock.lowOnly")}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className={`${cardClass} overflow-hidden`}>
        {!data && !error ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("stock.empty")}
            action={
              canManage ? (
                <button type="button" className={btnPrimary} onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  {t("stock.add")}
                </button>
              ) : undefined
            }
          />
        ) : items.length === 0 ? (
          <EmptyState icon={Search} title={t("stock.noMatch")} />
        ) : (
          <ul className="divide-y divide-ink/[0.07]">
            {items.map((m) => (
              <li key={m._id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-ink/10"
                    style={{ background: m.colorHex || "rgba(23,126,137,0.08)" }}
                    aria-hidden
                  >
                    {!m.colorHex && <Package className="h-4 w-4 text-teal" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{m.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/50">
                      {[t(`stock.cat.${m.category}` as TranslationKey), m.color, m.supplier].filter(Boolean).join(" · ")}
                      {showCost && m.costPerUnit != null && <> · {money(m.costPerUnit)}/{unit(m)}</>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-bold leading-tight ${m.outOfStock ? "text-coral" : m.lowStock ? "text-amber-700" : "text-ink"}`}>
                      {num(m.quantity)} <span className="text-sm font-semibold">{unit(m)}</span>
                    </p>
                    {(m.outOfStock || m.lowStock) && (
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.outOfStock ? "bg-coral/10 text-coral" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {m.outOfStock ? t("stock.out") : t("stock.low")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:pl-[52px]">
                  {canManage && (
                    <>
                      <button type="button" className={actionBtn} onClick={() => setMoving({ material: m, type: "in" })}>
                        <Plus className="h-3.5 w-3.5" />
                        {t("stock.in")}
                      </button>
                      <button type="button" className={actionBtn} disabled={m.quantity <= 0} onClick={() => setMoving({ material: m, type: "out" })}>
                        <Minus className="h-3.5 w-3.5" />
                        {t("stock.use")}
                      </button>
                      <button type="button" className={actionBtn} onClick={() => setMoving({ material: m, type: "adjust" })}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {t("stock.count")}
                      </button>
                    </>
                  )}
                  <button type="button" className={actionBtn} onClick={() => setHistoryOf(m)}>
                    <History className="h-3.5 w-3.5" />
                    {t("stock.history")}
                  </button>
                  {canManage && (
                    <span className="ml-auto flex gap-0.5">
                      <button type="button" className={btnIcon} aria-label={t("common.edit")} onClick={() => { setEditing(m); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className={`${btnIcon} hover:text-coral`} aria-label={t("common.delete")} onClick={() => void remove(m)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MaterialFormModal
        open={formOpen}
        material={editing}
        shopId={shopId}
        token={token}
        showCost={showCost}
        onClose={() => setFormOpen(false)}
        onSaved={onChanged}
      />
      <StockMoveModal
        material={moving?.material ?? null}
        type={moving?.type ?? "in"}
        shopId={shopId}
        token={token}
        showCost={showCost}
        onClose={() => setMoving(null)}
        onSaved={onChanged}
      />
      <StockHistoryModal material={historyOf} shopId={shopId} token={token} onClose={() => setHistoryOf(null)} />
    </section>
  );
}
