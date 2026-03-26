"use client";

import { FormEvent, useEffect, useState } from "react";
import { Scissors, Plus, X, Save, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

export default function ClothTypesPage() {
  const [clothTypes, setClothTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState("");
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
        const result = await apiRequest<{ clothTypes: string[] }>(`/shops/${user.shopId}/catalog`, {}, token);
        setClothTypes(result.clothTypes ?? []);
      } finally {
        setLoading(false);
      }
    }
    void loadCatalog();
  }, [token, user?.shopId]);

  function addType() {
    const normalized = newType.trim();
    if (!normalized) return;
    if (clothTypes.includes(normalized)) { setNewType(""); return; }
    setClothTypes((prev) => [...prev, normalized]);
    setNewType("");
    setSaved(false);
  }

  function removeType(index: number) {
    setClothTypes((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!user?.shopId || !token) { setError("Please login first."); return; }
    try {
      await apiRequest(`/shops/${user.shopId}/catalog/cloth-types`, {
        method: "PUT",
        body: JSON.stringify({ clothTypes }),
      }, token);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cloth types");
    }
  }

  return (
    <section className="space-y-7">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Cloth Types</h2>
        <p className="mt-1 text-sm shop-quiet">Define the garment types your shop tailors — Shirt, Panjabi, Salwar, etc.</p>
      </div>

      <form onSubmit={onSave} className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5">

        {/* Add input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">New Cloth Type</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="e.g. Panjabi, Salwar, Kameez…"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addType(); } }}
            />
            <button
              type="button"
              onClick={addType}
              className="flex items-center gap-2 rounded-xl bg-teal/10 px-4 py-2.5 text-sm font-semibold text-teal transition hover:bg-teal/20"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">
            Cloth Types ({clothTypes.length})
          </label>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-20 rounded-full bg-ink/8 animate-pulse" />
              ))}
            </div>
          ) : clothTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 py-10 text-ink/35">
              <Scissors className="h-8 w-8 opacity-40" />
              <p className="text-sm">No cloth types yet. Add one above.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clothTypes.map((typeName, index) => (
                <span
                  key={`${typeName}-${index}`}
                  className="group flex items-center gap-1.5 rounded-full border border-ink/12 bg-white px-3.5 py-1.5 text-sm font-medium text-ink/70 transition hover:border-coral/30 hover:bg-coral/5"
                >
                  <Scissors className="h-3 w-3 text-teal/60 shrink-0" />
                  {typeName}
                  <button
                    type="button"
                    onClick={() => removeType(index)}
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
            Cloth types saved successfully.
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
            Save cloth types
          </button>
        </div>
      </form>
    </section>
  );
}
