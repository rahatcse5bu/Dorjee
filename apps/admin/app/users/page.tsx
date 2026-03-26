"use client";

import { FormEvent, useState } from "react";
import { UserPlus, AlertCircle, CheckCircle, Shield } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

type AdminRole = "super_admin" | "admin_finance" | "admin_support";

const roles: { value: AdminRole; label: string; description: string }[] = [
  { value: "super_admin", label: "Super Admin", description: "Full platform access" },
  { value: "admin_finance", label: "Finance Admin", description: "Payments & subscriptions" },
  { value: "admin_support", label: "Support Admin", description: "Shop management & support" },
];

export default function UsersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin_support");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const token = getAdminToken();
    if (!token) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    try {
      await apiRequest("/auth/admin/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      }, token);
      setEmail("");
      setPassword("");
      setRole("admin_support");
      setMessage("Admin account created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Admins & Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage role-separated admin accounts.
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Role info */}
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {roles.map((r) => (
            <div
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                role === r.value
                  ? "border-sky-500 bg-sky-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className={`w-3.5 h-3.5 ${role === r.value ? "text-sky-600" : "text-slate-400"}`} />
                <span className={`text-xs font-semibold ${role === r.value ? "text-sky-700" : "text-slate-600"}`}>
                  {r.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">{r.description}</p>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">New Admin Account</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="admin@dorjee.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 transition focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create admin account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
