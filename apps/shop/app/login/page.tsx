"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { AuthLayout } from "../../components/AuthLayout";
import { Alert, btnPrimary, Field, inputClass } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { AuthUser, getShopToken, setShopAuth } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import { errorMessage } from "../../lib/session";

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getShopToken()) {
      router.replace("/dashboard");
      return;
    }
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      setNotice(t("auth.expired"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
      title={t("auth.welcome")}
      subtitle={t("auth.signInSub")}
      footer={
        <>
          {t("auth.newShop")}{" "}
          <Link className="font-semibold text-teal hover:text-teal/80" href="/register">
            {t("auth.registerHere")}
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {notice && !error && <Alert>{notice}</Alert>}
        <Field label={t("common.email")}>
          <input
            className={inputClass}
            placeholder="your@shop.email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </Field>
        <Field label={t("common.password")}>
          <div className="relative">
            <input
              className={`${inputClass} pr-10`}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
          <LogIn className="h-4 w-4" />
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </AuthLayout>
  );
}
