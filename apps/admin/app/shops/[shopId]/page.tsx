"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import PaymentsTable, { AdminPayment, planLabel } from "../../../components/PaymentsTable";
import RefundDialog from "../../../components/RefundDialog";
import ShopLimitsCard, { CustomerUsage } from "../../../components/ShopLimitsCard";
import { apiRequest } from "../../../lib/api";
import { getAdminToken, getAdminUser } from "../../../lib/auth";

interface Overview {
  shop: {
    _id: string;
    name: string;
    ownerName: string;
    phone: string;
    email?: string;
    address?: string;
    createdAt: string;
    clothTypes?: string[];
  };
  subscription: {
    status: string;
    planCode: string;
    months?: number;
    amountBdt: number;
    trialEndsAt?: string | null;
    nextBillingDate?: string | null;
  } | null;
  access: { locked: boolean; status: string; graceEndsAt?: string | null };
  users: Array<{ _id: string; email: string; name?: string; phone?: string; role: string; active?: boolean; createdAt: string }>;
  payments: AdminPayment[];
  limits: CustomerUsage;
  stats: {
    customers: number;
    orders: number;
    ordersLast30Days: number;
    delivered: number;
    orderValueBdt: number;
    collectedBdt: number;
    lastOrderAt: string | null;
    subscriptionPaidBdt: number;
  };
}

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  trial: { label: "Trial", className: "bg-sky-100 text-sky-700" },
  past_due: { label: "Past due", className: "bg-red-100 text-red-600" },
  expired: { label: "Expired", className: "bg-red-100 text-red-600" },
  cancelled: { label: "Cancelled", className: "bg-slate-200 text-slate-600" },
  inactive: { label: "No subscription", className: "bg-slate-100 text-slate-500" },
};

const ROLE: Record<string, string> = {
  shop_owner: "Owner",
  manager: "Manager",
  tailor: "Tailor",
  shop_staff: "Staff",
  accountant: "Accountant",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const taka = (n: number) => `৳${Math.round(n).toLocaleString()}`;

function Card({ title, icon: Icon, children, aside }: { title: string; icon: typeof Store; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ShopDetailsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState<string | undefined>();
  const [refunding, setRefunding] = useState<AdminPayment | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setError("Please login from /login with an admin account.");
      return;
    }
    try {
      setData(await apiRequest<Overview>(`/admin/shops/${shopId}`, {}, token));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shop");
    }
  }, [shopId]);

  useEffect(() => {
    setRole(getAdminUser()?.role);
    void load();
  }, [load]);

  const back = (
    <Link href="/shops" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="w-4 h-4" /> All shops
    </Link>
  );

  if (error) {
    return (
      <div>
        {back}
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {back}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading shop…
        </div>
      </div>
    );
  }

  const { shop, subscription, access, users, payments, stats } = data;
  const status = access.graceEndsAt ? { label: "Grace period", className: "bg-amber-100 text-amber-700" } : STATUS[access.status] ?? STATUS.inactive;
  const pending = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="max-w-6xl">
      {back}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Store className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{shop.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Joined {fmtDate(shop.createdAt)} · <span className="font-mono text-xs">{shop._id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>{status.label}</span>
          {access.locked && <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">Locked</span>}
        </div>
      </div>

      {notice && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          {notice}
        </div>
      )}

      {/* Usage */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Customers" value={stats.customers.toLocaleString()} />
        <Stat label="Orders" value={stats.orders.toLocaleString()} hint={`${stats.ordersLast30Days} in the last 30 days · ${stats.delivered} delivered`} />
        <Stat label="Order value" value={taka(stats.orderValueBdt)} hint={`${taka(stats.collectedBdt)} collected`} />
        <Stat label="Paid to Dorjee" value={taka(stats.subscriptionPaidBdt)} hint={stats.lastOrderAt ? `Last order ${fmtDate(stats.lastOrderAt)}` : "No orders yet"} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card title="Shop profile" icon={Store}>
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              { icon: UserRound, label: "Owner", value: shop.ownerName },
              { icon: Phone, label: "Phone", value: shop.phone, mono: true },
              { icon: Mail, label: "Email", value: shop.email },
              { icon: MapPin, label: "Address", value: shop.address },
              { icon: ClipboardList, label: "Cloth types", value: shop.clothTypes?.length ? shop.clothTypes.join(", ") : undefined },
            ].map(({ icon: Icon, label, value, mono }) => (
              <div key={label} className="flex items-start gap-3 px-5 py-3">
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <dt className="w-24 flex-shrink-0 text-slate-500">{label}</dt>
                <dd className={`min-w-0 break-words text-slate-800 ${mono ? "font-mono text-xs leading-5" : ""}`}>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Subscription */}
        <Card title="Subscription" icon={CalendarDays}>
          {subscription ? (
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-5 py-3">
                <dt className="text-slate-500">Plan</dt>
                <dd className="font-medium text-slate-800">
                  {planLabel(subscription.months ?? 1)} · {taka(subscription.amountBdt)}
                </dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">{status.label}</dd>
              </div>
              {subscription.trialEndsAt && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-slate-500">Trial ends</dt>
                  <dd className="font-medium text-slate-800">{fmtDate(subscription.trialEndsAt)}</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="text-slate-500">{subscription.status === "trial" ? "First bill" : "Paid until"}</dt>
                <dd className="font-medium text-slate-800">{fmtDate(subscription.nextBillingDate)}</dd>
              </div>
              {access.graceEndsAt && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="text-slate-500">Grace ends</dt>
                  <dd className="font-medium text-amber-700">{fmtDate(access.graceEndsAt)}</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="text-slate-500">Pending payments</dt>
                <dd className={`font-medium ${pending ? "text-amber-700" : "text-slate-800"}`}>
                  {pending ? (
                    <Link href="/payments" className="hover:underline">
                      {pending} to review
                    </Link>
                  ) : (
                    "None"
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">This shop has no subscription record.</p>
          )}
        </Card>
      </div>

      {/* Limits */}
      <div className="mb-6">
        <ShopLimitsCard
          shopId={shop._id}
          usage={data.limits}
          canEdit={role === "super_admin" || role === "admin_finance"}
          onSaved={(limits) => setData((d) => (d ? { ...d, limits } : d))}
        />
      </div>

      {/* Team */}
      <div className="mb-6">
        <Card title="Team" icon={Users} aside={<span className="text-xs text-slate-400">{users.length} accounts</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Name", "Email", "Phone", "Role", "Status", "Added"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{u.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{u.phone || "—"}</td>
                    <td className="px-5 py-3 text-slate-700">{ROLE[u.role] ?? u.role}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                        {u.active === false ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No accounts.</p>}
          </div>
        </Card>
      </div>

      {/* Payments */}
      <Card title="Subscription payments" icon={CreditCard} aside={<Wallet className="w-4 h-4 text-slate-300" />}>
        <PaymentsTable payments={payments} role={role} onRefund={setRefunding} />
      </Card>

      {refunding && (
        <RefundDialog
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            setNotice("Refund recorded.");
            setTimeout(() => setNotice(""), 4000);
            void load();
          }}
        />
      )}
    </div>
  );
}
