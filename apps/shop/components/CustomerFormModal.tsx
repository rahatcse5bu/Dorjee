"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Customer } from "../lib/orders";
import { errorMessage, useSession } from "../lib/session";
import { Alert, btnPrimary, btnSecondary, Field, inputClass, Modal } from "./ui";

/** Creates a customer, or edits `customer` when one is given. */
export function CustomerFormModal({
  open,
  onClose,
  onSaved,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  customer?: Customer | null;
}) {
  const { t } = useI18n();
  const { token, shopId } = useSession();
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({ name: customer?.name ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" });
  }, [open, customer]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
      const saved = customer
        ? await apiRequest<Customer>(`/shops/${shopId}/customers/${customer._id}`, { method: "PATCH", body }, token)
        : await apiRequest<Customer>(`/shops/${shopId}/customers`, { method: "POST", body }, token);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? t("customers.edit") : t("customers.add")}
      icon={UserPlus}
      size="sm"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="customer-form" className={btnPrimary} disabled={saving}>
            <Check className="h-4 w-4" />
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={onSubmit} className="space-y-4">
        <Field label={t("common.name")}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </Field>
        <Field label={t("common.phone")}>
          <input
            className={inputClass}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
          />
        </Field>
        <Field label={`${t("common.address")} (${t("common.optional")})`}>
          <input
            className={inputClass}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
      </form>
    </Modal>
  );
}
