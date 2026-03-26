"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

interface Shop {
  _id: string;
  subscriptionStatus?: string;
}

interface Payment {
  _id: string;
}

interface DashboardCard {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}

export default function DashboardPage() {
  const [cards, setCards] = useState<DashboardCard[]>([
    { label: "Total Shops", value: "-", icon: <BarChart3 className="w-5 h-5" />, color: "from-indigo-500 to-indigo-600" },
    { label: "Pending Payments", value: "-", icon: <AlertCircle className="w-5 h-5" />, color: "from-rose-500 to-rose-600" },
    { label: "Trial/Active Shops", value: "-", icon: <TrendingUp className="w-5 h-5" />, color: "from-cyan-500 to-cyan-600" },
    { label: "Projected MRR (BDT)", value: "-", icon: <DollarSign className="w-5 h-5" />, color: "from-green-500 to-green-600" },
  ]);

  useEffect(() => {
    async function loadSummary() {
      const token = getAdminToken();
      if (!token) {
        return;
      }

      const [shops, pending] = await Promise.all([
        apiRequest<Shop[]>("/shops", {}, token),
        apiRequest<Payment[]>("/admin/payments/pending", {}, token),
      ]);

      const activeLike = shops.filter((shop) => ["active", "trial"].includes(shop.subscriptionStatus ?? "")).length;
      const projectedMrr = activeLike * 500;

      setCards([
        { label: "Total Shops", value: String(shops.length), icon: <BarChart3 className="w-5 h-5" />, color: "from-indigo-500 to-indigo-600" },
        { label: "Pending Payments", value: String(pending.length), icon: <AlertCircle className="w-5 h-5" />, color: "from-rose-500 to-rose-600" },
        { label: "Trial/Active Shops", value: String(activeLike), icon: <TrendingUp className="w-5 h-5" />, color: "from-cyan-500 to-cyan-600" },
        { label: "Projected MRR (BDT)", value: String(projectedMrr), icon: <DollarSign className="w-5 h-5" />, color: "from-green-500 to-green-600" },
      ]);
    }

    void loadSummary();
  }, []);

  return (
    <section>
      <div className="mb-8 space-y-1">
        <h2 className="text-4xl font-bold text-slate">Command Center</h2>
        <p className="text-sm admin-quiet">Monitor billing, shop operations, and critical platform metrics.</p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article 
            key={card.label} 
            className={`group rounded-xl border border-white/40 bg-gradient-to-br ${card.color || "from-slate-100 to-slate-200"} p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{card.label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
              </div>
              {card.icon && (
                <div className="rounded-lg bg-white/25 p-2.5 text-white transition-all group-hover:bg-white/40">
                  {card.icon}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
