"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, Clock, CreditCard, Zap } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Alert, btnPrimary, cardClass, EmptyState, Field, inputClass, PageHeader } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { errorMessage, useSession } from "../../lib/session";

interface Subscription {
  planCode: string;
  amountBdt: number;
  status: string;
  trialEndsAt?: string;
  nextBillingDate?: string;
}

interface Payment {
  _id: string;
  method: "bkash_manual" | "nagad_manual";
  amountBdt: number;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const PAYMENT_STYLE: Record<string, { badge: string; dot: string }> = {
  approved: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  pending: { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  rejected: { badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

const SUB_STYLE: Record<string, { dot: string; text: string }> = {
  active: { dot: "bg-emerald-500", text: "text-emerald-700" },
  trial: { dot: "bg-blue-500", text: "text-blue-700" },
  pending: { dot: "bg-amber-500", text: "text-amber-700" },
  past_due: { dot: "bg-red-500", text: "text-red-700" },
  expired: { dot: "bg-red-500", text: "text-red-700" },
  inactive: { dot: "bg-ink/30", text: "text-ink/60" },
  cancelled: { dot: "bg-ink/30", text: "text-ink/60" },
};

export default function SubscriptionPage() {
  const { t, money, date } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState<"bkash_manual" | "nagad_manual">("bkash_manual");
  const [transactionId, setTransactionId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    const [subscriptionResult, paymentResult] = await Promise.all([
      apiRequest<Subscription>(`/shops/${shopId}/subscription`, {}, token),
      apiRequest<Payment[]>(`/shops/${shopId}/payments`, {}, token),
    ]);
    setSubscription(subscriptionResult);
    setPayments(paymentResult);
  }

  useEffect(() => {
    void loadData().catch((err) => setError(errorMessage(err, t("common.somethingWrong"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest(
        `/shops/${shopId}/payments/manual`,
        { method: "POST", body: JSON.stringify({ method, transactionId, proofImageUrl: proofImageUrl || undefined }) },
        token,
      );
      setTransactionId("");
      setProofImageUrl("");
      toast(t("sub.submitted"));
      await loadData();
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSubmitting(false);
    }
  }

  const status = subscription?.status ?? "inactive";
  const statusStyle = SUB_STYLE[status] ?? SUB_STYLE.inactive;
  const amount = subscription?.amountBdt ?? 500;

  return (
    <section className="space-y-5">
      <PageHeader title={t("sub.title")} subtitle={t("sub.sub")} />

      {/* Plan card */}
      <div className="overflow-hidden rounded-2xl border border-ink/10">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal to-[#0f4250] px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{t("sub.currentPlan")}</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {money(amount)} <span className="text-base font-medium text-white/70">{t("sub.perMonth")}</span>
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
            <Zap className="h-7 w-7" />
          </div>
        </div>
        <div className="grid divide-y divide-ink/10 bg-white/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-4">
            <p className="mb-1.5 text-xs font-semibold text-ink/50">{t("sub.status")}</p>
            <p className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
              <span className={`text-sm font-semibold ${statusStyle.text}`}>{t(`sub.st.${status}` as TranslationKey)}</span>
            </p>
          </div>
          {subscription?.trialEndsAt && (
            <div className="px-6 py-4">
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink/50">
                <Clock className="h-3 w-3" /> {status === "expired" ? t("sub.trialEnded") : t("sub.trialEnds")}
              </p>
              <p className={`text-sm font-semibold ${status === "expired" ? "text-red-700" : "text-ink"}`}>{date(subscription.trialEndsAt)}</p>
            </div>
          )}
          {subscription?.nextBillingDate && (
            <div className="px-6 py-4">
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink/50">
                <CalendarDays className="h-3 w-3" /> {t("sub.nextBilling")}
              </p>
              <p className={`text-sm font-semibold ${status === "past_due" ? "text-red-700" : "text-ink"}`}>{date(subscription.nextBillingDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit payment */}
      <form onSubmit={onSubmit} className={`${cardClass} space-y-4 p-5 sm:p-6`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-ink">{t("sub.submitPayment")}</p>
            <p className="text-xs text-ink/55">{t("sub.howTo", { amount: String(amount) })}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("sub.method")}>
            <select
              className={inputClass}
              value={method}
              onChange={(e) => setMethod(e.target.value as "bkash_manual" | "nagad_manual")}
            >
              <option value="bkash_manual">{t("method.bkash")}</option>
              <option value="nagad_manual">{t("method.nagad")}</option>
            </select>
          </Field>
          <Field label={t("sub.txnId")}>
            <input
              className={inputClass}
              placeholder="e.g. ABC123XYZ"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label={`${t("sub.proof")} (${t("common.optional")})`}>
          <input
            className={inputClass}
            type="url"
            placeholder="https://…"
            value={proofImageUrl}
            onChange={(e) => setProofImageUrl(e.target.value)}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end">
          <button type="submit" className={btnPrimary} disabled={submitting}>
            <CreditCard className="h-4 w-4" />
            {t("sub.submit")}
          </button>
        </div>
      </form>

      {/* Payment history */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center gap-2.5 border-b border-ink/10 px-5 py-3.5">
          <BadgeCheck className="h-4 w-4 text-ink/45" />
          <p className="font-semibold text-ink">{t("sub.history")}</p>
        </div>
        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title={t("sub.noPayments")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paper/60 text-left text-xs font-semibold text-ink/50">
                  <th className="px-5 py-3">{t("sub.col.date")}</th>
                  <th className="px-5 py-3">{t("sub.col.method")}</th>
                  <th className="px-5 py-3">{t("sub.col.amount")}</th>
                  <th className="px-5 py-3">{t("sub.col.txn")}</th>
                  <th className="px-5 py-3">{t("sub.col.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {payments.map((payment) => {
                  const style = PAYMENT_STYLE[payment.status] ?? PAYMENT_STYLE.pending;
                  return (
                    <tr key={payment._id}>
                      <td className="px-5 py-3 text-ink/65">{date(payment.createdAt)}</td>
                      <td className="px-5 py-3 font-medium text-ink">
                        {payment.method === "bkash_manual" ? t("method.bkash") : t("method.nagad")}
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink">{money(payment.amountBdt)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink/55">{payment.transactionId}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {t(`sub.pay.${payment.status}` as TranslationKey)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
