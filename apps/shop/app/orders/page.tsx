"use client";

import { FormEvent, Fragment, KeyboardEvent, useEffect, useState } from "react";
import {
  Plus,
  X,
  Scissors,
  Search,
  AlertCircle,
  Trash2,
  ChevronDown,
  PackagePlus,
  Ruler,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import { clearShopAuth, getShopToken, getShopUser } from "../../lib/auth";

interface Customer {
  _id: string;
  name: string;
  phone: string;
}

interface Order {
  _id: string;
  customerId: string;
  clothType?: string;
  orderItems?: Array<{
    clothType: string;
    price: number;
    quantity: number;
    measurements?: Record<string, string | number>;
  }>;
  status: string;
  amount: number;
}

interface DraftItem {
  clothType: string;
  price: string;
  quantity: string;
  measurements: Array<{ label: string; value: string }>;
}

interface EditableItem {
  clothType: string;
  price: string;
  quantity: string;
  measurements: Array<{ label: string; value: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  draft: { label: "Draft", dot: "bg-ink/30", badge: "bg-ink/8 text-ink/60" },
  confirmed: { label: "Confirmed", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  in_tailoring: { label: "In Tailoring", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  ready: { label: "Ready", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "Delivered", dot: "bg-teal", badge: "bg-teal/10 text-teal" },
  cancelled: { label: "Cancelled", dot: "bg-coral", badge: "bg-coral/10 text-coral" },
};

const STATUS_OPTIONS = ["draft", "confirmed", "in_tailoring", "ready", "delivered", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogClothTypes, setCatalogClothTypes] = useState<string[]>([]);
  const [catalogMeasurementLabels, setCatalogMeasurementLabels] = useState<string[]>([]);

  // New order form state
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1);
  const [orderItems, setOrderItems] = useState<
    Array<{ clothType: string; price: number; quantity: number; measurements: Record<string, string | number> }>
  >([]);

  // Add item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [draftItem, setDraftItem] = useState<DraftItem>({
    clothType: "",
    price: "0",
    quantity: "1",
    measurements: [{ label: "", value: "" }],
  });
  const [showClothSuggestions, setShowClothSuggestions] = useState(false);
  const [activeClothIndex, setActiveClothIndex] = useState(-1);
  const [modalError, setModalError] = useState("");

  // Edit order modal
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<EditableItem[]>([]);
  const [editingError, setEditingError] = useState("");

  // Page state
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const user = getShopUser();
  const token = getShopToken();

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredCustomers = customers
    .filter((c) => {
      const q = customerQuery.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    })
    .slice(0, 8);

  const filteredClothTypes = catalogClothTypes
    .filter((t) => t.toLowerCase().includes(draftItem.clothType.toLowerCase()))
    .slice(0, 8);

  const draftTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function getCustomerDisplay(customerId: string) {
    const c = customers.find((x) => x._id === customerId);
    return c ? `${c.name} (${c.phone})` : customerId;
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────

  async function loadOrders() {
    if (!user?.shopId || !token) return;
    try {
      setOrders(await apiRequest<Order[]>(`/shops/${user.shopId}/orders`, {}, token));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      if (msg.toLowerCase().includes("401") || msg.toLowerCase().includes("unauthorized")) {
        clearShopAuth();
        setError("Session expired. Please login again.");
      } else {
        setError(msg);
      }
    }
  }

  async function loadReferences() {
    if (!user?.shopId || !token) return;
    try {
      const [customerResult, catalogResult] = await Promise.all([
        apiRequest<Customer[]>(`/shops/${user.shopId}/customers`, {}, token),
        apiRequest<{ clothTypes: string[]; measurementLabels: string[] }>(
          `/shops/${user.shopId}/catalog`,
          {},
          token,
        ),
      ]);
      setCustomers(customerResult);
      setCatalogClothTypes(catalogResult.clothTypes ?? []);
      setCatalogMeasurementLabels(catalogResult.measurementLabels ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load reference data";
      if (msg.toLowerCase().includes("401") || msg.toLowerCase().includes("unauthorized")) {
        clearShopAuth();
        setError("Session expired. Please login again.");
      } else {
        setError(msg);
      }
    }
  }

  useEffect(() => {
    async function bootstrap() {
      setLoadingData(true);
      await Promise.all([loadOrders(), loadReferences()]);
      setLoadingData(false);
    }
    void bootstrap();
  }, []);

  // ─── Customer autocomplete ─────────────────────────────────────────────────

  function selectCustomer(customer: Customer) {
    setSelectedCustomerId(customer._id);
    setCustomerQuery(`${customer.name} — ${customer.phone}`);
    setShowCustomerSuggestions(false);
    setActiveCustomerIndex(-1);
  }

  function onCustomerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showCustomerSuggestions || !filteredCustomers.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveCustomerIndex((p) => (p + 1) % filteredCustomers.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveCustomerIndex((p) => (p <= 0 ? filteredCustomers.length - 1 : p - 1)); }
    else if (e.key === "Enter" && activeCustomerIndex >= 0) { e.preventDefault(); selectCustomer(filteredCustomers[activeCustomerIndex]); }
    else if (e.key === "Escape") { setShowCustomerSuggestions(false); setActiveCustomerIndex(-1); }
  }

  // ─── Cloth type autocomplete (inside modal) ────────────────────────────────

  function selectClothType(name: string) {
    setDraftItem((p) => ({ ...p, clothType: name }));
    setShowClothSuggestions(false);
    setActiveClothIndex(-1);
  }

  function onClothKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showClothSuggestions || !filteredClothTypes.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveClothIndex((p) => (p + 1) % filteredClothTypes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveClothIndex((p) => (p <= 0 ? filteredClothTypes.length - 1 : p - 1)); }
    else if (e.key === "Enter" && activeClothIndex >= 0) { e.preventDefault(); selectClothType(filteredClothTypes[activeClothIndex]); }
    else if (e.key === "Escape") { setShowClothSuggestions(false); setActiveClothIndex(-1); }
  }

  // ─── Add item (from modal) ─────────────────────────────────────────────────

  function confirmAddItem() {
    setModalError("");
    const clothType = draftItem.clothType.trim();
    if (!clothType) { setModalError("Cloth type is required."); return; }
    const price = Number(draftItem.price);
    const quantity = Number(draftItem.quantity) || 1;
    if (Number.isNaN(price) || price < 0) { setModalError("Price must be a valid non-negative number."); return; }
    if (quantity < 1) { setModalError("Quantity must be at least 1."); return; }

    const measurements = draftItem.measurements.reduce<Record<string, string | number>>((acc, m) => {
      const label = m.label.trim();
      const raw = m.value.trim();
      if (!label || !raw) return acc;
      const num = Number(raw);
      acc[label] = Number.isNaN(num) ? raw : num;
      return acc;
    }, {});

    setOrderItems((p) => [...p, { clothType, price, quantity, measurements }]);
    setDraftItem({ clothType: "", price: "0", quantity: "1", measurements: [{ label: "", value: "" }] });
    setShowClothSuggestions(false);
    setShowItemModal(false);
  }

  function openItemModal() {
    setDraftItem({ clothType: catalogClothTypes[0] ?? "", price: "0", quantity: "1", measurements: [{ label: "", value: "" }] });
    setModalError("");
    setShowClothSuggestions(false);
    setShowItemModal(true);
  }

  // ─── Create order ──────────────────────────────────────────────────────────

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!user?.shopId || !token) { setError("Please login first."); return; }
    try {
      if (!selectedCustomerId) throw new Error("Select a customer from the search results.");
      if (orderItems.length === 0) throw new Error("Add at least one cloth item.");
      await apiRequest(`/shops/${user.shopId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomerId,
          clothType: orderItems[0].clothType,
          orderItems,
          amount: orderItems.reduce((s, i) => s + i.price * i.quantity, 0),
          status: "draft",
        }),
      }, token);
      setCustomerQuery("");
      setSelectedCustomerId("");
      setOrderItems([]);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    }
  }

  // ─── Status change ─────────────────────────────────────────────────────────

  async function onStatusChange(orderId: string, status: string) {
    if (!user?.shopId || !token) return;
    await apiRequest(`/shops/${user.shopId}/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
    await loadOrders();
  }

  // ─── Edit order modal ──────────────────────────────────────────────────────

  function toEditableMeasurements(m?: Record<string, string | number>) {
    const entries = Object.entries(m ?? {});
    return entries.length === 0 ? [{ label: "", value: "" }] : entries.map(([l, v]) => ({ label: l, value: String(v) }));
  }

  function startEditOrder(order: Order) {
    const sourceItems = order.orderItems?.length
      ? order.orderItems
      : [{ clothType: order.clothType ?? "", price: order.amount, quantity: 1, measurements: {} }];
    setEditingOrderId(order._id);
    setEditingItems(sourceItems.map((i) => ({
      clothType: i.clothType, price: String(i.price), quantity: String(i.quantity || 1),
      measurements: toEditableMeasurements(i.measurements),
    })));
    setEditingError("");
  }

  async function saveEditedOrder(orderId: string) {
    if (!user?.shopId || !token) return;
    try {
      const normalizedItems = editingItems.map((item) => {
        const measurements = item.measurements.reduce<Record<string, string | number>>((acc, p) => {
          const label = p.label.trim(); const raw = p.value.trim();
          if (!label || !raw) return acc;
          const num = Number(raw);
          acc[label] = Number.isNaN(num) ? raw : num;
          return acc;
        }, {});
        return { clothType: item.clothType.trim(), price: Number(item.price), quantity: Number(item.quantity) || 1, measurements };
      });
      if (!normalizedItems.length) throw new Error("At least one order item is required.");
      for (const item of normalizedItems) {
        if (!item.clothType) throw new Error("Cloth type is required for every item.");
        if (Number.isNaN(item.price) || item.price < 0) throw new Error("Price must be a valid non-negative number.");
        if (item.quantity < 1) throw new Error("Quantity must be at least 1.");
      }
      await apiRequest(`/shops/${user.shopId}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ orderItems: normalizedItems, amount: normalizedItems.reduce((s, i) => s + i.price * i.quantity, 0) }),
      }, token);
      setEditingOrderId(null);
      setEditingItems([]);
      setEditingError("");
      await loadOrders();
    } catch (err) {
      setEditingError(err instanceof Error ? err.message : "Failed to update order");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-7">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-3xl font-bold text-ink">Orders</h2>
        <p className="mt-1 text-sm shop-quiet">Create orders, assign cloth items, and track delivery status.</p>
      </div>

      {/* ── Create order form ── */}
      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-ink/10 bg-paper/60 p-6 space-y-5"
      >
        <p className="text-sm font-semibold text-ink">New Order</p>

        {/* Customer search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Customer</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
            <input
              className="w-full rounded-xl border border-ink/15 bg-white/80 py-2.5 pl-9 pr-3 text-sm placeholder:text-ink/35 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
              placeholder="Search by name or phone…"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setSelectedCustomerId("");
                setShowCustomerSuggestions(true);
                setActiveCustomerIndex(-1);
              }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
              onKeyDown={onCustomerKeyDown}
              autoComplete="off"
            />
          </div>
          {selectedCustomerId && (
            <p className="text-xs text-teal font-medium">
              ✓ {getCustomerDisplay(selectedCustomerId)}
            </p>
          )}
          {showCustomerSuggestions && customerQuery && (
            <div className="rounded-xl border border-ink/10 bg-white shadow-lg overflow-hidden">
              {filteredCustomers.length === 0 ? (
                <p className="px-4 py-3 text-xs text-ink/50">No customers match.</p>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <button
                    key={c._id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      idx === activeCustomerIndex ? "bg-teal/10 text-teal" : "hover:bg-ink/5 text-ink"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/8 text-xs font-bold text-ink/50">
                      {c.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="text-ink/40">{c.phone}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Added items */}
        {orderItems.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Items ({orderItems.length})
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink/10 bg-white/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 shrink-0 text-teal" />
                      <span className="font-semibold text-sm text-ink truncate">{item.clothType}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {item.quantity} × ৳{item.price}
                      {Object.keys(item.measurements).length > 0 && (
                        <span className="ml-2 text-ink/40">
                          · {Object.keys(item.measurements).length} measurement{Object.keys(item.measurements).length > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderItems((p) => p.filter((_, i) => i !== idx))}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink/30 hover:bg-coral/10 hover:text-coral transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={openItemModal}
            className="flex items-center gap-2 rounded-xl border border-dashed border-teal/40 px-4 py-2.5 text-sm font-medium text-teal transition hover:border-teal hover:bg-teal/5"
          >
            <Plus className="h-4 w-4" />
            Add cloth item
          </button>
          <div className="flex items-center gap-3">
            {orderItems.length > 0 && (
              <span className="text-sm font-semibold text-ink">
                Total: <span className="text-teal">৳{draftTotal.toLocaleString()}</span>
              </span>
            )}
            <button
              type="submit"
              disabled={!selectedCustomerId || orderItems.length === 0}
              className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PackagePlus className="h-4 w-4" />
              Create order
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </form>

      {/* ── Orders table ── */}
      <div className="rounded-2xl border border-ink/10 bg-paper/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
          <p className="text-sm font-semibold text-ink">All Orders</p>
          {loadingData && <p className="text-xs text-ink/40">Loading…</p>}
        </div>

        {!loadingData && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink/40">
            <PackagePlus className="h-10 w-10 opacity-30" />
            <p className="text-sm">No orders yet. Create your first order above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink/8">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Items</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/40">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
                  const itemList = order.orderItems?.length
                    ? order.orderItems.map((i) => i.clothType).join(", ")
                    : (order.clothType ?? "—");
                  return (
                    <tr key={order._id} className="group hover:bg-white/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-ink/50">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-ink">
                        {getCustomerDisplay(order.customerId)}
                      </td>
                      <td className="px-5 py-3.5 text-ink/70 max-w-[180px] truncate">{itemList}</td>
                      <td className="px-5 py-3.5 font-semibold text-ink">৳{order.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="relative inline-flex">
                          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer select-none ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </span>
                          <select
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={order.status}
                            onChange={(e) => void onStatusChange(order._id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_CONFIG[s]?.label ?? s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => startEditOrder(order)}
                          className="rounded-lg border border-ink/15 bg-white/0 px-3 py-1.5 text-xs font-medium text-ink/60 opacity-0 transition group-hover:opacity-100 hover:border-teal/30 hover:text-teal"
                        >
                          Edit items
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD CLOTH ITEM MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowItemModal(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <Scissors className="h-4 w-4" />
                </div>
                <p className="font-semibold text-ink">Add Cloth Item</p>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/30 hover:bg-ink/8 hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-6 py-5">

              {/* Cloth type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Cloth Type
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                    placeholder="e.g. Shirt, Panjabi, Salwar…"
                    value={draftItem.clothType}
                    onChange={(e) => {
                      setDraftItem((p) => ({ ...p, clothType: e.target.value }));
                      setShowClothSuggestions(true);
                      setActiveClothIndex(-1);
                    }}
                    onFocus={() => setShowClothSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClothSuggestions(false), 150)}
                    onKeyDown={onClothKeyDown}
                    autoComplete="off"
                    autoFocus
                  />
                  {showClothSuggestions && filteredClothTypes.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-ink/10 bg-white shadow-lg overflow-hidden">
                      {filteredClothTypes.map((t, idx) => (
                        <button
                          key={t}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); selectClothType(t); }}
                          className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                            idx === activeClothIndex ? "bg-teal/10 text-teal" : "hover:bg-ink/5 text-ink"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Price + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Price (৳)</label>
                  <input
                    className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={draftItem.price}
                    onChange={(e) => setDraftItem((p) => ({ ...p, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink/50">Quantity</label>
                  <input
                    className="w-full rounded-xl border border-ink/15 bg-paper/60 px-3 py-2.5 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                    type="number"
                    min={1}
                    placeholder="1"
                    value={draftItem.quantity}
                    onChange={(e) => setDraftItem((p) => ({ ...p, quantity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Measurements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink/50 flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5" />
                    Measurements
                  </label>
                  <button
                    type="button"
                    onClick={() => setDraftItem((p) => ({ ...p, measurements: [...p.measurements, { label: "", value: "" }] }))}
                    className="text-xs text-teal font-medium hover:underline"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {draftItem.measurements.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-xl border border-ink/15 bg-paper/60 px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                        placeholder="Label (e.g. Chest)"
                        list="measurement-label-options"
                        value={m.label}
                        onChange={(e) =>
                          setDraftItem((p) => ({
                            ...p,
                            measurements: p.measurements.map((x, i) =>
                              i === idx ? { ...x, label: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <input
                        className="w-24 rounded-xl border border-ink/15 bg-paper/60 px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                        placeholder="Value"
                        value={m.value}
                        onChange={(e) =>
                          setDraftItem((p) => ({
                            ...p,
                            measurements: p.measurements.map((x, i) =>
                              i === idx ? { ...x, value: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraftItem((p) => ({
                            ...p,
                            measurements:
                              p.measurements.length === 1
                                ? [{ label: "", value: "" }]
                                : p.measurements.filter((_, i) => i !== idx),
                          }))
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/30 hover:bg-coral/10 hover:text-coral transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <datalist id="measurement-label-options">
                  {catalogMeasurementLabels.map((l) => <option key={l} value={l} />)}
                </datalist>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {modalError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-ink/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddItem}
                className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add to order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EDIT ORDER ITEMS MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {editingOrderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingOrderId(null); setEditingItems([]); setEditingError(""); } }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brass/10 text-brass">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Edit Order Items</p>
                  <p className="text-xs text-ink/40">#{editingOrderId.slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditingOrderId(null); setEditingItems([]); setEditingError(""); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/30 hover:bg-ink/8 hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body – scrollable */}
            <div className="overflow-y-auto p-6 space-y-4">
              {editingItems.map((item, itemIdx) => (
                <div key={itemIdx} className="rounded-xl border border-ink/10 bg-paper/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                      Item {itemIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingItems((p) => p.length === 1 ? p : p.filter((_, i) => i !== itemIdx))}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-ink/30 hover:bg-coral/10 hover:text-coral transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 sm:col-span-1">
                      <input
                        className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                        placeholder="Cloth type"
                        list="cloth-type-options"
                        value={item.clothType}
                        onChange={(e) =>
                          setEditingItems((p) =>
                            p.map((r, i) => i === itemIdx ? { ...r, clothType: e.target.value } : r)
                          )
                        }
                      />
                    </div>
                    <input
                      className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                      placeholder="Price (৳)"
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        setEditingItems((p) =>
                          p.map((r, i) => i === itemIdx ? { ...r, price: e.target.value } : r)
                        )
                      }
                    />
                    <input
                      className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                      placeholder="Qty"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        setEditingItems((p) =>
                          p.map((r, i) => i === itemIdx ? { ...r, quantity: e.target.value } : r)
                        )
                      }
                    />
                  </div>

                  {/* Measurements */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink/40 font-medium">Measurements</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItems((p) =>
                            p.map((r, i) =>
                              i === itemIdx ? { ...r, measurements: [...r.measurements, { label: "", value: "" }] } : r
                            )
                          )
                        }
                        className="text-xs text-teal font-medium hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {item.measurements.map((m, mIdx) => (
                      <div key={mIdx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                          placeholder="Label"
                          list="measurement-label-options"
                          value={m.label}
                          onChange={(e) =>
                            setEditingItems((p) =>
                              p.map((r, ri) =>
                                ri !== itemIdx ? r : {
                                  ...r, measurements: r.measurements.map((pair, pi) =>
                                    pi === mIdx ? { ...pair, label: e.target.value } : pair
                                  ),
                                }
                              )
                            )
                          }
                        />
                        <input
                          className="w-24 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15"
                          placeholder="Value"
                          value={m.value}
                          onChange={(e) =>
                            setEditingItems((p) =>
                              p.map((r, ri) =>
                                ri !== itemIdx ? r : {
                                  ...r, measurements: r.measurements.map((pair, pi) =>
                                    pi === mIdx ? { ...pair, value: e.target.value } : pair
                                  ),
                                }
                              )
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItems((p) =>
                              p.map((r, ri) =>
                                ri !== itemIdx ? r : {
                                  ...r,
                                  measurements:
                                    r.measurements.length === 1
                                      ? [{ label: "", value: "" }]
                                      : r.measurements.filter((_, pi) => pi !== mIdx),
                                }
                              )
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/30 hover:bg-coral/10 hover:text-coral transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setEditingItems((p) => [
                    ...p,
                    { clothType: catalogClothTypes[0] ?? "", price: "0", quantity: "1", measurements: [{ label: "", value: "" }] },
                  ])
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 py-2.5 text-sm text-ink/40 hover:border-teal/40 hover:text-teal transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add another item
              </button>

              <datalist id="cloth-type-options">
                {catalogClothTypes.map((t) => <option key={t} value={t} />)}
              </datalist>

              {editingError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {editingError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-ink/8 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => { setEditingOrderId(null); setEditingItems([]); setEditingError(""); }}
                className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEditedOrder(editingOrderId)}
                className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
