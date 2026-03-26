"use client";

import { FormEvent, useEffect, useState } from "react";
import { Ruler, Plus, X, Save, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

export default function MeasurementsPage() {
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = getShopUser();
  const token = getShopToken();

  useEffect(() => {
    async function loadCatalog() {
      if (!user?.shopId || !token) return;
      setLoading(true);
      try {
        const result = await apiRequest<{ measurementLabels: string[] }>(`/shops/${user.shopId}/catalog`, {}, token);
        setLabels(result.measurementLabels ?? []);
      } finally {
        setLoading(false);
      }
    }
    void loadCatalog();
  }, []);

  function addLabel() {
    const normalized = newLabel.trim();
    if (!normalized) return;
    if (labels.includes(normalized)) { setNewLabel(""); return; }
    setLabels((prev) => [...prev, normalized]);
    setNewLabel("");
    setSaved(false);
  }

  function removeLabel(index: number) {
    setLabels((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!user?.shopId || !token) { setError("Please login first."); return; }
    try {
      await apiRequest(`/shops/${user.shopId}/catalog/measurements`, {
        method: "PUT",
        body: JSON.stringify({ measurementLabels: labels }),
      }, token);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  const SUGGESTED = ["Chest", "Shoulder", "Sleeve", "Collar", "Length", "Waist", "Hip", "Inseam"];
  const suggestions = SUGGESTED.filter((s) => !labels.includes(s));

  return (
    <section className="space-y-7">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Measurement Labels</h2>
        <p className="mt-1 text-sm shop-quiet">Define standard labels used when recording customer measurements.</p>
      </div>

      <form onSubmit={onSave} className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5">

        {/* Add input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">New Label</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="e.g. Chest, Shoulder, Sleeve…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
            />
            <button
              type="button"
              onClick={addLabel}
              className="flex items-center gap-2 rounded-xl bg-teal/10 px-4 py-2.5 text-sm font-semibold text-teal transition hover:bg-teal/20"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Quick-add suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Quick Add</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setLabels((p) => [...p, s]); setSaved(false); }}
                  className="flex items-center gap-1 rounded-full border border-dashed border-teal/30 px-3 py-1 text-xs font-medium text-teal/70 transition hover:border-teal hover:bg-teal/5 hover:text-teal"
                >
                  <Plus className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">
            Labels ({labels.length})
          </label>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-20 rounded-full bg-ink/8 animate-pulse" />
              ))}
            </div>
          ) : labels.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 py-10 text-ink/35">
              <Ruler className="h-8 w-8 opacity-40" />
              <p className="text-sm">No labels yet. Add one above or use quick add.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {labels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="group flex items-center gap-1.5 rounded-full border border-ink/12 bg-white px-3.5 py-1.5 text-sm font-medium text-ink/70 transition hover:border-coral/30 hover:bg-coral/5"
                >
                  <Ruler className="h-3 w-3 text-brass/60 shrink-0" />
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(index)}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-ink/30 transition hover:bg-coral/20 hover:text-coral"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Measurement labels saved successfully.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end border-t border-ink/8 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90"
          >
            <Save className="h-4 w-4" />
            Save labels
          </button>
        </div>
      </form>
    </section>
  );
}
