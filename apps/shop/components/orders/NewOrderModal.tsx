"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Check, PackagePlus, Search, UserPlus, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Customer, Measurements, Order, PAYMENT_METHODS, StaffMember } from "../../lib/orders";
import { errorMessage, useSession } from "../../lib/session";
import { Alert, btnPrimary, btnSecondary, Field, inputClass, Modal } from "../ui";
import { DraftItem, draftsToItems, draftsTotal, ItemsEditor, newDraftItem } from "./ItemsEditor";

interface Catalog {
  clothTypes: string[];
  measurementLabels: string[];
}

function defaultDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function NewOrderModal({
  open,
  onClose,
  onCreated,
  presetCustomer,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
  presetCustomer?: Customer | null;
}) {
  const { t, money, num } = useI18n();
  const { token, shopId } = useSession();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({ clothTypes: [], measurementLabels: [] });
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const [items, setItems] = useState<DraftItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [assignedTo, setAssignedTo] = useState("");
  const [discount, setDiscount] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [saveToProfile, setSaveToProfile] = useState(true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset and load reference data each time the modal opens.
  useEffect(() => {
    if (!open || !shopId) return;
    setError("");
    setQuery("");
    setAddingCustomer(false);
    setDeliveryDate(defaultDeliveryDate());
    setAssignedTo("");
    setDiscount("");
    setAdvance("");
    setAdvanceMethod("cash");
    setNotes("");
    setSaveToProfile(true);

    void (async () => {
      try {
        const [catalogResult, customerResult, staffResult] = await Promise.all([
          apiRequest<Catalog>(`/shops/${shopId}/catalog`, {}, token),
          presetCustomer ? Promise.resolve([]) : apiRequest<Customer[]>(`/shops/${shopId}/customers`, {}, token),
          apiRequest<StaffMember[]>(`/shops/${shopId}/staff`, {}, token).catch(() => []),
        ]);
        const nextCatalog = {
          clothTypes: catalogResult.clothTypes ?? [],
          measurementLabels: catalogResult.measurementLabels ?? [],
        };
        setCatalog(nextCatalog);
        setCustomers(customerResult);
        setStaff(staffResult.filter((member) => member.active !== false));
        selectCustomer(presetCustomer ?? null, nextCatalog);
      } catch (err) {
        setError(errorMessage(err, t("common.somethingWrong")));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 6);
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
      .slice(0, 6);
  }, [customers, query]);

  function selectCustomer(next: Customer | null, cat: Catalog = catalog) {
    setCustomer(next);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setItems([newDraftItem(cat.clothTypes[0] ?? "", cat.measurementLabels, next?.measurements)]);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectCustomer(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  async function createCustomer() {
    setError("");
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      setError(t("orderForm.errCustomer"));
      return;
    }
    try {
      const created = await apiRequest<Customer>(
        `/shops/${shopId}/customers`,
        { method: "POST", body: JSON.stringify({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() }) },
        token,
      );
      setCustomers((prev) => [created, ...prev]);
      setAddingCustomer(false);
      setNewCustomer({ name: "", phone: "" });
      selectCustomer(created);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    }
  }

  const subtotal = draftsTotal(items);
  const discountValue = Number(discount) || 0;
  const payableAmount = Math.max(subtotal - discountValue, 0);
  const advanceValue = Number(advance) || 0;
  const dueValue = Math.max(payableAmount - advanceValue, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!customer) {
      setError(t("orderForm.errCustomer"));
      return;
    }
    const parsed = draftsToItems(items);
    if (typeof parsed === "string") {
      setError(t(parsed));
      return;
    }

    setSubmitting(true);
    try {
      const order = await apiRequest<Order>(
        `/shops/${shopId}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            customerId: customer._id,
            clothType: parsed[0].clothType,
            orderItems: parsed,
            amount: subtotal,
            discount: discountValue,
            advance: advanceValue,
            advanceMethod,
            deliveryDate: deliveryDate || undefined,
            assignedTo: assignedTo || undefined,
            notes: notes.trim() || undefined,
            status: "confirmed",
          }),
        },
        token,
      );

      if (saveToProfile) {
        const merged: Measurements = { ...(customer.measurements ?? {}) };
        for (const item of parsed) Object.assign(merged, item.measurements);
        if (Object.keys(merged).length > 0) {
          await apiRequest(
            `/shops/${shopId}/customers/${customer._id}`,
            { method: "PATCH", body: JSON.stringify({ measurements: merged }) },
            token,
          ).catch(() => undefined);
        }
      }

      onCreated(order);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("orderForm.title")}
      icon={PackagePlus}
      size="xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="new-order-form" className={btnPrimary} disabled={submitting}>
            <PackagePlus className="h-4 w-4" />
            {submitting ? t("orderForm.creating") : t("orderForm.create")}
          </button>
        </>
      }
    >
      <form id="new-order-form" onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {/* Customer */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/50">{t("orderForm.customer")}</h3>
            {customer ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-teal/25 bg-teal/5 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
                    {customer.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{customer.name}</p>
                    <p className="text-xs text-ink/55">{customer.phone}</p>
                  </div>
                </div>
                {!presetCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setQuery("");
                    }}
                    className="text-xs font-semibold text-teal hover:underline"
                  >
                    {t("orderForm.change")}
                  </button>
                )}
              </div>
            ) : addingCustomer ? (
              <div className="space-y-3 rounded-xl border border-ink/10 bg-paper/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{t("orderForm.newCustomerTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setAddingCustomer(false)}
                    className="text-ink/40 hover:text-ink"
                    aria-label={t("common.cancel")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={inputClass}
                    placeholder={t("common.name")}
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <button type="button" onClick={() => void createCustomer()} className={btnPrimary}>
                    <Check className="h-4 w-4" />
                    {t("common.add")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-ink/35" />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder={t("orderForm.customerSearch")}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggestions}
                />
                {showSuggestions && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
                    {suggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-ink/50">{t("orderForm.noCustomer")}</p>
                    ) : (
                      suggestions.map((c, idx) => (
                        <button
                          key={c._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                            idx === activeIndex ? "bg-teal/10 text-teal" : "text-ink hover:bg-ink/5"
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-xs font-bold text-ink/55">
                            {c.name[0]?.toUpperCase()}
                          </span>
                          <span className="flex-1 truncate font-medium">{c.name}</span>
                          <span className="text-ink/45">{c.phone}</span>
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAddingCustomer(true);
                        const looksLikePhone = /^[0-9+\s-]+$/.test(query.trim());
                        setNewCustomer({
                          name: looksLikePhone ? "" : query.trim(),
                          phone: looksLikePhone ? query.trim() : "",
                        });
                      }}
                      className="flex w-full items-center gap-2 border-t border-ink/10 px-4 py-2.5 text-left text-sm font-semibold text-teal hover:bg-teal/5"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t("orderForm.newCustomer")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Items */}
          {customer && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/50">{t("orderForm.items")}</h3>
              <ItemsEditor
                items={items}
                onChange={setItems}
                clothTypes={catalog.clothTypes}
                measurementLabels={catalog.measurementLabels}
                savedMeasurements={customer.measurements}
              />
              <label className="flex items-center gap-2 pt-1 text-sm text-ink/70">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                />
                {t("orderForm.saveToProfile")}
              </label>
            </section>
          )}
        </div>

        {/* Side panel: delivery, payment, totals */}
        <aside className="space-y-4">
          <div className="space-y-3 rounded-xl border border-ink/10 bg-paper/50 p-4">
            <Field label={t("orderForm.deliveryDate")}>
              <input
                type="date"
                className={inputClass}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>
            {staff.length > 0 && (
              <Field label={t("orderForm.assignTailor")}>
                <select className={inputClass} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">{t("common.unassigned")}</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name || member.email} · {t(`role.${member.role}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t("common.notes")}>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder={t("orderForm.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-ink/10 bg-paper/50 p-4">
            <Field label={t("orderForm.discount")}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className={inputClass}
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label={t("orderForm.advance")}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={inputClass}
                  placeholder="0"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                />
              </Field>
              <Field label={t("orderForm.method")}>
                <select
                  className={`${inputClass} w-[110px]`}
                  value={advanceMethod}
                  onChange={(e) => setAdvanceMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t(`method.${m}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <dl className="space-y-1.5 border-t border-ink/10 pt-3 text-sm">
              <div className="flex justify-between text-ink/60">
                <dt>
                  {t("orderForm.subtotal")} · {num(items.length)}
                </dt>
                <dd>{money(subtotal)}</dd>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-ink/60">
                  <dt>{t("orderForm.discount").replace(" (৳)", "")}</dt>
                  <dd>−{money(discountValue)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-ink">
                <dt>{t("orderForm.payable")}</dt>
                <dd>{money(payableAmount)}</dd>
              </div>
              {advanceValue > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>{t("orderForm.advance").replace(" (৳)", "")}</dt>
                  <dd>−{money(advanceValue)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
                <dt className="text-ink">{t("orderForm.due")}</dt>
                <dd className={dueValue > 0 ? "text-coral" : "text-emerald-700"}>{money(dueValue)}</dd>
              </div>
            </dl>
          </div>

          {error && <Alert>{error}</Alert>}
        </aside>
      </form>
    </Modal>
  );
}
