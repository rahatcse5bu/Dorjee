"use client";

import { useEffect, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TranslationKey, useI18n } from "../lib/i18n";
import {
  CONFIGURABLE_ROLES,
  MODULES,
  PermissionLevel,
  PermissionMatrix,
  PermissionModule,
  usePermissions,
} from "../lib/permissions";
import { errorMessage, useSession } from "../lib/session";
import { useToast } from "./Toast";
import { Alert, btnPrimary, cardClass } from "./ui";

const LEVELS: PermissionLevel[] = ["none", "view", "manage"];

const LEVEL_STYLE: Record<PermissionLevel, string> = {
  none: "bg-ink/[0.08] text-ink ring-ink/20",
  view: "bg-blue-50 text-blue-700 ring-blue-200",
  manage: "bg-teal text-white ring-teal",
};

/** Owner-editable grid of what each staff role can do per module. */
export function RolePermissionsMatrix() {
  const { t } = useI18n();
  const toast = useToast();
  const { user, token, shopId } = useSession();
  const { matrix: loaded, refresh } = usePermissions();
  const isOwner = user?.role === "shop_owner";
  const [matrix, setMatrix] = useState<PermissionMatrix>(loaded);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMatrix(loaded), [loaded]);

  const dirty = JSON.stringify(matrix) !== JSON.stringify(loaded);

  function setLevel(role: string, module: PermissionModule, level: PermissionLevel) {
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [module]: level } }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/permissions`, { method: "PUT", body: JSON.stringify({ roles: matrix }) }, token);
      await refresh();
      toast(t("perm.saved"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded[CONFIGURABLE_ROLES[0]]) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-teal" />
            {t("perm.title")}
          </h2>
          <p className="text-sm text-ink/55">{t("perm.sub")}</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-3">
            {dirty && <span className="text-sm font-medium text-amber-700">{t("catalog.unsaved")}</span>}
            <button type="button" className={btnPrimary} disabled={!dirty || saving} onClick={() => void save()}>
              <Save className="h-4 w-4" />
              {t("common.saveChanges")}
            </button>
          </div>
        )}
      </div>

      {!isOwner && <Alert kind="info">{t("perm.readOnly")}</Alert>}

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-paper/60 text-left text-xs font-semibold text-ink/55">
              <th className="px-4 py-3">{t("perm.module")}</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th key={role} className="px-3 py-3 text-center">
                  {t(`role.${role}` as TranslationKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {MODULES.map((module) => (
              <tr key={module}>
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-ink">{t(`perm.m.${module}` as TranslationKey)}</p>
                  <p className="mt-0.5 max-w-[260px] text-xs leading-snug text-ink/50">{t(`perm.d.${module}` as TranslationKey)}</p>
                </td>
                {CONFIGURABLE_ROLES.map((role) => {
                  const current = matrix[role]?.[module] ?? "none";
                  return (
                    <td key={role} className="px-3 py-3 text-center align-middle">
                      <div
                        role="radiogroup"
                        aria-label={`${t(`role.${role}` as TranslationKey)}: ${t(`perm.m.${module}` as TranslationKey)}`}
                        className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-ink/10"
                      >
                        {LEVELS.map((level) => {
                          const active = current === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              disabled={!isOwner}
                              onClick={() => setLevel(role, module, level)}
                              className={`px-2.5 py-1.5 text-xs font-semibold transition ${
                                active ? `${LEVEL_STYLE[level]} ring-1 ring-inset` : "text-ink/40 hover:bg-ink/[0.04] hover:text-ink/70"
                              } disabled:cursor-default`}
                            >
                              {t(`perm.level.${level}` as TranslationKey)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
