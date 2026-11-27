"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Phone } from "lucide-react";
import { AuthLayout } from "../../../components/AuthLayout";
import { PasswordInput } from "../../../components/customer/PasswordInput";
import { Alert, btnPrimary, btnSecondary, Field, inputClass } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { CustomerAuthResponse, getCustomerToken, setCustomerAuth } from "../../../lib/customer-auth";
import { useI18n } from "../../../lib/i18n";
import { errorMessage } from "../../../lib/session";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getCustomerToken()) {
      router.replace("/my");
      return;
    }
    if (new URLSearchParams(window.location.search).get("expired") === "1") setNotice(t("auth.expired"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<CustomerAuthResponse>("/customer/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      setCustomerAuth(result);
      router.replace("/my");
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("my.signInTitle")}
      subtitle={t("my.signInSub")}
      footer={
        <span className="flex flex-col items-center gap-3">
          <span>{t("my.firstTime")}</span>
          <Link href="/my/join" className={btnSecondary}>
            {t("my.haveCode")}
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {notice && !error && <Alert>{notice}</Alert>}
        <Field label={t("my.phone")}>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              className={`${inputClass} pl-9`}
              type="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              autoFocus
            />
          </div>
        </Field>
        <Field label={t("common.password")}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3`}>
          <LogIn className="h-4 w-4" />
          {loading ? t("my.signingIn") : t("my.signIn")}
        </button>
      </form>
    </AuthLayout>
  );
}
