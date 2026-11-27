"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, ClipboardList, KeyRound, MapPin, Phone, Plus, Store } from "lucide-react";
import { PortalStatus } from "../../components/customer/PortalBits";
import { useToast } from "../../components/Toast";
import { Alert, btnPrimary, btnSecondary, cardClass, EmptyState, inputClass, Skeleton } from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import { PortalMe, PortalOrder, portalOrderNo, portalRequest } from "../../lib/customer-portal";
import { errorMessage } from "../../lib/session";

export default function CustomerHomePage() {
  const { t, money, date } = useI18n();
  const toast = useToast();
  const [me, setMe] = useState<PortalMe | null>(null);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const load = useCallback(async () => {
    try {
      const [meResult, orderResult] = await Promise.all([
        portalRequest<PortalMe>("/me"),
        portalRequest<PortalOrder[]>("/orders"),
      ]);
      setMe(meResult);
      setOrders(orderResult);
      setError("");
    } catch (err) {
      setError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addShop(event: FormEvent) {
    event.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const result = await portalRequest<PortalMe>("/links", { method: "POST", body: JSON.stringify({ code }) });
      setMe(result);
      setOrders(await portalRequest<PortalOrder[]>("/orders"));
      setCode("");
      setAddOpen(false);
      toast(t("my.shopAdded"));
    } catch (err) {
      setAddError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const shops = me?.shops ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t("my.hello", { name: me?.customer.name ?? "" })}</h1>
      {error && <Alert>{error}</Alert>}

      {/* Tailors */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Store className="h-4 w-4 text-teal" />
            {t("my.yourShops")}
          </h2>
          {!addOpen && (
            <button type="button" className="text-sm font-semibold text-teal hover:text-teal/80" onClick={() => setAddOpen(true)}>
              + {t("my.addShop")}
            </button>
          )}
        </div>

        {addOpen && (
          <form onSubmit={addShop} className={`${cardClass} space-y-3 p-4`}>
            <p className="text-sm text-ink/60">{t("my.addShopHint")}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <input
                  className={`${inputClass} pl-9 font-mono uppercase tracking-[0.2em]`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  aria-label={t("my.code")}
                  required
                  minLength={6}
                  maxLength={20}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={adding} className={btnPrimary}>
                {t("common.add")}
              </button>
              <button type="button" className={btnSecondary} onClick={() => { setAddOpen(false); setAddError(""); }}>
                {t("common.cancel")}
              </button>
            </div>
            {addError && <Alert>{addError}</Alert>}
          </form>
        )}

        {shops.length === 0 ? (
          <div className={cardClass}>
            <EmptyState icon={Store} title={t("my.noShops")} />
          </div>
        ) : (
          <ul className="space-y-3">
            {shops.map((link) => (
              <li key={link.shop._id} className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{link.shop.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/55">
                      <a href={`tel:${link.shop.phone}`} className="flex items-center gap-1 hover:text-teal">
                        <Phone className="h-3 w-3" />
                        {link.shop.phone}
                      </a>
                      {link.shop.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {link.shop.address}
                        </span>
                      )}
                    </p>
                  </div>
                  {link.canOrder && (
                    <Link href={`/my/new?shop=${link.shop._id}`} className={btnPrimary}>
                      <Plus className="h-4 w-4" />
                      {t("my.orderAgain")}
                    </Link>
                  )}
                </div>
                {link.canOrder ? (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {link.garments.map((g) => (
                      <span key={g.clothType} className="rounded-full bg-teal/[0.08] px-2.5 py-1 text-xs font-medium text-teal">
                        {g.clothType}
                      </span>
                    ))}
                  </p>
                ) : (
                  link.blockedBy && <p className="mt-3 text-sm text-ink/55">{t(`my.block.${link.blockedBy}`)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Orders */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <ClipboardList className="h-4 w-4 text-teal" />
          {t("my.orders")}
        </h2>
        {orders.length === 0 ? (
          <div className={cardClass}>
            <EmptyState icon={ClipboardList} title={t("my.noOrders")} />
          </div>
        ) : (
          <ul className={`${cardClass} divide-y divide-ink/[0.07] overflow-hidden`}>
            {orders.map((order) => (
              <li key={order._id}>
                <Link href={`/my/orders/${order._id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-teal/[0.03] active:bg-ink/[0.03]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ink">{portalOrderNo(order)}</span>
                      <PortalStatus status={order.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-ink/75">
                      {order.items.map((i) => (i.quantity > 1 ? `${i.clothType} ×${i.quantity}` : i.clothType)).join(", ")}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink/50">
                      {shops.length > 1 && order.shop && <span>{order.shop.name}</span>}
                      {order.deliveryDate && order.status !== "delivered" && order.status !== "cancelled" && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {t("my.delivery", { date: date(order.deliveryDate) })}
                        </span>
                      )}
                      {order.due > 0 && order.status !== "draft" && (
                        <span className="font-semibold text-coral">{t("my.due", { amount: money(order.due) })}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
