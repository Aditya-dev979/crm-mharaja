import { useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Drawer from "@/components/feedback/Drawer";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import {
  auditModules,
  CALENDAR,
  notificationIcon,
  notificationTarget,
  notificationTypes,
  taskPriorityTone,
  taskStatusTone,
  TODAY_DAY,
} from "@/data/teamData";
import { saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import type { AuditRecord, StaffMember, TaskItem, TaskPriority } from "@/types";
import { formatINR } from "@/utils";

export type TeamIntent = "notifications" | "new-task" | null;

type TeamView =
  | { type: "staff" }
  | { type: "profile"; id: string }
  | { type: "tasks" }
  | { type: "notifications" }
  | { type: "audit" };

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

function TaskModal({
  open,
  onClose,
  staffNames,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  staffNames: string[];
  onSubmit: (draft: { title: string; detail?: string; assignee: string; due: string; dueDay: number; priority: TaskPriority; related?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assignee, setAssignee] = useState(staffNames[0] ?? "");
  const [due, setDue] = useState("2026-03-10");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [related, setRelated] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setTitle("");
      setDetail("");
      setAssignee(staffNames[0] ?? "");
      setDue("2026-03-10");
      setPriority("Medium");
      setRelated("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="task-title">
      <div className="modal-icon royal-icon"><Icon name="check" /></div>
      <h2 id="task-title">New task</h2>
      <p>Tasks appear on the assignee's list and the team calendar. Overdue is computed against today.</p>
      <TextField label="Task" required placeholder="What needs doing?" value={title} onChange={e => { setTitle(e.target.value); setError(undefined); }} error={error} />
      <TextAreaField label="Details" placeholder="Context, links, phone numbers…" value={detail} onChange={e => setDetail(e.target.value)} />
      <div className="modal-field-row">
        <SelectField label="Assignee" value={assignee} onChange={e => setAssignee(e.target.value)}>
          {staffNames.map(n => <option key={n}>{n}</option>)}
        </SelectField>
        <TextField label="Due" type="date" value={due} onChange={e => setDue(e.target.value)} />
      </div>
      <div className="modal-field-row">
        <SelectField label="Priority" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
          <option>High</option><option>Medium</option><option>Low</option>
        </SelectField>
        <TextField label="Related record" placeholder="e.g. SO-260184" value={related} onChange={e => setRelated(e.target.value)} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!title.trim()) return setError("A task needs a title");
            const date = new Date(due + "T00:00:00");
            onSubmit({
              title: title.trim(),
              detail: detail.trim() || undefined,
              assignee,
              due: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              dueDay: date.getMonth() === 2 && date.getFullYear() === 2026 ? date.getDate() : 31,
              priority,
              related: related.trim() || undefined,
            });
          }}
        >
          Create task
        </Button>
      </div>
    </Modal>
  );
}

export default function TeamPage({
  initialTab,
  onTabHandled,
  intent,
  onIntentHandled,
  onOpenLead,
  onOpenOrder,
  onOpenTarget,
  onOpenRecord,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  intent: TeamIntent;
  onIntentHandled: () => void;
  onOpenLead: (leadId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenTarget: (target: string) => void;
  onOpenRecord?: (recordId?: string, fallbackTarget?: string) => void;
}) {
  const toast = useToast();
  const { leads } = useCrm();
  const { currentUser } = useAdmin();
  const { quotations, orders } = useSales();
  const { staff, tasks, teamNotifications, audit, updateStaff, addTask, updateTask, markNotification, markAllNotificationsRead, logAudit, addNotification } = useTeam();

  const [view, setView] = useState<TeamView>({ type: "staff" });

  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Staff") setView({ type: "staff" });
    else if (initialTab === "Tasks") setView({ type: "tasks" });
    else if (initialTab === "Notifications") setView({ type: "notifications" });
    else if (initialTab === "Audit Trail") setView({ type: "audit" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [taskScope, setTaskScope] = useState("Team Tasks");
  const [taskStatus, setTaskStatus] = useState("All");
  const [taskMode, setTaskMode] = useState<"List" | "Calendar">("List");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [notifType, setNotifType] = useState("All types");
  const [auditModule, setAuditModule] = useState("All modules");
  const [auditUser, setAuditUser] = useState("All users");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditDetail, setAuditDetail] = useState<AuditRecord | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  useEffect(() => {
    if (intent === "notifications") {
      setView({ type: "notifications" });
      onIntentHandled();
    } else if (intent === "new-task") {
      setView({ type: "tasks" });
      setTaskOpen(true);
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  const perf = useMemo(() => {
    const map = new Map<string, { leads: number; followUps: number; quotes: number; orders: number; sales: number; conversion: number; pendingTasks: number }>();
    for (const member of staff) {
      const theirLeads = leads.filter(l => l.executive === member.name);
      const converted = theirLeads.filter(l => l.status === "Converted").length;
      const theirOrders = orders.filter(o => o.executive === member.name && !["Cancelled", "Draft"].includes(o.status));
      map.set(member.name, {
        leads: theirLeads.length,
        followUps: theirLeads.filter(l => !["Converted", "Lost"].includes(l.status) && l.nextFollowUp && l.nextFollowUp !== "—").length,
        quotes: quotations.filter(q => q.executive === member.name).length,
        orders: theirOrders.length,
        sales: theirOrders.reduce((s, o) => s + saleTotals(o.lines, o.gstPct).total, 0),
        conversion: theirLeads.length ? Math.round((converted / theirLeads.length) * 100) : 0,
        pendingTasks: tasks.filter(t => t.assignee === member.name && t.status !== "Completed").length,
      });
    }
    return map;
  }, [staff, leads, quotations, orders, tasks]);

  const completeTask = (task: TaskItem) => {
    updateTask(task.id, { status: "Completed", completedAt: "Just now" });
    logAudit({ user: currentUser, action: "Task completed", module: "Tasks", record: `${task.id} · ${task.title}`, oldValue: task.status, newValue: "Completed" });
    toast({ tone: "success", title: "Task completed", message: task.id });
  };

  const reopenTask = (task: TaskItem) => {
    updateTask(task.id, { status: task.dueDay < TODAY_DAY ? "Overdue" : "Pending", completedAt: undefined });
    logAudit({ user: currentUser, action: "Task reopened", module: "Tasks", record: `${task.id} · ${task.title}`, oldValue: "Completed", newValue: "Pending" });
    toast({ tone: "info", title: "Task reopened", message: task.id });
  };

  /* ---------- Staff profile ---------- */
  if (view.type === "profile") {
    const member = staff.find(s => s.id === view.id);
    if (!member) {
      setView({ type: "staff" });
      return null;
    }
    const p = perf.get(member.name)!;
    const myLeads = leads.filter(l => l.executive === member.name && !["Converted", "Lost"].includes(l.status));
    const myOrders = orders.filter(o => o.executive === member.name && !["Cancelled", "Draft"].includes(o.status));
    const myTasks = tasks.filter(t => t.assignee === member.name && t.status !== "Completed");
    const initials = member.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();

    const metrics: Array<[string, string]> = [
      ["Leads handled", String(p.leads)],
      ["Follow-ups due", String(p.followUps)],
      ["Quotations", String(p.quotes)],
      ["Orders", String(p.orders)],
      ["Sales value", p.sales ? lakh(p.sales) : "₹0"],
      ["Conversion", `${p.conversion}%`],
      ["Pending tasks", String(p.pendingTasks)],
    ];

    return (
      <div className="page-stack">
        <button type="button" className="back-link" onClick={() => setView({ type: "staff" })}>← All staff</button>
        <section className="panel profile-head">
          <div className="profile-identity">
            <div className="avatar large profile-avatar" aria-hidden="true">{initials}</div>
            <div>
              <div className="detail-title">
                <h1>{member.name}</h1>
                <Badge tone="royal">{member.role}</Badge>
                <Badge tone={member.active ? "emerald" : "neutral"}>{member.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="muted-line">{member.email} · +91 {member.phone} · {member.branch} · since {member.since}</p>
            </div>
            <div className="detail-actions">
              <Button
                variant={member.active ? "danger" : "primary"}
                onClick={() =>
                  setConfirm({
                    title: member.active ? `Deactivate ${member.name}?` : `Reactivate ${member.name}?`,
                    danger: member.active,
                    message: member.active
                      ? "They lose sign-in access until reactivated. Their records and history stay intact."
                      : "They regain sign-in access with their existing role.",
                    confirmLabel: member.active ? "Deactivate" : "Reactivate",
                    action: () => {
                      updateStaff(member.id, { active: !member.active });
                      logAudit({ user: currentUser, action: member.active ? "Staff deactivated" : "Staff reactivated", module: "Users & Roles", record: member.name, oldValue: member.active ? "Active" : "Inactive", newValue: member.active ? "Inactive" : "Active" });
                      setConfirm(null);
                      toast({ tone: member.active ? "warning" : "success", title: member.active ? "Staff deactivated" : "Staff reactivated", message: member.name });
                    },
                  })
                }
              >
                {member.active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </div>
          <div className="stat-chips profile-stats">
            {metrics.map(([label, value]) => (
              <div key={label} className="stat-chip"><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </section>

        <div className="two-col">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">OPEN TASKS</p><h2>{myTasks.length} on their plate</h2></div></div>
            {myTasks.length === 0 ? (
              <EmptyState icon="check" title="Nothing pending" description="New tasks land here." mini />
            ) : (
              <div className="task-list">
                {myTasks.map(t => (
                  <div key={t.id} className="task-row">
                    <div className="task-body">
                      <strong>{t.title}</strong>
                      <small>
                        {t.id}
                        {t.related && (
                          <>
                            {" · "}
                            {/* A task is only useful if it leads to the record it is about. */}
                            {onOpenRecord ? (
                              <button type="button" className="link-btn" onClick={() => onOpenRecord(t.related)}>{t.related}</button>
                            ) : (
                              t.related
                            )}
                          </>
                        )}
                        {" · due "}{t.due}
                      </small>
                    </div>
                    <Badge tone={taskStatusTone[t.status]}>{t.status}</Badge>
                    {t.related && onOpenRecord && (
                      <Button variant="ghost" onClick={() => onOpenRecord(t.related)}>Act on record</Button>
                    )}
                    <Button variant="secondary" onClick={() => completeTask(t)}>Complete</Button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="page-stack">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">PIPELINE</p><h2>{myLeads.length} active leads</h2></div></div>
              {myLeads.length === 0 ? (
                <EmptyState icon="target" title="No open leads" description="Assigned leads appear here." mini />
              ) : (
                <div className="feed">
                  {myLeads.slice(0, 4).map(l => (
                    <button key={l.id} type="button" onClick={() => onOpenLead(l.id)}>
                      <span className="feed-icon royal"><Icon name="target" size={15} /></span>
                      <span className="feed-body"><strong>{l.name}</strong><small>{l.interest} · {l.status}</small></span>
                      <Badge tone={l.priority === "Hot" ? "danger" : l.priority === "Warm" ? "amber" : "neutral"}>{l.priority}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">RECENT ORDERS</p><h2>{myOrders.length} credited</h2></div></div>
              {myOrders.length === 0 ? (
                <EmptyState icon="grid" title="No orders yet" description="Orders they close appear here." mini />
              ) : (
                <div className="feed">
                  {myOrders.slice(0, 4).map(o => (
                    <button key={o.id} type="button" onClick={() => onOpenOrder(o.id)}>
                      <span className="feed-icon emerald"><Icon name="grid" size={15} /></span>
                      <span className="feed-body"><strong>{o.id} · {o.customerName}</strong><small>{formatINR(saleTotals(o.lines, o.gstPct).total)} · {o.status}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
        {confirm && (
          <ConfirmModal open onClose={() => setConfirm(null)} danger={confirm.danger} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} />
        )}
      </div>
    );
  }

  /* ---------- Shared derived ---------- */
  const activeTab =
    view.type === "staff" ? "Staff" : view.type === "tasks" ? "Tasks" : view.type === "notifications" ? "Notifications" : "Audit Trail";

  const staffColumns: Column<StaffMember>[] = [
    {
      key: "name", label: "Staff", sortable: true, hideable: false, sortValue: s => s.name,
      render: s => (
        <button type="button" className="table-product" onClick={() => setView({ type: "profile", id: s.id })}>
          <span className="avatar" aria-hidden="true">{s.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}</span>
          <span><b className="link">{s.name}</b><small>{s.email}</small></span>
        </button>
      ),
    },
    { key: "role", label: "Role", sortable: true, sortValue: s => s.role, render: s => s.role },
    { key: "branch", label: "Branch", defaultHidden: true, render: s => s.branch },
    { key: "leads", label: "Leads", sortable: true, sortValue: s => perf.get(s.name)?.leads ?? 0, render: s => String(perf.get(s.name)?.leads ?? 0) },
    { key: "orders", label: "Orders", sortable: true, sortValue: s => perf.get(s.name)?.orders ?? 0, render: s => String(perf.get(s.name)?.orders ?? 0) },
    {
      key: "sales", label: "Sales", sortable: true, sortValue: s => perf.get(s.name)?.sales ?? 0,
      render: s => <strong>{(perf.get(s.name)?.sales ?? 0) ? lakh(perf.get(s.name)!.sales) : "—"}</strong>,
    },
    { key: "conversion", label: "Conversion", render: s => `${perf.get(s.name)?.conversion ?? 0}%` },
    { key: "status", label: "Status", render: s => <Badge tone={s.active ? "emerald" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge> },
  ];

  const scopedTasks = tasks.filter(t => (taskScope === "My Tasks" ? t.assignee === "Arjun Sharma" : true));
  const filteredTasks = scopedTasks.filter(t => {
    if (taskStatus !== "All" && t.status !== taskStatus) return false;
    if (dayFilter !== null && t.dueDay !== dayFilter) return false;
    return true;
  });

  const filteredNotifs = teamNotifications.filter(n => notifType === "All types" || n.type === notifType);

  const filteredAudit = audit.filter(a => {
    if (auditModule !== "All modules" && a.module !== auditModule) return false;
    if (auditUser !== "All users" && a.user !== auditUser) return false;
    const q = auditQuery.trim().toLowerCase();
    return !q || `${a.id} ${a.user} ${a.action} ${a.module} ${a.record ?? ""}`.toLowerCase().includes(q);
  });

  const auditColumns: Column<AuditRecord>[] = [
    {
      key: "time", label: "When", sortable: true, hideable: false, sortValue: a => a.id,
      render: a => (
        <button type="button" className="table-product" onClick={() => setAuditDetail(a)}>
          <span><b className="link">{a.time}</b><small>{a.id}</small></span>
        </button>
      ),
    },
    { key: "user", label: "User", sortable: true, sortValue: a => a.user, render: a => a.user },
    { key: "action", label: "Action", render: a => a.action },
    { key: "module", label: "Module", sortable: true, sortValue: a => a.module, render: a => <Badge tone="royal">{a.module}</Badge> },
    {
      key: "record", label: "Record",
      render: a =>
        a.record && onOpenRecord ? (
          <button type="button" className="link-btn" onClick={() => onOpenRecord(a.record, a.module)}>{a.record}</button>
        ) : (
          a.record ?? "—"
        ),
    },
  ];

  const overdueCount = tasks.filter(t => t.status === "Overdue").length;
  const unreadCount = teamNotifications.filter(n => n.unread).length;

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">TEAM · PERFORMANCE, TASKS & OVERSIGHT</p>
          <h1>People, accountable.</h1>
          <p>Staff performance from real pipeline data, a shared task board, one notification stream and a full audit trail.</p>
        </div>
        <div className="detail-actions">
          <Button onClick={() => { setView({ type: "tasks" }); setTaskOpen(true); }}><Icon name="plus" /> New task</Button>
        </div>
      </div>
      <Tabs
        tabs={["Staff", "Tasks", "Notifications", "Audit Trail"]}
        active={activeTab}
        onChange={t => setView({ type: t === "Staff" ? "staff" : t === "Tasks" ? "tasks" : t === "Notifications" ? "notifications" : "audit" })}
        label="Team views"
      />

      {view.type === "staff" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Team" value={String(staff.length)} note={`${staff.filter(s => s.active).length} active`} icon="users" iconTone="royal" />
            <KpiCard label="Open leads" value={String(leads.filter(l => !["Converted", "Lost"].includes(l.status)).length)} note="Across all executives" icon="target" iconTone="gold" />
            <KpiCard label="Open tasks" value={String(tasks.filter(t => t.status !== "Completed").length)} note={`${overdueCount} overdue`} noteTone={overdueCount ? "warning" : "muted"} icon="check" iconTone="emerald" onClick={() => setView({ type: "tasks" })} />
            <KpiCard label="Unread alerts" value={String(unreadCount)} note="In the notification stream" icon="bell" iconTone="royal" onClick={() => setView({ type: "notifications" })} />
          </div>
          <section className="panel table-panel">
            <div className="section-head"><div><p className="kicker">STAFF</p><h2>{staff.length} people</h2></div></div>
            <DataTable columns={staffColumns} rows={staff} rowKey={s => s.id} pageSize={8} emptyState={<EmptyState icon="users" title="No staff" description="" mini />} />
          </section>
        </>
      )}

      {view.type === "tasks" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">TASKS</p><h2>{filteredTasks.length} shown · {overdueCount} overdue</h2></div>
            <div className="table-actions">
              <select aria-label="Task scope" value={taskScope} onChange={e => setTaskScope(e.target.value)}>
                <option>Team Tasks</option><option>My Tasks</option>
              </select>
              <select aria-label="Task status" value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
                <option>All</option><option>Pending</option><option>Overdue</option><option>Completed</option>
              </select>
              <select aria-label="View mode" value={taskMode} onChange={e => setTaskMode(e.target.value as "List" | "Calendar")}>
                <option>List</option><option>Calendar</option>
              </select>
              <Button variant="secondary" onClick={() => setTaskOpen(true)}><Icon name="plus" /> New task</Button>
            </div>
          </div>

          {dayFilter !== null && (
            <p className="muted">
              Showing tasks due {String(dayFilter).padStart(2, "0")} Mar 2026 ·{" "}
              <button type="button" className="link-btn" onClick={() => setDayFilter(null)}>clear</button>
            </p>
          )}

          {taskMode === "Calendar" && (
            <div className="calendar">
              <p className="mini-title">{CALENDAR.month}</p>
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d} className="calendar-head">{d}</span>)}
                {Array.from({ length: CALENDAR.firstWeekday }, (_, i) => <span key={`pad-${i}`} />)}
                {Array.from({ length: CALENDAR.days }, (_, i) => i + 1).map(day => {
                  const dayTasks = scopedTasks.filter(t => t.dueDay === day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`calendar-day${day === TODAY_DAY ? " today" : ""}${dayFilter === day ? " selected" : ""}`}
                      onClick={() => setDayFilter(dayFilter === day ? null : day)}
                    >
                      <b>{day}</b>
                      {dayTasks.length > 0 && (
                        <span className="calendar-dots">
                          {dayTasks.slice(0, 3).map(t => <i key={t.id} className={t.status === "Overdue" ? "dot-danger" : t.status === "Completed" ? "dot-done" : "dot-open"} />)}
                          {dayTasks.length > 3 && <small>+{dayTasks.length - 3}</small>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <EmptyState icon="check" title="No tasks match" description="Change the scope, status or day filter." mini />
          ) : (
            <div className="task-list">
              {filteredTasks.map(t => (
                <div key={t.id} className="task-row">
                  <div className="task-body">
                    <strong>{t.title}</strong>
                    {t.detail && <small>{t.detail}</small>}
                    <small className="muted">
                      {t.id} · {t.assignee} · due {t.due}
                      {t.related && (
                        <>
                          {" · "}
                          {onOpenRecord ? (
                            <button type="button" className="link-btn" onClick={() => onOpenRecord(t.related)}>{t.related}</button>
                          ) : (
                            t.related
                          )}
                        </>
                      )}
                    </small>
                  </div>
                  <Badge tone={taskPriorityTone[t.priority]}>{t.priority}</Badge>
                  <Badge tone={taskStatusTone[t.status]}>{t.status}</Badge>
                  {t.status === "Completed" ? (
                    <button type="button" className="link-btn" onClick={() => reopenTask(t)}>Reopen</button>
                  ) : (
                    <Button variant="secondary" onClick={() => completeTask(t)}>Complete</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view.type === "notifications" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">NOTIFICATION CENTER</p><h2>{unreadCount} unread</h2></div>
            <div className="table-actions">
              <select aria-label="Notification type" value={notifType} onChange={e => setNotifType(e.target.value)}>
                <option>All types</option>
                {notificationTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <Button variant="secondary" onClick={() => { markAllNotificationsRead(); toast({ tone: "success", title: "All caught up", message: "Every notification marked read." }); }}>
                Mark all read
              </Button>
            </div>
          </div>
          {filteredNotifs.length === 0 ? (
            <EmptyState icon="bell" title="Nothing here" description="Notifications of this type appear here." mini />
          ) : (
            <div className="feed">
              {filteredNotifs.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={n.unread ? "notif-unread" : undefined}
                  onClick={() => {
                    markNotification(n.id, false);
                    /* Deep link: the record reference wins, the type is the fallback. */
                    if (onOpenRecord) onOpenRecord(n.recordRef?.id ?? n.reference, notificationTarget[n.type]);
                    else onOpenTarget(notificationTarget[n.type]);
                  }}
                >
                  <span className={`feed-icon ${n.type === "Approval required" || n.type === "Payment due" ? "gold" : n.type === "Low stock" ? "amber" : "royal"}`}>
                    <Icon name={notificationIcon[n.type]} size={15} />
                  </span>
                  <span className="feed-body">
                    <strong>{n.title}</strong>
                    <small>{n.message}</small>
                    <small className="muted">
                      {n.type}{n.reference ? ` · ${n.reference}` : ""} · {n.time}
                      {n.priority === "High" ? " · High priority" : ""}
                      {n.recordRef ? ` · opens ${n.recordRef.id}` : ""}
                    </small>
                  </span>
                  {n.unread && <Badge tone="royal">New</Badge>}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {view.type === "audit" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">AUDIT TRAIL</p><h2>{filteredAudit.length} records</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search audit trail" aria-label="Search audit trail" value={auditQuery} onChange={e => setAuditQuery(e.target.value)} />
              </div>
              <select aria-label="Filter by module" value={auditModule} onChange={e => setAuditModule(e.target.value)}>
                {auditModules.map(m => <option key={m}>{m}</option>)}
              </select>
              <select aria-label="Filter by user" value={auditUser} onChange={e => setAuditUser(e.target.value)}>
                <option>All users</option>
                {staff.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <DataTable
            columns={auditColumns}
            rows={filteredAudit}
            rowKey={a => a.id}
            pageSize={8}
            emptyState={<EmptyState icon="shield" title="No matching records" description="Adjust the filters or search." mini />}
          />
        </section>
      )}

      <TaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        staffNames={staff.filter(s => s.active).map(s => s.name)}
        onSubmit={draft => {
          const created = addTask(draft);
          logAudit({ user: currentUser, action: "Task created", module: "Tasks", record: `${created.id} · ${created.title}`, newValue: `Assigned to ${created.assignee} · due ${created.due}` });
          addNotification({
            type: "New Task", priority: created.priority === "High" ? "High" : "Normal",
            title: `${created.id} assigned to ${created.assignee}`,
            message: `${created.title} · due ${created.due}.`,
            reference: created.id,
            recordRef: { kind: "task", id: created.id },
          });
          setTaskOpen(false);
          setView({ type: "tasks" });
          toast({ tone: "success", title: "Task created", message: `${created.id} for ${created.assignee}.` });
        }}
      />

      <Drawer
        open={auditDetail !== null}
        onClose={() => setAuditDetail(null)}
        eyebrow="AUDIT RECORD"
        title={auditDetail?.id ?? ""}
        className="detail-drawer"
      >
        {auditDetail && (
          <div className="drawer-content">
            <div className="detail-list">
              <div><span>User</span><strong>{auditDetail.user}</strong></div>
              <div><span>Action</span><strong>{auditDetail.action}</strong></div>
              <div><span>Module</span><strong>{auditDetail.module}</strong></div>
              <div><span>Date / time</span><strong>{auditDetail.time}</strong></div>
              {auditDetail.record && <div><span>Record</span><strong>{auditDetail.record}</strong></div>}
              <div><span>Device</span><strong>{auditDetail.device}</strong></div>
              <div><span>IP address</span><strong>{auditDetail.ip}</strong></div>
            </div>
            {(auditDetail.oldValue || auditDetail.newValue) && (
              <>
                <p className="mini-title">CHANGE</p>
                <div className="audit-diff">
                  {auditDetail.oldValue && <div className="audit-old"><small>Before</small><span>{auditDetail.oldValue}</span></div>}
                  {auditDetail.newValue && <div className="audit-new"><small>After</small><span>{auditDetail.newValue}</span></div>}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} danger={confirm.danger} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} />
      )}
    </div>
  );
}
