"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, LucideIcon, X } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { STATUS_STYLE } from "../lib/orders";

export const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white/90 px-3 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/15 disabled:bg-ink/5 disabled:text-ink/50";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#126a74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink/75 transition hover:border-ink/25 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-coral/25 bg-white/80 px-4 py-2.5 text-sm font-medium text-coral transition hover:bg-coral/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 disabled:opacity-50";

export const btnIcon =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/45 transition hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30";

export const cardClass = "rounded-2xl border border-ink/10 bg-white/70";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm shop-quiet">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold text-ink/60">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/45">{hint}</span>}
    </label>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: { icon: AlertCircle, className: "border-red-200 bg-red-50 text-red-700" },
    success: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    info: { icon: Info, className: "border-ink/10 bg-ink/[0.03] text-ink/70" },
  }[kind];
  const Icon = styles.icon;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${styles.className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  const key = `status.${status}` as Parameters<typeof t>[0];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(key)}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/35">
        <Icon className="h-6 w-6" />
      </div>
      <p className="max-w-sm text-sm text-ink/55">{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink/[0.07] ${className}`} />;
}

export function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first field so keyboard users can start typing straight away.
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([disabled]), select, textarea",
    );
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  // Portalled to <body> so page-level transforms can't trap the fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`modal-panel flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${width}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <h2 className="truncate font-semibold text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className={btnIcon} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-ink/10 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
