"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Link2 } from "lucide-react";
import { AuthLayout } from "../../../components/AuthLayout";
import { PasswordInput } from "../../../components/customer/PasswordInput";
import { Alert, btnPrimary, Field, inputClass } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { CustomerAuthResponse, getCustomerToken, setCustomerAuth } from "../../../lib/customer-auth";
import { useI18n } from "../../../lib/i18n";
import { portalRequest } from "../../../lib/customer-portal";
import { errorMessage } from "../../../lib/session";

/**
 * Redeems a shop's invite code. Signed-out visitors sign up (or sign in, if the
 * phone already has an account); signed-in customers just add the shop.
 */
export default function CustomerJoinPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    if (fromLink) setCode(fromLink.toUpperCase());
    setSignedIn(!!getCustomerToken());
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (signedIn) {
        await portalRequest("/links", { method: "POST", body: JSON.stringify({ code }) });
      } else {
        const result = await apiRequest<CustomerAuthResponse>("/customer/auth/join", {
          method: "POST",
          body: JSON.stringify({ code, phone, password, ...(name.trim() ? { name: name.trim() } : {}) }),
        });
        setCustomerAuth(result);
      }
      router.replace("/my");
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("my.joinTitle")}
      subtitle={signedIn ? t("my.addShopHint") : t("my.joinSub")}
      footer={
        signedIn ? (
          <Link className="font-semibold text-teal hover:text-teal/80" href="/my">
            {t("my.myOrders")}
          </Link>
        ) : (
          <>
            {t("my.haveAccount")}{" "}
            <Link className="font-semibold text-teal hover:text-teal/80" href="/my/login">
              {t("my.signIn")}
            </Link>
          </>
        )
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <Field label={t("my.code")}>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              className={`${inputClass} pl-9 font-mono text-base uppercase tracking-[0.25em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              required
              minLength={6}
              maxLength={20}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
        </Field>
        {!signedIn && (
          <>
            <Field label={t("my.phone")}>
              <input
                className={inputClass}
                type="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </Field>
            <Field label={`${t("my.yourName")} (${t("common.optional")})`}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            </Field>
            <Field label={t("common.password")} hint={t("my.passwordHint")}>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" minLength={6} />
            </Field>
          </>
        )}
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3`}>
          <Link2 className="h-4 w-4" />
          {loading ? t("my.signingIn") : t("my.join")}
        </button>
      </form>
    </AuthLayout>
  );
}
