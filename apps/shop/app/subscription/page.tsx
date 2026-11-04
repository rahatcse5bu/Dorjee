"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, Check, Clock, Copy, CreditCard, Smartphone, Zap } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Alert, btnPrimary, cardClass, EmptyState, Field, inputClass, PageHeader } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

interface Plan {
  code: string;
  months: number;
  priceBdt: number;
  chargeBdt?: number;
  payableBdt?: number;
}

interface PaymentInfo {
  bkashNumber: string;
  accountType: string;
  cashoutPerThousand: number;
}

interface Subscription {
  planCode: string;
  amountBdt: number;
  months?: number;
  status: string;
  trialEndsAt?: string;
  nextBillingDate?: string;
}

interface Payment {
  _id: string;
  method: "bkash_manual" | "nagad_manual";
  amountBdt: number;
  payableBdt?: number;
  senderNumber?: string;
  months?: number;
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

// Shown until the price list loads; the API's list is the source of truth.
const FALLBACK_PLANS: Plan[] = [{ code: "MONTHLY", months: 1, priceBdt: 500 }];
const FALLBACK_INFO: PaymentInfo = { bkashNumber: "01793278360", accountType: "personal", cashoutPerThousand: 18.75 };

/** Plan price plus the bKash cash-out charge, rounded up (the API sends the same figures). */
function payable(plan: Plan, info: PaymentInfo) {
  if (plan.payableBdt !== undefined) return { charge: plan.chargeBdt ?? plan.payableBdt - plan.priceBdt, total: plan.payableBdt };
  const total = Math.ceil(plan.priceBdt + (plan.priceBdt * info.cashoutPerThousand) / 1000);
  return { charge: total - plan.priceBdt, total };
}

export default function SubscriptionPage() {
  const { t, money, date, num } = useI18n();
  const toast = useToast();
  const { token, shopId } = useSession();
  const canPay = usePermissions().can("subscription", "manage");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [planCode, setPlanCode] = useState("MONTHLY");
  const [info, setInfo] = useState<PaymentInfo>(FALLBACK_INFO);
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    const [subscriptionResult, paymentResult, planResult, infoResult] = await Promise.all([
      apiRequest<Subscription>(`/shops/${shopId}/subscription`, {}, token),
      apiRequest<Payment[]>(`/shops/${shopId}/payments`, {}, token),
      apiRequest<Plan[]>(`/subscription-plans`, {}, token),
      apiRequest<PaymentInfo>(`/subscription-plans/payment-info`, {}, token).catch(() => FALLBACK_INFO),
    ]);
    setInfo(infoResult);
    setSubscription(subscriptionResult);
    setPayments(paymentResult);
    if (planResult.length > 0) {
      setPlans(planResult);
      // Pre-select the plan the shop is on, so renewing is one tap.
      if (planResult.some((p) => p.code === subscriptionResult?.planCode)) setPlanCode(subscriptionResult!.planCode);
    }
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
        { method: "POST", body: JSON.stringify({ method: "bkash_manual", senderNumber, transactionId, planCode }) },
        token,
      );
      setTransactionId("");
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
  const currentMonths = subscription?.months ?? 1;
  const monthlyPrice = plans.find((p) => p.months === 1)?.priceBdt ?? 500;
  const selected = plans.find((p) => p.code === planCode) ?? plans[0];
  const bestValue = plans.reduce((best, p) => (p.priceBdt / p.months < best.priceBdt / best.months ? p : best), plans[0]);
  const period = (months: number) =>
    months === 1 ? t("sub.oneMonth") : months === 12 ? t("sub.oneYear") : t("sub.months", { n: num(months) });
  const due = payable(selected, info);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(info.bkashNumber);
      toast(t("sub.copied"));
    } catch {
      // Clipboard blocked; the number is on screen to type.
    }
  }

  const hasTimeLeft =
    status === "active" && !!subscription?.nextBillingDate && new Date(subscription.nextBillingDate).getTime() > Date.now();

  return (
    <section className="space-y-5">
      <PageHeader title={t("sub.title")} subtitle={t("sub.sub")} />

      {/* Plan card */}
      <div className="overflow-hidden rounded-2xl border border-ink/10">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal to-[#0f4250] px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{t("sub.currentPlan")}</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {money(amount)}{" "}
              <span className="text-base font-medium text-white/70">
                {currentMonths === 1 ? t("sub.perMonth") : `/ ${period(currentMonths)}`}
              </span>
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
      {canPay && (
      <form onSubmit={onSubmit} className={`${cardClass} space-y-4 p-5 sm:p-6`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-ink">{t("sub.submitPayment")}</p>
            <p className="text-xs text-ink/55">{t("sub.howTo")}</p>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-ink/60">{t("sub.choosePlan")}</legend>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" role="radiogroup">
            {plans.map((plan) => {
              const on = plan.code === selected.code;
              const saving = monthlyPrice * plan.months - plan.priceBdt;
              return (
                <button
                  key={plan.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPlanCode(plan.code)}
                  className={`relative flex flex-col items-stretch justify-start rounded-xl border-2 p-3.5 text-left transition ${
                    on ? "border-teal bg-teal/[0.06]" : "border-ink/10 bg-white hover:border-teal/40"
                  }`}
                >
                  {plan.code === bestValue.code && plan.months > 1 && (
                    <span className="absolute -top-2.5 right-2 rounded-full bg-brass px-2 py-0.5 text-[10px] font-bold text-white">
                      {t("sub.bestValue")}
                    </span>
                  )}
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{period(plan.months)}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        on ? "border-teal bg-teal text-white" : "border-ink/20"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xl font-bold text-ink">{money(plan.priceBdt)}</span>
                  <span className="block text-xs text-ink/55">
                    {t("sub.monthlyEq", { amount: money(Math.round(plan.priceBdt / plan.months)) })}
                  </span>
                  {saving > 0 && (
                    <span className="mt-2 self-start rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {t("sub.save", { amount: money(saving) })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {hasTimeLeft && <p className="mt-2 text-xs text-ink/55">{t("sub.extendNote")}</p>}
        </fieldset>
        {/* Where to send the money */}
        <div className="overflow-hidden rounded-2xl border border-[#e2136e]/25 bg-[#e2136e]/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#c0105d]">
                <Smartphone className="h-3.5 w-3.5" />
                {t("sub.sendMoneyTo")}
                <span className="rounded-full bg-[#e2136e] px-2 py-0.5 text-[10px] font-bold text-white">{t("sub.personal")}</span>
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-ink">{info.bkashNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => void copyNumber()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2136e]/30 bg-white px-3 py-2 text-xs font-semibold text-[#c0105d] hover:bg-[#e2136e]/5"
            >
              <Copy className="h-3.5 w-3.5" />
              {t("sub.copy")}
            </button>
          </div>
          <dl className="space-y-1.5 border-t border-[#e2136e]/15 bg-white/70 px-4 py-3 text-sm sm:px-5">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">{t("sub.planPrice", { period: period(selected.months) })}</dt>
              <dd className="font-medium text-ink">{money(selected.priceBdt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">{t("sub.cashout", { rate: num(info.cashoutPerThousand) })}</dt>
              <dd className="font-medium text-ink">+ {money(due.charge)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-ink/10 pt-1.5">
              <dt className="font-semibold text-ink">{t("sub.totalToSend")}</dt>
              <dd className="text-lg font-bold text-[#c0105d]">{money(due.total)}</dd>
            </div>
          </dl>
          <ol className="list-decimal space-y-0.5 border-t border-[#e2136e]/15 px-4 py-3 pl-9 text-xs text-ink/65 sm:px-5 sm:pl-10">
            <li>{t("sub.step1")}</li>
            <li>{t("sub.step2", { number: info.bkashNumber, amount: money(due.total) })}</li>
            <li>{t("sub.step3")}</li>
          </ol>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("sub.senderNumber")}>
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              pattern="^(\+?88)?01[3-9][0-9]{8}$"
              title={t("sub.senderNumberHint")}
              required
            />
          </Field>
          <Field label={t("sub.txnId")}>
            <input
              className={`${inputClass} font-mono uppercase`}
              placeholder="BKA1B2C3D4"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end">
          <button type="submit" className={btnPrimary} disabled={submitting}>
            <CreditCard className="h-4 w-4" />
            {t("sub.submit")}
          </button>
        </div>
      </form>
      )}

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
                  <th className="px-5 py-3">{t("sub.col.plan")}</th>
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
                      <td className="whitespace-nowrap px-5 py-3 text-ink/80">{period(payment.months ?? 1)}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-ink">
                        {payment.method === "bkash_manual" ? t("method.bkash") : t("method.nagad")}
                        {payment.senderNumber && <span className="block font-mono text-xs font-normal text-ink/50">{payment.senderNumber}</span>}
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink">{money(payment.payableBdt ?? payment.amountBdt)}</td>
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
