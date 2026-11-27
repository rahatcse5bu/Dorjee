"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Ruler, Send, Trash2 } from "lucide-react";
import { measurementValue } from "../../../components/customer/PortalBits";
import { useToast } from "../../../components/Toast";
import { Alert, btnIcon, btnPrimary, btnSecondary, cardClass, Field, inputClass, Skeleton } from "../../../components/ui";
import { useI18n } from "../../../lib/i18n";
import { PortalOrder, PortalOrderForm, portalRequest } from "../../../lib/customer-portal";
import { errorMessage } from "../../../lib/session";

interface Line {
  key: number;
  clothType: string;
  quantity: number;
  fabricSource: "" | "customer" | "shop";
  fabric: string;
  color: string;
  styleNotes: string;
}

let nextKey = 1;
const newLine = (clothType: string): Line => ({
  key: nextKey++,
  clothType,
  quantity: 1,
  fabricSource: "",
  fabric: "",
  color: "",
  styleNotes: "",
});

function tomorrow() {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CustomerNewOrderPage() {
  const router = useRouter();
  const toast = useToast();
  const { t, money, num } = useI18n();
  const [form, setForm] = useState<PortalOrderForm | null>(null);
  const [loadError, setLoadError] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const shopId = new URLSearchParams(window.location.search).get("shop") ?? "";
    portalRequest<PortalOrderForm>(`/shops/${encodeURIComponent(shopId)}/order-form`)
      .then((result) => {
        setForm(result);
        if (result.garments[0]) setLines([newLine(result.garments[0].clothType)]);
      })
      .catch((err) => setLoadError(errorMessage(err, t("common.somethingWrong"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const garments = useMemo(() => new Map((form?.garments ?? []).map((g) => [g.clothType, g])), [form]);
  const estimate = lines.reduce((sum, l) => sum + (garments.get(l.clothType)?.lastPrice ?? 0) * l.quantity, 0);
  const update = (key: number, change: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError("");
    setSending(true);
    try {
      const order = await portalRequest<PortalOrder>("/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: form.shop._id,
          items: lines.map((l) => ({
            clothType: l.clothType,
            quantity: l.quantity,
            ...(l.fabricSource ? { fabricSource: l.fabricSource } : {}),
            ...(l.fabric.trim() ? { fabric: l.fabric.trim() } : {}),
            ...(l.color.trim() ? { color: l.color.trim() } : {}),
            ...(l.styleNotes.trim() ? { styleNotes: l.styleNotes.trim() } : {}),
          })),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(deliveryDate ? { deliveryDate } : {}),
        }),
      });
      toast(t("my.placed"));
      router.replace(`/my/orders/${order._id}`);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
      setSending(false);
    }
  }

  const back = (
    <Link href="/my" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-teal">
      <ArrowLeft className="h-4 w-4" />
      {t("my.myOrders")}
    </Link>
  );

  if (loadError) {
    return (
      <div className="space-y-4">
        {back}
        <Alert>{loadError}</Alert>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {back}
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("my.newOrderTitle")}</h1>
        <p className="mt-1 text-sm text-ink/55">{t("my.newOrderSub", { shop: form.shop.name })}</p>
      </div>

      {!form.canOrder ? (
        <Alert>{form.blockedBy ? t(`my.block.${form.blockedBy}`) : form.message}</Alert>
      ) : (
        <>
          <Alert kind="info">{t("my.measuredOnly")}</Alert>

          {lines.map((line, index) => {
            const garment = garments.get(line.clothType);
            return (
              <section key={line.key} className={`${cardClass} space-y-4 p-4`}>
                <div className="flex items-end gap-2">
                  <Field label={`${t("my.items")} ${lines.length > 1 ? num(index + 1) : ""}`} className="flex-1">
                    <select className={inputClass} value={line.clothType} onChange={(e) => update(line.key, { clothType: e.target.value })}>
                      {form.garments.map((g) => (
                        <option key={g.clothType} value={g.clothType}>
                          {g.clothType}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {lines.length > 1 && (
                    <button type="button" className={`${btnIcon} mb-1 hover:text-coral`} aria-label={t("common.remove")} onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {garment && (
                  <details className="rounded-xl bg-ink/[0.03] px-3 py-2 text-sm">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-teal">
                      <Ruler className="h-3.5 w-3.5" />
                      {t("my.measurements")}
                      {garment.lastPrice > 0 && <span className="ml-auto font-medium text-ink/50">{t("my.lastPrice", { price: money(garment.lastPrice) })}</span>}
                    </summary>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      {Object.entries(garment.measurements).map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="text-ink/55">{label}</dt>
                          <dd className="font-semibold text-ink">{measurementValue(value, t)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("my.quantity")}>
                    <div className="flex items-center gap-2">
                      <button type="button" className={btnSecondary + " !px-3"} aria-label="−" onClick={() => update(line.key, { quantity: Math.max(1, line.quantity - 1) })}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-lg font-bold text-ink">{num(line.quantity)}</span>
                      <button type="button" className={btnSecondary + " !px-3"} aria-label="+" onClick={() => update(line.key, { quantity: Math.min(20, line.quantity + 1) })}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </Field>
                  <Field label={`${t("my.fabricWhose")} (${t("common.optional")})`}>
                    <div className="flex gap-2">
                      {(["customer", "shop"] as const).map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => update(line.key, { fabricSource: line.fabricSource === source ? "" : source })}
                          aria-pressed={line.fabricSource === source}
                          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                            line.fabricSource === source ? "border-teal bg-teal/[0.08] text-teal" : "border-ink/15 bg-white/80 text-ink/65 hover:border-ink/25"
                          }`}
                        >
                          {source === "customer" ? t("my.fabricCustomer") : t("my.fabricShop")}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={`${t("my.fabric")} (${t("common.optional")})`}>
                    <input className={inputClass} value={line.fabric} maxLength={80} onChange={(e) => update(line.key, { fabric: e.target.value })} />
                  </Field>
                  <Field label={`${t("my.color")} (${t("common.optional")})`}>
                    <input className={inputClass} value={line.color} maxLength={40} onChange={(e) => update(line.key, { color: e.target.value })} />
                  </Field>
                </div>
                <Field label={`${t("my.styleNotes")} (${t("common.optional")})`}>
                  <input className={inputClass} value={line.styleNotes} maxLength={500} placeholder={t("my.stylePlaceholder")} onChange={(e) => update(line.key, { styleNotes: e.target.value })} />
                </Field>
              </section>
            );
          })}

          {lines.length < 10 && (
            <button type="button" className={`${btnSecondary} w-full border-dashed`} onClick={() => setLines((prev) => [...prev, newLine(form.garments[0].clothType)])}>
              <Plus className="h-4 w-4" />
              {t("my.addGarment")}
            </button>
          )}

          <section className={`${cardClass} space-y-4 p-4`}>
            <Field label={`${t("my.wantBy")} (${t("common.optional")})`}>
              <input type="date" className={inputClass} min={tomorrow()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label={`${t("my.noteToShop")} (${t("common.optional")})`}>
              <textarea className={`${inputClass} min-h-[80px]`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </section>

          {error && <Alert>{error}</Alert>}

          <div className={`${cardClass} sticky bottom-3 flex items-center justify-between gap-3 p-3 shadow-lg backdrop-blur`}>
            <div className="pl-1">
              {estimate > 0 ? (
                <>
                  <p className="text-xs text-ink/50">{t("my.estTotal")}</p>
                  <p className="text-lg font-bold text-ink">{money(estimate)}</p>
                </>
              ) : (
                <p className="text-xs text-ink/50">{t("my.estimate")}</p>
              )}
            </div>
            <button type="submit" disabled={sending || lines.length === 0} className={`${btnPrimary} px-6 py-3`}>
              <Send className="h-4 w-4" />
              {sending ? t("my.placing") : t("my.placeOrder")}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
