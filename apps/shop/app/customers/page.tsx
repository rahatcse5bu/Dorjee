"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  AlertCircle,
  Phone,
  MapPin,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getShopToken, getShopUser } from "../../lib/auth";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");

  const user = getShopUser();
  const token = getShopToken();

  async function loadCustomers() {
    if (!user?.shopId || !token) return;
    setLoading(true);
    try {
      const result = await apiRequest<Customer[]>(`/shops/${user.shopId}/customers`, {}, token);
      setCustomers(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError("");
    if (!user?.shopId || !token) { setCreateError("Please login first."); return; }
    try {
      await apiRequest(`/shops/${user.shopId}/customers`, {
        method: "POST",
        body: JSON.stringify({ name, phone, address }),
      }, token);
      setName("");
      setPhone("");
      setAddress("");
      await loadCustomers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  function startEdit(customer: Customer) {
    setEditingId(customer._id);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address ?? "");
    setEditError("");
  }

  async function saveEdit() {
    if (!editingId || !user?.shopId || !token) return;
    setEditError("");
    try {
      await apiRequest(`/shops/${user.shopId}/customers/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, phone: editPhone, address: editAddress }),
      }, token);
      setEditingId(null);
      await loadCustomers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update customer");
    }
  }

  async function onDelete(customerId: string) {
    if (!user?.shopId || !token) return;
    await apiRequest(`/shops/${user.shopId}/customers/${customerId}`, { method: "DELETE" }, token);
    await loadCustomers();
  }

  const filtered = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
  });

  return (
    <section className="space-y-7">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Customers</h2>
        <p className="mt-1 text-sm shop-quiet">Manage customer profiles and contact details.</p>
      </div>

      {/* Create form */}
      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5"
      >
        <p className="text-sm font-semibold text-ink">Add Customer</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Name</label>
            <input
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Phone</label>
            <input
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Address</label>
            <input
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="Optional"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        {createError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {createError}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-ink/10 bg-paper/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4 gap-4">
          <p className="text-sm font-semibold text-ink shrink-0">
            All Customers
            {customers.length > 0 && (
              <span className="ml-2 rounded-full bg-ink/8 px-2 py-0.5 text-xs font-medium text-ink/50">
                {customers.length}
              </span>
            )}
          </p>
          <div className="relative max-w-xs w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
            <input
              className="w-full rounded-xl border border-ink/12 bg-white/70 py-2 pl-9 pr-3 text-sm placeholder:text-ink/35 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="Search name or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-px p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-ink/8 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-ink/8 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-ink/6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink/40">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {searchQuery ? "No customers match your search." : "No customers yet. Add one above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink/8">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Address</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {filtered.map((customer) => (
                  <tr key={customer._id} className="group hover:bg-white/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                          {customer.name[0]?.toUpperCase()}
                        </span>
                        <span className="font-medium text-ink">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink/60">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink/50 max-w-[200px] truncate">
                      {customer.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                          {customer.address}
                        </div>
                      ) : (
                        <span className="text-ink/25">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(customer)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink/40 hover:bg-teal/10 hover:text-teal transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(customer._id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink/40 hover:bg-coral/10 hover:text-coral transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <Pencil className="h-4 w-4" />
                </div>
                <p className="font-semibold text-ink">Edit Customer</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/30 hover:bg-ink/8 hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Name</label>
                <input
                  className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Phone</label>
                <input
                  className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Address</label>
                <input
                  className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
              {editError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {editError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-ink/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal/90 transition-colors"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
