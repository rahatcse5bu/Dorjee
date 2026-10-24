"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { AuthLayout } from "../../components/AuthLayout";
import { Alert, btnPrimary, Field, inputClass } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { AuthUser, setShopAuth } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import { errorMessage } from "../../lib/session";

interface RegisterResponse {
  accessToken: string;
  user: AuthUser;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState({ shopName: "", ownerName: "", phone: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ role: "shop_owner", ...form }),
      });
      setShopAuth(result.accessToken, result.user);
      router.push("/dashboard");
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSub")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link className="font-semibold text-teal hover:text-teal/80" href="/login">
            {t("auth.loginHere")}
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.shopName")}>
            <input className={inputClass} value={form.shopName} onChange={set("shopName")} required autoFocus />
          </Field>
          <Field label={t("auth.ownerName")}>
            <input className={inputClass} value={form.ownerName} onChange={set("ownerName")} required autoComplete="name" />
          </Field>
        </div>
        <Field label={t("common.phone")}>
          <input
            className={inputClass}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            value={form.phone}
            onChange={set("phone")}
            required
            autoComplete="tel"
          />
        </Field>
        <Field label={t("common.email")}>
          <input
            className={inputClass}
            placeholder="shop@email.com"
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            autoComplete="email"
          />
        </Field>
        <Field label={t("common.password")} hint={t("auth.passwordHint")}>
          <div className="relative">
            <input
              className={`${inputClass} pr-10`}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/60"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3`}>
          <UserPlus className="h-4 w-4" />
          {loading ? t("auth.creating") : t("auth.createAccount")}
        </button>
      </form>
    </AuthLayout>
  );
}
