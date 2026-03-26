"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { setShopAuth } from "../../lib/auth";

interface LoginResponse {
  accessToken: string;
  user: {
    sub: string;
    role: string;
    shopId?: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Brand */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-[#0f4250] text-2xl font-bold text-white shadow-lg">
            D
          </div>
          <h1 className="text-3xl font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm shop-quiet">Sign in to manage your tailor shop.</p>
        </div>

        {/* Card */}
        <section className="rounded-2xl shop-surface p-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Email</label>
              <input
                className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                placeholder="your@shop.email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Password</label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 pr-10 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-teal/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>

        <p className="text-center text-sm text-ink/60">
          New shop?{" "}
          <a className="font-semibold text-teal transition hover:text-teal/80" href="/register">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
