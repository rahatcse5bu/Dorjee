"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../components/Toast";
import { apiRequest } from "./api";
import { getShopToken, getShopUser } from "./auth";
import { useI18n } from "./i18n";

const POLL_MS = 20_000;

export interface AppNotification {
  _id: string;
  type: "order_assigned" | "order_unassigned";
  data: { orderId?: string; orderNo?: number; customerName?: string; actorName?: string };
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsValue {
  items: AppNotification[];
  unread: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** The notification's text in the current language. */
  message: (n: AppNotification) => string;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  // Ids already seen, so only notifications that arrive later raise an alert.
  const seen = useRef<Set<string> | null>(null);

  const message = useCallback(
    (n: AppNotification) => {
      const no = n.data.orderNo ? `#${String(n.data.orderNo).padStart(4, "0")}` : "";
      return t(n.type === "order_assigned" ? "notif.assigned" : "notif.unassigned", {
        actor: n.data.actorName || t("notif.someone"),
        no,
        customer: n.data.customerName ?? "—",
      });
    },
    [t],
  );

  const load = useCallback(async () => {
    const shopId = getShopUser()?.shopId;
    const token = getShopToken();
    if (!shopId || !token) return;
    try {
      const result = await apiRequest<{ items: AppNotification[]; unread: number }>(`/shops/${shopId}/notifications`, {}, token);
      setItems(result.items);
      setUnread(result.unread);

      if (seen.current) {
        const fresh = result.items.filter((n) => !n.readAt && !seen.current!.has(n._id));
        for (const n of fresh) {
          toast(message(n));
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
            const alert = new Notification("Dorjee", { body: message(n), tag: n._id });
            alert.onclick = () => {
              window.focus();
              if (n.data.orderId) window.location.href = `/orders/${n.data.orderId}`;
            };
          }
        }
      }
      seen.current = new Set(result.items.map((n) => n._id));
    } catch {
      // Polling failures are silent; the next tick retries.
    }
  }, [message, toast]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const value = useMemo<NotificationsValue>(
    () => ({
      items,
      unread,
      message,
      markRead: async (id) => {
        const target = items.find((n) => n._id === id);
        if (!target || target.readAt) return;
        setItems((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
        setUnread((u) => Math.max(u - 1, 0));
        const shopId = getShopUser()?.shopId;
        await apiRequest(`/shops/${shopId}/notifications/${id}/read`, { method: "PATCH" }, getShopToken()).catch(() => undefined);
      },
      markAllRead: async () => {
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
        setUnread(0);
        const shopId = getShopUser()?.shopId;
        await apiRequest(`/shops/${shopId}/notifications/read-all`, { method: "POST" }, getShopToken()).catch(() => undefined);
      },
    }),
    [items, unread, message],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
