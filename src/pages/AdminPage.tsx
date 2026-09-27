import { useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Alert from "@/components/feedback/Alert";
import Drawer from "@/components/feedback/Drawer";
import Modal from "@/components/feedback/Modal";
import Checkbox from "@/components/forms/Checkbox";
import { SelectField, TextField } from "@/components/forms/Field";
import Switch from "@/components/forms/Switch";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { internalNavItems, type PageId } from "@/components/layout/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import {
  allRoles,
  permissionKeys,
  permissionModules,
  roleResponsibilities,
  sensitivePermissions,
  settingsGroups,
} from "@/data/adminData";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { LoginEvent, PermissionKey, StaffMember, StaffRole } from "@/types";

export type AdminIntent = "settings" | null;

type AdminView = "Users" | "Roles & Permissions" | "Settings";

function InviteUserModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: { name: string; email: string; phone: string; role: StaffRole; branch: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("Sales Representative");
  const [branch, setBranch] = useState("Vapi Plant");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRole("Sales Representative");
      setBranch("Vapi Plant");
      setError(undefined);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="invite-title">
      <div className="modal-icon royal-icon"><Icon name="user" /></div>
      <h2 id="invite-title">Invite a user</h2>
      <p>They receive a sign-in invite with the selected role. Permissions come from the role matrix.</p>
      <TextField label="Full name" required value={name} onChange={e => { setName(e.target.value); setError(undefined); }} error={error} />
      <TextField label="Email" required placeholder="name@maharajasoap.in" value={email} onChange={e => setEmail(e.target.value)} />
      <div className="modal-field-row">
        <SelectField label="Role" value={role} onChange={e => setRole(e.target.value as StaffRole)}>
          {allRoles.map(r => <option key={r}>{r}</option>)}
        </SelectField>
        <SelectField label="Branch" value={branch} onChange={e => setBranch(e.target.value)}>
          <option>Vapi Plant</option><option>Ahmedabad Depot</option><option>Delhi Depot</option>
        </SelectField>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!name.trim() || !email.trim()) return setError("Name and email are required");
            onSubmit({ name: name.trim(), email: email.trim(), phone: "98290 000" + String(Math.min(99, name.length * 7)).padStart(2, "0"), role, branch });
          }}
        >
          Send invite
        </Button>
      </div>
    </Modal>
  );
}

export default function AdminPage({
  intent,
  onIntentHandled,
  onOpenInternal,
}: {
  intent: AdminIntent;
  onIntentHandled: () => void;
  /* Design-foundation pages live here, out of the business navigation. */
  onOpenInternal?: (page: PageId) => void;
}) {
  const toast = useToast();
  const { staff, updateStaff, addStaff, logAudit } = useTeam();
  const { rolePermissions, loginEvents, sessions, settings, activeRole, setActiveRole, togglePermission, resetRole, revokeSession, updateSetting, currentUser } = useAdmin();

  const [view, setView] = useState<AdminView>("Users");
  const [role, setRole] = useState<StaffRole>("Sales Representative");
  const [sectionId, setSectionId] = useState(settings[0]?.id ?? "company");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  useEffect(() => {
    if (intent === "settings") {
      setView("Settings");
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  /* ---------- Users ---------- */

  const [loginDetail, setLoginDetail] = useState<LoginEvent | null>(null);

  const lastLogin = (name: string) => loginEvents.find(e => e.user === name && e.result === "Success")?.time ?? "Never";

  const changeRole = (member: StaffMember, next: StaffRole) => {
    if (next === member.role) return;
    setConfirm({
      title: `Change ${member.name}'s role?`,
      message: <>From <b>{member.role}</b> to <b>{next}</b>. Their permissions update immediately from the role matrix.</>,
      confirmLabel: "Change role",
      action: () => {
        updateStaff(member.id, { role: next });
        logAudit({ user: currentUser, action: "Role changed", module: "Users & Roles", record: member.name, oldValue: member.role, newValue: next });
        setConfirm(null);
        toast({ tone: "success", title: "Role updated", message: `${member.name} is now ${next}.` });
      },
    });
  };

  const toggleActive = (member: StaffMember) =>
    setConfirm({
      title: member.active ? `Deactivate ${member.name}?` : `Reactivate ${member.name}?`,
      danger: member.active,
      message: member.active
        ? "They lose sign-in access and their sessions end. History stays intact."
        : "They regain sign-in access with their existing role.",
      confirmLabel: member.active ? "Deactivate" : "Reactivate",
      action: () => {
        updateStaff(member.id, { active: !member.active });
        logAudit({ user: currentUser, action: member.active ? "User deactivated" : "User reactivated", module: "Users & Roles", record: member.name, oldValue: member.active ? "Active" : "Inactive", newValue: member.active ? "Inactive" : "Active" });
        setConfirm(null);
        toast({ tone: member.active ? "warning" : "success", title: member.active ? "User deactivated" : "User reactivated", message: member.name });
      },
    });

  const userColumns: Column<StaffMember>[] = [
    {
      key: "name", label: "User", sortable: true, hideable: false, sortValue: s => s.name,
      render: s => (
        <span className="table-product">
          <span className="avatar" aria-hidden="true">{s.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}</span>
          <span><b>{s.name}</b><small>{s.email}</small></span>
        </span>
      ),
    },
    {
      key: "role", label: "Role", sortable: true, sortValue: s => s.role,
      render: s => (
        <select aria-label={`Role for ${s.name}`} value={s.role} onChange={e => changeRole(s, e.target.value as StaffRole)}>
          {allRoles.map(r => <option key={r}>{r}</option>)}
        </select>
      ),
    },
    { key: "branch", label: "Branch", defaultHidden: true, render: s => s.branch },
    { key: "login", label: "Last login", render: s => lastLogin(s.name) },
    { key: "status", label: "Status", render: s => <Badge tone={s.active ? "emerald" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", label: "", hideable: false,
      render: s => (
        <button type="button" className={`link-btn${s.active ? " danger-link" : ""}`} onClick={() => toggleActive(s)}>
          {s.active ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ];

  /* ---------- Roles ---------- */

  const matrix = rolePermissions[role];
  const grantedCount = useMemo(() => Object.values(matrix).reduce((s, perms) => s + perms.length, 0), [matrix]);

  const onTogglePermission = (module: string, permission: PermissionKey) => {
    const has = matrix[module]?.includes(permission);
    const apply = () => {
      togglePermission(role, module, permission);
      logAudit({
        user: currentUser, action: has ? "Permission revoked" : "Permission granted", module: "Users & Roles",
        record: `${role} · ${module}`, oldValue: has ? `${permission} allowed` : `${permission} denied`, newValue: has ? `${permission} denied` : `${permission} allowed`,
      });
    };
    if (!has && sensitivePermissions.includes(permission)) {
      setConfirm({
        title: `Grant “${permission}” on ${module}?`,
        message: <>Every <b>{role}</b> gains this immediately. Security-sensitive grants are logged to the audit trail.</>,
        confirmLabel: "Grant permission",
        action: () => {
          apply();
          setConfirm(null);
          toast({ tone: "success", title: "Permission granted", message: `${role} · ${module} · ${permission}` });
        },
      });
    } else {
      apply();
    }
  };

  const capabilitySummary = useMemo(() => {
    const canSee = permissionModules.filter(m => matrix[m]?.includes("View"));
    const canApprove = permissionModules.filter(m => matrix[m]?.includes("Approve"));
    const financial = permissionModules.some(m => matrix[m]?.includes("View Financial Data"));
    const profit = permissionModules.some(m => matrix[m]?.includes("View Profit"));
    return { canSee, canApprove, financial, profit };
  }, [matrix]);

  /* ---------- Settings ---------- */

  const section = settings.find(s => s.id === sectionId) ?? settings[0];

  const changeSetting = (key: string, label: string, value: string | boolean, old: string | boolean) => {
    const apply = () => {
      updateSetting(section.id, key, value);
      logAudit({
        user: currentUser, action: "Setting changed", module: "Settings",
        record: `${section.title} · ${label}`, oldValue: String(old), newValue: String(value),
      });
    };
    if (section.sensitive && typeof value === "boolean") {
      setConfirm({
        title: `Change “${label}”?`,
        danger: true,
        message: <>This is a security-sensitive setting. The change applies to every sign-in and is logged with your name.</>,
        confirmLabel: "Apply change",
        action: () => {
          apply();
          setConfirm(null);
          toast({ tone: "warning", title: "Security setting changed", message: `${label} → ${value ? "on" : "off"}` });
        },
      });
    } else {
      apply();
      if (typeof value === "boolean") toast({ tone: "success", title: "Setting saved", message: `${label} → ${value ? "on" : "off"}` });
    }
  };

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">ADMINISTRATION · USERS, ROLES & SETTINGS</p>
          <h1>Control, without friction.</h1>
          <p>Who signs in, what each role can touch, and how the system behaves — with confirmations on anything sensitive.</p>
        </div>
        <div className="detail-actions">
          <div className="role-switch">
            <span>Working as</span>
            <select
              aria-label="Active role — drives navigation and action visibility"
              value={activeRole}
              onChange={e => {
                const next = e.target.value as StaffRole;
                setActiveRole(next);
                logAudit({ user: currentUser, action: "Active role switched", module: "Settings", record: "Role preview", oldValue: activeRole, newValue: next });
                toast({ tone: "info", title: `Working as ${next}`, message: "Navigation and actions now reflect this role's permissions." });
              }}
            >
              {allRoles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <Button onClick={() => { setView("Users"); setInviteOpen(true); }}><Icon name="plus" /> Invite user</Button>
        </div>
      </div>
      {activeRole !== "Approving Manager" && activeRole !== "System Administrator" && (
        <Alert tone="warning" title={`Role preview active — ${activeRole}`}>
          The sidebar and approval actions are limited to this role's permissions. Switch back to Approving Manager for full access.
        </Alert>
      )}
      <Tabs tabs={["Users", "Roles & Permissions", "Settings"]} active={view} onChange={v => setView(v as AdminView)} label="Administration views" />

      {view === "Users" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Users" value={String(staff.length)} note={`${staff.filter(s => s.active).length} active`} icon="users" iconTone="royal" />
            <KpiCard label="Roles in use" value={String(new Set(staff.map(s => s.role)).size)} note="Of 8 business roles" icon="shield" iconTone="gold" />
            <KpiCard label="Active sessions" value={String(sessions.length)} note="Signed in right now" icon="key" iconTone="emerald" />
            <KpiCard label="Failed sign-ins" value={String(loginEvents.filter(e => e.result === "Failed").length)} note="Past 7 days" noteTone="warning" icon="warning" iconTone="gold" />
          </div>
          <section className="panel table-panel">
            <div className="section-head">
              <div><p className="kicker">USERS</p><h2>{staff.length} people can sign in</h2></div>
              <Button variant="secondary" onClick={() => setInviteOpen(true)}><Icon name="plus" /> Invite user</Button>
            </div>
            <DataTable columns={userColumns} rows={staff} rowKey={s => s.id} pageSize={8} emptyState={<EmptyState icon="users" title="No users" description="" mini />} />
          </section>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">LOGIN HISTORY</p><h2>Recent sign-ins</h2></div></div>
              <div className="feed">
                {loginEvents.map(e => (
                  <button key={e.id} type="button" onClick={() => setLoginDetail(e)}>
                    <span className={`feed-icon ${e.result === "Success" ? "emerald" : "amber"}`}><Icon name={e.result === "Success" ? "key" : "warning"} size={15} /></span>
                    <span className="feed-body">
                      <strong>{e.user}</strong>
                      <small>{e.device} · {e.ip} · {e.time}</small>
                    </span>
                    <Badge tone={e.result === "Success" ? "emerald" : "danger"}>{e.result}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">SESSIONS</p><h2>{sessions.length} active</h2></div></div>
              <div className="task-list">
                {sessions.map(s => (
                  <div key={s.id} className="task-row">
                    <div className="task-body">
                      <strong>{s.user}{s.current ? " · this device" : ""}</strong>
                      <small>{s.device} · {s.ip}</small>
                      <small className="muted">Started {s.started} · active {s.lastActive}</small>
                    </div>
                    {s.current ? (
                      <Badge tone="emerald">Current</Badge>
                    ) : (
                      <button
                        type="button"
                        className="link-btn danger-link"
                        onClick={() =>
                          setConfirm({
                            title: `Revoke ${s.user}'s session?`,
                            danger: true,
                            message: <>{s.device} · {s.ip}. They are signed out immediately and must sign in again.</>,
                            confirmLabel: "Revoke session",
                            action: () => {
                              revokeSession(s.id);
                              logAudit({ user: currentUser, action: "Session revoked", module: "Settings", record: `${s.id} · ${s.user}`, oldValue: "Active", newValue: "Revoked" });
                              setConfirm(null);
                              toast({ tone: "warning", title: "Session revoked", message: `${s.user} · ${s.device}` });
                            },
                          })
                        }
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {view === "Roles & Permissions" && (
        <>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">ROLE</p><h2>{role} · {grantedCount} permissions</h2></div>
              <div className="table-actions">
                <select aria-label="Role" value={role} onChange={e => setRole(e.target.value as StaffRole)}>
                  {allRoles.map(r => <option key={r}>{r}</option>)}
                </select>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirm({
                      title: `Reset ${role} to defaults?`,
                      danger: true,
                      message: "Any custom grants and revocations for this role are discarded.",
                      confirmLabel: "Reset role",
                      action: () => {
                        resetRole(role);
                        logAudit({ user: currentUser, action: "Role reset to defaults", module: "Users & Roles", record: role });
                        setConfirm(null);
                        toast({ tone: "warning", title: "Role reset", message: `${role} permissions restored to defaults.` });
                      },
                    })
                  }
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
            <Alert tone="info" title={`What a ${role} can do right now`}>
              {roleResponsibilities[role]}{" "}
              Sees {capabilitySummary.canSee.length} of {permissionModules.length} modules
              {capabilitySummary.canApprove.length ? ` · approves in ${capabilitySummary.canApprove.join(", ")}` : " · no approval rights"}
              {capabilitySummary.financial ? " · sees financial data" : " · financial data hidden"}
              {capabilitySummary.profit ? " · sees profit" : " · profit hidden"}.
            </Alert>
            <div className="table-wrap perm-matrix">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    {permissionKeys.map(p => <th key={p}>{p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {permissionModules.map(module => (
                    <tr key={module}>
                      <td><b>{module}</b></td>
                      {permissionKeys.map(p => (
                        <td key={p}>
                          <Checkbox
                            checked={matrix[module]?.includes(p) ?? false}
                            onChange={() => onTogglePermission(module, p)}
                            label={`${p} on ${module} for ${role}`}
                            hideLabel
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {view === "Settings" && (
        <div className="settings-grid">
          <nav className="settings-nav panel" aria-label="Settings sections">
            {settingsGroups.map(group => (
              <div key={group} className="settings-group">
                <span className="nav-label">{group.toUpperCase()}</span>
                {settings.filter(s => s.group === group).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={s.id === section.id ? "active" : ""}
                    onClick={() => setSectionId(s.id)}
                  >
                    {s.title}
                    {s.sensitive && <Icon name="lock" size={13} />}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <section className="panel settings-pane">
            <div className="section-head">
              <div><p className="kicker">{section.group.toUpperCase()} SETTINGS</p><h2>{section.title}</h2></div>
              {section.sensitive && <Badge tone="danger">Security-sensitive</Badge>}
            </div>
            <p className="muted">{section.description}</p>
            {section.id === "users" && (
              <Alert tone="info" title="Manage people on the Users tab">
                <button type="button" className="link-btn" onClick={() => setView("Users")}>Open user management</button>
              </Alert>
            )}
            {section.id === "roles" && (
              <Alert tone="info" title="Edit the matrix on the Roles & Permissions tab">
                <button type="button" className="link-btn" onClick={() => setView("Roles & Permissions")}>Open the permission matrix</button>
              </Alert>
            )}
            {section.id === "licensing" && onOpenInternal && (
              <>
                <Alert tone="info" title="Internal design reference">
                  The brand foundations, design system, component library and shell anatomy are kept for
                  implementation handover. They are not part of the business navigation.
                </Alert>
                <div className="chip-row" style={{ marginTop: 12 }}>
                  {internalNavItems.map(item => (
                    <Button key={item.id} variant="secondary" onClick={() => onOpenInternal(item.id)}>
                      <Icon name={item.icon} /> {item.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="settings-fields">
              {section.fields.map(f =>
                f.type === "toggle" ? (
                  <div key={f.key} className="settings-row">
                    <div>
                      <strong>{f.label}</strong>
                      {f.helper && <small>{f.helper}</small>}
                    </div>
                    <Switch on={Boolean(f.value)} onChange={next => changeSetting(f.key, f.label, next, f.value)} label={f.label} />
                  </div>
                ) : (
                  <TextField
                    key={f.key}
                    label={f.label}
                    value={String(f.value)}
                    onChange={e => updateSetting(section.id, f.key, e.target.value)}
                  />
                ),
              )}
            </div>
            <div className="form-actions">
              <Button
                onClick={() => {
                  logAudit({ user: currentUser, action: "Settings saved", module: "Settings", record: section.title });
                  toast({ tone: "success", title: `${section.title} saved`, message: "Changes recorded in the audit trail." });
                }}
              >
                Save {section.title.toLowerCase()} settings
              </Button>
            </div>
          </section>
        </div>
      )}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={draft => {
          const created = addStaff(draft);
          logAudit({ user: currentUser, action: "User invited", module: "Users & Roles", record: `${created.name} · ${created.role}`, newValue: created.email });
          setInviteOpen(false);
          toast({ tone: "success", title: "Invite sent", message: `${created.name} joins as ${created.role} (demo).` });
        }}
      />

      {/* A sign-in row is worth opening: the security review question is always
          "who, from where, on what, and did it succeed". */}
      <Drawer
        open={Boolean(loginDetail)}
        onClose={() => setLoginDetail(null)}
        eyebrow="SIGN-IN EVENT"
        title={loginDetail ? `${loginDetail.user} · ${loginDetail.result}` : ""}
      >
        {loginDetail && (
          <>
            <div className="detail-list">
              <div><span>Event</span><strong>{loginDetail.id}</strong></div>
              <div><span>User</span><strong>{loginDetail.user}</strong></div>
              <div><span>Role</span><strong>{staff.find(m => m.name === loginDetail.user)?.role ?? "Not on the staff list"}</strong></div>
              <div><span>Result</span><strong className={loginDetail.result === "Success" ? "up-text" : "warning-text"}>{loginDetail.result}</strong></div>
              <div><span>When</span><strong>{loginDetail.time}</strong></div>
              <div><span>Device</span><strong>{loginDetail.device}</strong></div>
              <div><span>IP address</span><strong>{loginDetail.ip}</strong></div>
              <div>
                <span>Session still open</span>
                <strong>{sessions.some(x => x.user === loginDetail.user) ? "Yes — see Sessions" : "No active session"}</strong>
              </div>
            </div>
            {loginDetail.result === "Failed" && (
              <Alert tone="warning" title="Failed sign-in">
                Repeated failures from one address lock the account. Confirm with {loginDetail.user} before resetting
                anything, and revoke their other sessions if the attempt was not theirs.
              </Alert>
            )}
          </>
        )}
      </Drawer>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} danger={confirm.danger} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} />
      )}
    </div>
  );
}
