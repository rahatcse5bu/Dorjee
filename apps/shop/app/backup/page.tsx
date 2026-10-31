"use client";

import { DragEvent, useRef, useState } from "react";
import { AlertTriangle, DatabaseBackup, Download, FileJson, Lock, RotateCcw, Upload } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Alert, btnDanger, btnPrimary, btnSecondary, cardClass, EmptyState, PageHeader } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { errorMessage, useSession } from "../../lib/session";

interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  shop: { name?: string; clothTypes?: string[] };
  customers: unknown[];
  orders: unknown[];
}

interface RestoreResult {
  mode: "merge" | "replace";
  customers: { added: number; matched: number; skipped: number };
  orders: { added: number; skipped: number };
}

function isBackup(value: unknown): value is BackupFile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<BackupFile>;
  return v.format === "dorjee-backup" && Array.isArray(v.customers) && Array.isArray(v.orders) && typeof v.shop === "object";
}

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const { t, num, date } = useI18n();
  const toast = useToast();
  const { user, token, shopId } = useSession();
  const fileInput = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [dragging, setDragging] = useState(false);

  if (user?.role !== "shop_owner") {
    return <EmptyState icon={Lock} title={t("backup.ownerOnly")} />;
  }

  /** Downloads the shop's current data; returns false if it failed. */
  async function downloadBackup(silent = false) {
    setExporting(true);
    try {
      const data = await apiRequest<BackupFile>(`/shops/${shopId}/backup`, {}, token);
      const slug = (data.shop.name ?? "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "shop";
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      downloadJson(data, `dorjee-backup-${slug}-${stamp}.json`);
      if (!silent) toast(t("backup.exported"));
      return true;
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
      return false;
    } finally {
      setExporting(false);
    }
  }

  async function readFile(file: File) {
    setFileError("");
    setResult(null);
    setBackup(null);
    setConfirmed(false);
    setFileName(file.name);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackup(parsed)) throw new Error("invalid");
      setBackup(parsed);
    } catch {
      setFileError(t("backup.invalid"));
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  async function restore() {
    if (!backup) return;
    setRestoring(true);
    try {
      // A replace deletes current records, so keep a copy of them first.
      if (mode === "replace" && !(await downloadBackup(true))) return;
      const res = await apiRequest<RestoreResult>(
        `/shops/${shopId}/backup/restore`,
        { method: "POST", body: JSON.stringify({ mode, backup }) },
        token,
      );
      setResult(res);
      setBackup(null);
      setFileName("");
      toast(t("backup.done"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setRestoring(false);
    }
  }

  const counts = backup
    ? [
        { label: t("backup.count.customers"), value: backup.customers.length },
        { label: t("backup.count.orders"), value: backup.orders.length },
        { label: t("backup.count.types"), value: backup.shop.clothTypes?.length ?? 0 },
      ]
    : [];

  return (
    <section className="space-y-5">
      <PageHeader title={t("backup.title")} subtitle={t("backup.sub")} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Export */}
        <div className={`${cardClass} flex flex-col p-6`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Download className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">{t("backup.exportTitle")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("backup.exportBody")}</p>
          <p className="mt-3 text-xs text-ink/50">{t("backup.tip")}</p>
          <div className="mt-auto pt-5">
            <button type="button" className={btnPrimary} disabled={exporting} onClick={() => void downloadBackup()}>
              <DatabaseBackup className="h-4 w-4" />
              {exporting ? t("backup.exporting") : t("backup.exportButton")}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className={`${cardClass} flex flex-col p-6`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass/15 text-brass">
            <Upload className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">{t("backup.importTitle")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("backup.importBody")}</p>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />

          {!backup && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                dragging ? "border-teal bg-teal/5" : "border-ink/15"
              }`}
            >
              <button type="button" className={btnSecondary} onClick={() => fileInput.current?.click()}>
                <FileJson className="h-4 w-4" />
                {t("backup.choose")}
              </button>
              <p className="text-xs text-ink/45">{t("backup.dropHint")}</p>
            </div>
          )}
          {fileError && (
            <div className="mt-3">
              <Alert>
                {fileError} <span className="text-red-600/70">({fileName})</span>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {/* Preview and restore options */}
      {backup && (
        <div className={`${cardClass} space-y-5 p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/[0.06] text-ink/60">
                <FileJson className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{t("backup.preview", { shop: backup.shop.name ?? "—" })}</p>
                <p className="text-xs text-ink/50">
                  {t("backup.previewDate", { date: date(backup.exportedAt) })} · {fileName}
                </p>
              </div>
            </div>
            <button type="button" className="text-sm font-medium text-teal hover:underline" onClick={() => setBackup(null)}>
              {t("backup.cancel")}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {counts.map((c) => (
              <div key={c.label} className="rounded-xl bg-paper px-4 py-3">
                <p className="text-xs text-ink/55">{c.label}</p>
                <p className="text-xl font-bold text-ink">{num(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2" role="radiogroup">
            {(["merge", "replace"] as const).map((option) => {
              const on = mode === option;
              const danger = option === "replace";
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                    on ? (danger ? "border-coral bg-coral/5" : "border-teal bg-teal/5") : "border-ink/15 hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="restore-mode"
                    className="mt-1 h-4 w-4 shrink-0 self-start accent-teal"
                    checked={on}
                    onChange={() => {
                      setMode(option);
                      setConfirmed(false);
                    }}
                  />
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      {option === "merge" ? t("backup.mode.merge") : t("backup.mode.replace")}
                      {option === "merge" && (
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">{t("backup.recommended")}</span>
                      )}
                      {danger && <AlertTriangle className="h-4 w-4 text-coral" />}
                    </span>
                    <span className="mt-1 block text-sm text-ink/60">
                      {option === "merge" ? t("backup.mode.mergeBody") : t("backup.mode.replaceBody")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {mode === "replace" && (
            <label className="flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/5 px-4 py-3 text-sm text-ink/80">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              {t("backup.confirmReplace")}
            </label>
          )}

          <p className="text-xs text-ink/50">{t("backup.staffNote")}</p>

          <div className="flex justify-end">
            <button
              type="button"
              className={mode === "replace" ? btnDanger : btnPrimary}
              disabled={restoring || (mode === "replace" && !confirmed)}
              onClick={() => void restore()}
            >
              <RotateCcw className="h-4 w-4" />
              {restoring ? t("backup.restoring") : t("backup.restore")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <Alert kind="success">
          <span className="font-semibold">{t("backup.done")}.</span>{" "}
          {t("backup.result", {
            cAdded: result.customers.added,
            cMatched: result.customers.matched,
            oAdded: result.orders.added,
            oSkipped: result.orders.skipped,
          })}
        </Alert>
      )}
    </section>
  );
}
