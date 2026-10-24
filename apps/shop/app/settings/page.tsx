"use client";

import { FormEvent, useEffect, useState } from "react";
import { Mail, MapPin, Phone, Save, Settings2, Store, User } from "lucide-react";
import { useToast } from "../../components/Toast";
import { btnPrimary, cardClass, inputClass, PageHeader, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { errorMessage, useSession } from "../../lib/session";

interface ShopProfile {
  name: string;
  ownerName: string;
  phone: string;
  email?: string;
  address?: string;
}

const emptyShop: ShopProfile = { name: "", ownerName: "", phone: "", email: "", address: "" };

export default function SettingsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const [shop, setShop] = useState<ShopProfile>(emptyShop);
  const [saved, setSaved] = useState<ShopProfile>(emptyShop);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await apiRequest<ShopProfile>(`/shops/${shopId}`, {}, token);
        const profile = {
          name: result.name ?? "",
          ownerName: result.ownerName ?? "",
          phone: result.phone ?? "",
          email: result.email ?? "",
          address: result.address ?? "",
        };
        setShop(profile);
        setSaved(profile);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/shops/${shopId}`, { method: "PATCH", body: JSON.stringify(shop) }, token);
      setSaved(shop);
      toast(t("settings.updated"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(shop) !== JSON.stringify(saved);
  const fields = [
    { key: "name" as const, label: t("auth.shopName"), icon: Store, required: true, type: "text" },
    { key: "ownerName" as const, label: t("auth.ownerName"), icon: User, required: true, type: "text" },
    { key: "phone" as const, label: t("common.phone"), icon: Phone, required: true, type: "tel" },
    { key: "email" as const, label: t("common.email"), icon: Mail, required: false, type: "email" },
  ];

  return (
    <section className="space-y-5">
      <PageHeader title={t("settings.title")} subtitle={t("settings.sub")} />

      <form onSubmit={onSubmit} className={`${cardClass} space-y-5 p-5 sm:p-6`}>
        <div className="flex items-center gap-2.5 border-b border-ink/10 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Settings2 className="h-4 w-4" />
          </div>
          <p className="font-semibold text-ink">{t("settings.info")}</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, icon: Icon, required, type }) => (
              <label key={key} className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
                <input
                  className={inputClass}
                  type={type}
                  value={shop[key] ?? ""}
                  onChange={(e) => setShop((p) => ({ ...p, [key]: e.target.value }))}
                  required={required}
                />
              </label>
            ))}
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
            <MapPin className="h-3 w-3" />
            {t("common.address")}
          </span>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={shop.address ?? ""}
            onChange={(e) => setShop((p) => ({ ...p, address: e.target.value }))}
          />
        </label>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink/10 pt-4">
          {dirty && <span className="text-sm font-medium text-amber-700">{t("catalog.unsaved")}</span>}
          <button type="submit" className={btnPrimary} disabled={!dirty || saving}>
            <Save className="h-4 w-4" />
            {t("common.saveChanges")}
          </button>
        </div>
      </form>
    </section>
  );
}
