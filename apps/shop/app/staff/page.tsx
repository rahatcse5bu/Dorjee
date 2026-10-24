"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Crown, Mail, Pencil, Phone, Trash2, UserCog, UserPlus } from "lucide-react";
import { useToast } from "../../components/Toast";
import {
  Alert,
  btnIcon,
  btnPrimary,
  btnSecondary,
  cardClass,
  EmptyState,
  Field,
  inputClass,
  Modal,
  PageHeader,
  Skeleton,
} from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { RolePermissionsMatrix } from "../../components/RolePermissionsMatrix";
import { usePermissions } from "../../lib/permissions";
import { TranslationKey, useI18n } from "../../lib/i18n";
import { OPEN_STATUSES, Order, StaffMember } from "../../lib/orders";
import { errorMessage, useSession } from "../../lib/session";

const STAFF_ROLES = ["tailor", "shop_staff", "manager", "accountant"] as const;

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  active: boolean;
}

const emptyForm: StaffForm = { name: "", email: "", phone: "", role: "tailor", password: "", active: true };

export default function StaffPage() {
  const toast = useToast();
  const { t, num } = useI18n();
  const { user, token, shopId } = useSession();
  const canManageStaff = usePermissions().can("staff", "manage");
  const isShopOwner = user?.role === "shop_owner";
  const [tab, setTab] = useState<"team" | "roles">("team");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [staffResult, orderResult] = await Promise.all([
        apiRequest<StaffMember[]>(`/shops/${shopId}/staff`, {}, token),
        apiRequest<Order[]>(`/shops/${shopId}/orders`, {}, token).catch(() => []),
      ]);
      setStaff(staffResult);
      setOrders(orderResult);
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openOrders = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      if (order.assignedTo && OPEN_STATUSES.includes(order.status)) {
        counts[order.assignedTo] = (counts[order.assignedTo] ?? 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({
      name: member.name ?? "",
      email: member.email,
      phone: member.phone ?? "",
      role: member.role,
      password: "",
      active: member.active !== false,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editing) {
        const updated = await apiRequest<StaffMember>(
          `/shops/${shopId}/staff/${editing._id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              role: form.role,
              active: form.active,
              ...(form.password ? { password: form.password } : {}),
            }),
          },
          token,
        );
        setStaff((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
        toast(t("staff.updated"));
      } else {
        const created = await apiRequest<StaffMember>(
          `/shops/${shopId}/staff`,
          {
            method: "POST",
            body: JSON.stringify({
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              role: form.role,
              password: form.password,
            }),
          },
          token,
        );
        setStaff((prev) => [...prev, created]);
        toast(t("staff.created"));
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, t("common.somethingWrong")));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      const updated = await apiRequest<StaffMember>(
        `/shops/${shopId}/staff/${member._id}`,
        { method: "PATCH", body: JSON.stringify({ active: member.active === false }) },
        token,
      );
      setStaff((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      toast(t("staff.updated"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  async function remove(member: StaffMember) {
    if (!window.confirm(t("staff.removeConfirm"))) return;
    try {
      await apiRequest(`/shops/${shopId}/staff/${member._id}`, { method: "DELETE" }, token);
      setStaff((prev) => prev.filter((m) => m._id !== member._id));
      toast(t("staff.removed"));
    } catch (err) {
      toast(errorMessage(err, t("common.somethingWrong")), "error");
    }
  }

  const team = staff.filter((m) => m.role !== "shop_owner");
  const owners = staff.filter((m) => m.role === "shop_owner");

  return (
    <section className="space-y-5">
      <PageHeader
        title={t("staff.title")}
        subtitle={t("staff.sub")}
        actions={
          canManageStaff && tab === "team" ? (
            <button type="button" className={btnPrimary} onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              {t("staff.add")}
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-1 border-b border-ink/10" role="tablist">
        {(["team", "roles"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key ? "border-teal text-teal" : "border-transparent text-ink/55 hover:text-ink"
            }`}
          >
            {t(key === "team" ? "perm.tab.team" : "perm.tab.roles")}
          </button>
        ))}
      </div>

      {tab === "roles" ? (
        <RolePermissionsMatrix />
      ) : (
      <>
      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-ink/[0.06]">
            {[...owners, ...team].map((member) => {
              const isOwner = member.role === "shop_owner";
              const isSelf = member._id === user?.sub;
              const disabled = member.active === false;
              // Mirrors the API: only the owner may change managers (a manager may edit themselves).
              const canEdit = canManageStaff && !isOwner && (isShopOwner || member.role !== "manager" || isSelf);
              return (
                <li key={member._id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${disabled ? "opacity-60" : ""}`}>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isOwner ? "bg-brass/15 text-brass" : "bg-teal/10 text-teal"
                    }`}
                  >
                    {isOwner ? <Crown className="h-4 w-4" /> : (member.name || member.email)[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {member.name || member.email}
                      {isSelf && <span className="text-xs font-normal text-ink/45">({t("common.you")})</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink/55">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(openOrders[member._id] ?? 0) > 0 && (
                      <span className="text-xs text-ink/55">{t("staff.openOrders", { n: num(openOrders[member._id]) })}</span>
                    )}
                    <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-semibold text-ink/70">
                      {t(`role.${member.role}` as TranslationKey)}
                    </span>
                    {!isOwner && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          disabled ? "bg-coral/10 text-coral" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {disabled ? t("staff.disabled") : t("staff.active")}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      {!isSelf && (
                        <button type="button" className={`${btnSecondary} px-3 py-1.5 text-xs`} onClick={() => void toggleActive(member)}>
                          {disabled ? t("staff.enable") : t("staff.disable")}
                        </button>
                      )}
                      <button type="button" className={btnIcon} aria-label={t("common.edit")} onClick={() => openEdit(member)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          className={`${btnIcon} hover:bg-coral/10 hover:text-coral`}
                          aria-label={t("common.remove")}
                          onClick={() => void remove(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && team.length === 0 && (
          <EmptyState
            icon={UserCog}
            title={t("staff.empty")}
            action={
              canManageStaff ? (
                <button type="button" className={btnPrimary} onClick={openCreate}>
                  <UserPlus className="h-4 w-4" />
                  {t("staff.add")}
                </button>
              ) : undefined
            }
          />
        )}
      </div>
      </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("staff.edit") : t("staff.add")}
        icon={UserCog}
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="submit" form="staff-form" className={btnPrimary} disabled={saving}>
              {t("common.save")}
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.name")}>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label={`${t("common.phone")} (${t("common.optional")})`}>
              <input
                className={inputClass}
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
          </div>
          <Field label={t("common.email")}>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              disabled={!!editing}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="off"
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink/60">{t("staff.role")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAFF_ROLES.filter((role) => isShopOwner || role !== "manager" || editing?.role === "manager").map((role) => (
                <label
                  key={role}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                    form.role === role ? "border-teal bg-teal/5" : "border-ink/15 hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1 accent-teal"
                    checked={form.role === role}
                    onChange={() => setForm((f) => ({ ...f, role }))}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t(`role.${role}` as TranslationKey)}</span>
                    <span className="block text-xs text-ink/55">{t(`staff.roleHelp.${role}` as TranslationKey)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label={editing ? t("staff.resetPassword") : t("common.password")}
            hint={editing ? t("staff.resetHint") : t("auth.passwordHint")}
          >
            <input
              type="password"
              className={inputClass}
              value={form.password}
              minLength={6}
              required={!editing}
              autoComplete="new-password"
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>

          {formError && <Alert>{formError}</Alert>}
        </form>
      </Modal>
    </section>
  );
}
