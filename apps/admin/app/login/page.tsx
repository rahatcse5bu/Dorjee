"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { setAdminAuth } from "../../lib/auth";

interface LoginResponse {
  accessToken: string;
  user: {
    sub: string;
    role: string;
    shopId?: string;
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      if (!["super_admin", "admin_finance", "admin_support"].includes(result.user.role)) {
        throw new Error("This account is not a Dorjee admin account.");
      }

      setAdminAuth(result.accessToken, result.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl admin-surface p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl bg-gradient-to-br from-var(--brand) to-var(--brand-strong) p-3">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate">Dorjee Admin</h2>
          <p className="mt-2 text-sm admin-quiet">Command center access portal.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate/70 mb-2">Email</label>
            <input
              className="rounded-lg border border-transparent bg-white px-4 py-3 text-sm transition focus:border-var(--brand) focus:outline-none focus:ring-2 focus:ring-var(--brand)/20"
              type="email"
              placeholder="admin@dorjee.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate/70 mb-2">Password</label>
            <input
              className="rounded-lg border border-transparent bg-white px-4 py-3 text-sm transition focus:border-var(--brand) focus:outline-none focus:ring-2 focus:ring-var(--brand)/20"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          ) : null}
          <button 
            className="w-full rounded-lg bg-gradient-to-r from-var(--brand) to-var(--brand-strong) px-4 py-3 font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 active:translate-y-0" 
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
