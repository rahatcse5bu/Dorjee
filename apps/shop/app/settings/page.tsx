"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings2, Save, AlertCircle, CheckCircle, Store, User, Phone, Mail, MapPin } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

interface ShopProfile {
  name: string;
  ownerName: string;
  phone: string;
  email?: string;
  address?: string;
}

export default function SettingsPage() {
  const [shop, setShop] = useState<ShopProfile>({
    name: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = getShopUser();
  const token = getShopToken();

  useEffect(() => {
    async function loadShop() {
      if (!user?.shopId || !token) return;
      setLoading(true);
      try {
        const result = await apiRequest<ShopProfile>(`/shops/${user.shopId}`, {}, token);
        setShop({
          name: result.name ?? "",
          ownerName: result.ownerName ?? "",
          phone: result.phone ?? "",
          email: result.email ?? "",
          address: result.address ?? "",
        });
      } finally {
        setLoading(false);
      }
    }
    void loadShop();
  }, [token, user?.shopId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user?.shopId || !token) { setError("Please login first."); return; }
    try {
      await apiRequest(`/shops/${user.shopId}`, {
        method: "PATCH",
        body: JSON.stringify(shop),
      }, token);
      setMessage("Shop details updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  const fields = [
    { key: "name" as const, label: "Shop Name", icon: Store, placeholder: "Your shop name", required: true, type: "text" },
    { key: "ownerName" as const, label: "Owner Name", icon: User, placeholder: "Your full name", required: true, type: "text" },
    { key: "phone" as const, label: "Phone", icon: Phone, placeholder: "01XXXXXXXXX", required: true, type: "text" },
    { key: "email" as const, label: "Email", icon: Mail, placeholder: "shop@email.com", required: false, type: "email" },
  ];

  return (
    <section className="space-y-7">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Shop Settings</h2>
        <p className="mt-1 text-sm shop-quiet">Update your shop profile, contact details, and operational information.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* Shop info card */}
        <div className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-ink/8 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <Settings2 className="h-4 w-4" />
            </div>
            <p className="font-semibold text-ink">Shop Information</p>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-ink/8 animate-pulse" />
                  <div className="h-10 rounded-xl bg-ink/6 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ key, label, icon: Icon, placeholder, required, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/50">
                    <Icon className="h-3 w-3" />
                    {label}
                  </label>
                  <input
                    className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                    type={type}
                    placeholder={placeholder}
                    value={shop[key] ?? ""}
                    onChange={(e) => setShop((p) => ({ ...p, [key]: e.target.value }))}
                    required={required}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Address */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/50">
              <MapPin className="h-3 w-3" />
              Address
            </label>
            <textarea
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15 resize-none"
              placeholder="Street address, city…"
              rows={3}
              value={shop.address ?? ""}
              onChange={(e) => setShop((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </form>
    </section>
  );
}
