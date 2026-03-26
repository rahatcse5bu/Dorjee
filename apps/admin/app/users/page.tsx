"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

type AdminRole = "super_admin" | "admin_finance" | "admin_support";

export default function UsersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin_support");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const token = getAdminToken();
    if (!token) {
      setError("Please login first.");
      return;
    }

    try {
      await apiRequest("/auth/admin/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      }, token);
      setEmail("");
      setPassword("");
      setRole("admin_support");
      setMessage("Admin account created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin user");
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate">Admins and Users</h2>
      <p className="mt-1 text-sm text-slate/70">Role-separated admin accounts and access management.</p>

      <form className="mt-4 grid gap-3 rounded-xl border border-slate/10 bg-fog p-4 md:grid-cols-3" onSubmit={onSubmit}>
        <input
          className="rounded-lg border border-slate/20 bg-white px-3 py-2"
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="rounded-lg border border-slate/20 bg-white px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <select
          className="rounded-lg border border-slate/20 bg-white px-3 py-2"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminRole)}
        >
          <option value="super_admin">super_admin</option>
          <option value="admin_finance">admin_finance</option>
          <option value="admin_support">admin_support</option>
        </select>

        {error ? <p className="text-sm text-red-600 md:col-span-3">{error}</p> : null}
        {message ? <p className="text-sm text-green-700 md:col-span-3">{message}</p> : null}

        <button className="rounded-lg bg-slate px-4 py-2 text-fog md:col-span-3" type="submit">
          Create admin account
        </button>
      </form>
    </section>
  );
}
