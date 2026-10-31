"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, CheckCheck, UserCheck, UserMinus } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { AppNotification, useNotifications } from "../lib/notifications";

const PANEL_WIDTH = 360;

function timeAgo(iso: string, lang: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en", { numeric: "auto" });
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  return rtf.format(0, "minute");
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { t, num, lang } = useI18n();
  const { items, unread, markRead, markAllRead, message } = useNotifications();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  // The panel is portalled with fixed positioning so the sidebar's scroll area can't clip it.
  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - Math.min(PANEL_WIDTH, window.innerWidth - 16) - 8);
      setPosition({ top: rect.bottom + 8, left });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openNotification(n: AppNotification) {
    void markRead(n._id);
    setOpen(false);
    if (n.data.orderId) router.push(`/orders/${n.data.orderId}`);
  }

  const Icon = unread > 0 ? BellRing : Bell;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={unread ? `${t("notif.open")} (${t("notif.unreadCount", { n: unread })})` : t("notif.open")}
        aria-expanded={open}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 transition hover:bg-ink/[0.06] hover:text-ink ${className}`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : num(unread)}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("notif.title")}
            className="modal-panel fixed z-[70] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl"
            style={{ top: position.top, left: position.left, width: Math.min(PANEL_WIDTH, window.innerWidth - 16) }}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <p className="font-semibold text-ink">{t("notif.title")}</p>
              {unread > 0 && (
                <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t("notif.markAll")}
                </button>
              )}
            </div>

            <div className="overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink/50">{t("notif.empty")}</p>
              ) : (
                <ul className="divide-y divide-ink/[0.06]">
                  {items.map((n) => {
                    const isUnread = !n.readAt;
                    const ItemIcon = n.type === "order_assigned" ? UserCheck : UserMinus;
                    return (
                      <li key={n._id}>
                        <button
                          type="button"
                          onClick={() => openNotification(n)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-teal/[0.04] ${isUnread ? "bg-teal/[0.05]" : ""}`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              n.type === "order_assigned" ? "bg-teal/10 text-teal" : "bg-ink/[0.06] text-ink/50"
                            }`}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${isUnread ? "font-semibold text-ink" : "text-ink/70"}`}>{message(n)}</span>
                            <span className="mt-0.5 block text-xs text-ink/45">{timeAgo(n.createdAt, lang)}</span>
                          </span>
                          {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {permission === "default" && (
              <button
                type="button"
                onClick={() => void Notification.requestPermission().then(setPermission)}
                className="border-t border-ink/10 px-4 py-2.5 text-left text-xs font-semibold text-teal hover:bg-teal/5"
              >
                {t("notif.enableDesktop")}
              </button>
            )}
            {permission === "denied" && <p className="border-t border-ink/10 px-4 py-2.5 text-xs text-ink/45">{t("notif.desktopBlocked")}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
