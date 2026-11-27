"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, MessageCircle, RefreshCw, Smartphone, Unlink } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { CustomerUsage, isFull } from "../lib/limits";
import { Customer } from "../lib/orders";
import { errorMessage } from "../lib/session";
import { LimitMeter } from "./LimitMeter";
import { useToast } from "./Toast";
import { btnPrimary, btnSecondary, cardClass } from "./ui";

/** WhatsApp wants the number in international form without "+". */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("880") ? digits : digits.startsWith("0") ? `88${digits}` : digits;
}

/**
 * Lets the shop invite a customer to the customer app, where they see their
 * orders and order again. The code is shown once; only its hash is stored.
 */
export function CustomerAppCard({
  customer,
  shopId,
  token,
  canManage,
  onChange,
}: {
  customer: Customer;
  shopId: string;
  token: string | null;
  canManage: boolean;
  onChange: (customer: Customer) => void;
}) {
  const { t, date } = useI18n();
  const toast = useToast();
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<CustomerUsage | null>(null);
  const linked = !!customer.accountId;

  useEffect(() => {
    if (!canManage) return;
    apiRequest<CustomerUsage>(`/shops/${shopId}/customers/limits`, {}, token).then(setUsage).catch(() => undefined);
  }, [canManage, shopId, token, customer.accountId]);
  const app = usage?.appCustomers;
  // A customer who is already connected keeps their place; others need a free one.
  const appFull = !linked && !!app && isFull(app);
  const openUntil =
    customer.appInviteExpiresAt && new Date(customer.appInviteExpiresAt) > new Date() ? customer.appInviteExpiresAt : null;
  const link = invite && typeof window !== "undefined" ? `${window.location.origin}/my/join?code=${invite.code}` : "";

  async function createInvite() {
    setBusy(true);
    try {
      const result = await apiRequest<{ code: string; expiresAt: string }>(
        `/shops/${shopId}/customers/${customer._id}/app-invite`,
        { method: "POST" },
        token,
      );
      setInvite(result);
      onChange({ ...customer, appInviteExpiresAt: result.expiresAt });
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm(t("app.unlinkConfirm", { name: customer.name }))) return;
    setBusy(true);
    try {
      const updated = await apiRequest<Customer>(`/shops/${shopId}/customers/${customer._id}/app-link`, { method: "DELETE" }, token);
      setInvite(null);
      onChange(updated);
      toast(t("app.unlinked"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast(t("app.linkCopied"));
    } catch {
      // Clipboard blocked; the link is on screen to copy by hand.
    }
  }

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${linked ? "bg-emerald-50 text-emerald-600" : "bg-teal/10 text-teal"}`}>
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 font-semibold text-ink">
              {t("app.title")}
              {linked && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">✓</span>
              )}
            </h2>
            <p className="mt-0.5 text-sm text-ink/55">
              {linked ? t("app.linked", { name: customer.name }) : t("app.notLinked", { name: customer.name })}
            </p>
            {!linked && !invite && openUntil && <p className="mt-1 text-xs text-ink/45">{t("app.openInvite", { date: date(openUntil) })}</p>}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {linked ? (
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => void unlink()}>
                <Unlink className="h-4 w-4" />
                {t("app.unlink")}
              </button>
            ) : (
              !invite && (
                <button type="button" className={btnPrimary} disabled={busy || appFull} onClick={() => void createInvite()}>
                  <KeyRound className="h-4 w-4" />
                  {openUntil ? t("app.newCode") : t("app.invite")}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {canManage && app && app.limit > 0 && (
        <div className="mt-4 max-w-xs">
          <LimitMeter used={app.used} limit={app.limit} label={t("limits.app", { used: app.used, limit: app.limit })} />
        </div>
      )}
      {appFull && !invite && (
        <p className="mt-3 rounded-xl border border-coral/20 bg-coral/[0.06] px-3 py-2 text-sm text-coral">{t("limits.appFull", { limit: app!.limit })}</p>
      )}

      {invite && !linked && (
        <div className="mt-4 rounded-xl border border-teal/20 bg-teal/[0.04] p-4">
          <p className="text-xs font-semibold text-ink/55">{t("app.code")}</p>
          <p className="mt-1 select-all font-mono text-2xl font-bold tracking-[0.3em] text-ink">{invite.code}</p>
          <p className="mt-1 text-xs text-ink/50">{t("app.codeExpires", { date: date(invite.expiresAt) })}</p>
          <p className="mt-2 break-all text-xs text-ink/50">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className={btnPrimary}
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${whatsappNumber(customer.phone)}?text=${encodeURIComponent(t("app.shareText", { link, code: invite.code }))}`}
            >
              <MessageCircle className="h-4 w-4" />
              {t("app.whatsapp")}
            </a>
            <button type="button" className={btnSecondary} onClick={() => void copyLink()}>
              <Copy className="h-4 w-4" />
              {t("app.copyLink")}
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void createInvite()}>
              <RefreshCw className="h-4 w-4" />
              {t("app.newCode")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
