"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { CustomerFormModal } from "../../components/CustomerFormModal";
import { useToast } from "../../components/Toast";
import { Alert, btnIcon, btnPrimary, cardClass, EmptyState, inputClass, PageHeader, Skeleton } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Customer, dueAmount, Order } from "../../lib/orders";
import { usePermissions } from "../../lib/permissions";
import { errorMessage, useSession } from "../../lib/session";

interface CustomerStats {
  orders: number;
  due: number;
  lastOrder?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const toast = useToast();
  const { t, money, num, date } = useI18n();
  const { token, shopId } = useSession();
  const { can } = usePermissions();
  const canManage = can("customers", "manage");
  const canSeeAmounts = can("payments");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  async function load() {
    try {
      const [customerResult, orderResult] = await Promise.all([
        apiRequest<Customer[]>(`/shops/${shopId}/customers`, {}, token),
        apiRequest<Order[]>(`/shops/${shopId}/orders`, {}, token).catch(() => []),
      ]);
      setCustomers(customerResult);
      setOrders(orderResult);
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const result: Record<string, CustomerStats> = {};
    for (const order of orders) {
      const entry = (result[order.customerId] ??= { orders: 0, due: 0 });
      entry.orders += 1;
      entry.due += dueAmount(order);
      if (order.createdAt && (!entry.lastOrder || order.createdAt > entry.lastOrder)) entry.lastOrder = order.createdAt;
    }
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [customers, query]);

  async function onDelete(customer: Customer) {
    if (!window.confirm(t("customers.deleteConfirm"))) return;
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer._id}`, { method: "DELETE" }, token);
      setCustomers((prev) => prev.filter((c) => c._id !== customer._id));
      toast(t("customers.deleted"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.sub")}
        actions={
          canManage ? (
            <button type="button" className={btnPrimary} onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              {t("customers.add")}
            </button>
          ) : undefined
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          type="search"
          className={`${inputClass} pl-9`}
          placeholder={t("customers.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={customers.length === 0 ? t("customers.empty") : t("customers.emptySearch")}
            action={
              customers.length === 0 && canManage ? (
                <button type="button" className={btnPrimary} onClick={openCreate}>
                  <UserPlus className="h-4 w-4" />
                  {t("customers.add")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-ink/[0.06]">
            <li className="hidden grid-cols-[1.4fr_1fr_80px_110px_120px_88px] gap-4 bg-paper/60 px-4 py-3 text-xs font-semibold text-ink/50 md:grid">
              <span>{t("common.name")}</span>
              <span>{t("common.phone")}</span>
              <span className="text-right">{t("customers.col.orders")}</span>
              <span className="text-right">{t("customers.col.due")}</span>
              <span>{t("customers.col.lastOrder")}</span>
              <span />
            </li>
            {filtered.map((customer) => {
              const s = stats[customer._id] ?? { orders: 0, due: 0 };
              return (
                <li
                  key={customer._id}
                  onClick={() => router.push(`/customers/${customer._id}`)}
                  className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 transition-colors hover:bg-teal/[0.03] md:grid-cols-[1.4fr_1fr_80px_110px_120px_88px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                      {customer.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/customers/${customer._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium text-ink hover:text-teal"
                      >
                        {customer.name}
                      </Link>
                      <p className="truncate text-xs text-ink/50 md:hidden">{customer.phone}</p>
                    </div>
                  </div>
                  <span className="hidden text-sm text-ink/65 md:block">{customer.phone}</span>
                  <span className="hidden text-right text-sm text-ink/65 md:block">{num(s.orders)}</span>
                  <span className="text-right text-sm md:block">
                    {canSeeAmounts && s.due > 0 ? <span className="font-semibold text-coral">{money(s.due)}</span> : <span className="text-ink/30">—</span>}
                  </span>
                  <span className="hidden text-sm text-ink/55 md:block">{s.lastOrder ? date(s.lastOrder) : "—"}</span>
                  <div className="hidden items-center justify-end gap-0.5 md:flex" onClick={(e) => e.stopPropagation()}>
                    {canManage ? (
                    <>
                    <button
                      type="button"
                      className={btnIcon}
                      aria-label={t("common.edit")}
                      onClick={() => {
                        setEditing(customer);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                      <button
                        type="button"
                        className={`${btnIcon} hover:bg-coral/10 hover:text-coral`}
                        aria-label={t("common.delete")}
                        onClick={() => void onDelete(customer)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink/30" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false);
          if (editing) {
            setCustomers((prev) => prev.map((c) => (c._id === saved._id ? { ...c, ...saved } : c)));
            toast(t("customers.updated"));
          } else {
            toast(t("customers.created"));
            router.push(`/customers/${saved._id}`);
          }
        }}
      />
    </section>
  );
}
