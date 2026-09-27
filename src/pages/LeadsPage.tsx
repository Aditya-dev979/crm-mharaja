import { useEffect, useMemo, useState } from "react";
import KanbanBoard from "@/components/crm/KanbanBoard";
import LeadForm from "@/components/crm/LeadForm";
import { AssignModal, CallLogModal, ConvertModal, FollowUpModal, LostModal, MeetingModal } from "@/components/crm/LeadModals";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Checkbox from "@/components/forms/Checkbox";
import { SelectField, TextAreaField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { leadPriorityTone, leadSources, leadStatuses, leadStatusTone } from "@/data/crmData";
import { useCrm } from "@/hooks/useCrm";
import useEscapeKey from "@/hooks/useEscapeKey";
import { SendTemplateModal } from "@/components/dispatch/CommunicationCenter";
import { commTemplates } from "@/data/dispatchData";
import { TODAY_DAY } from "@/data/teamData";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { CommTemplate, Lead, LeadStatus } from "@/types";
import { downloadCsv, formatINR } from "@/utils";

type LeadView =
  | { type: "dashboard" }
  | { type: "list" }
  | { type: "detail"; id: string }
  | { type: "form"; id?: string };

export default function LeadsPage({
  intent,
  onIntentHandled,
  focusLeadId,
  onFocusHandled,
  onOpenCustomer,
}: {
  intent: "create" | null;
  onIntentHandled: () => void;
  focusLeadId: string | null;
  onFocusHandled: () => void;
  onOpenCustomer: (customerId: string) => void;
}) {
  const { leads, updateLead, addLeadEvent, addLead } = useCrm();
  const { addNotification } = useTeam();
  const toast = useToast();
  const [view, setView] = useState<LeadView>({ type: "dashboard" });
  const [mode, setMode] = useState<"table" | "kanban">("table");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([]);
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [filterOpen, setFilterOpen] = useState(false);
  useEscapeKey(() => setFilterOpen(false), filterOpen);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkLostOpen, setBulkLostOpen] = useState(false);

  useEffect(() => {
    if (intent === "create") {
      setView({ type: "form" });
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  useEffect(() => {
    if (focusLeadId) {
      setView({ type: "detail", id: focusLeadId });
      onFocusHandled();
    }
  }, [focusLeadId, onFocusHandled]);

  const openDetail = (id: string) => setView({ type: "detail", id });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(lead => {
      if (statusFilter.length && !statusFilter.includes(lead.status)) return false;
      if (sourceFilter !== "All sources" && lead.source !== sourceFilter) return false;
      if (!q) return true;
      return `${lead.id} ${lead.name} ${lead.interest} ${lead.city} ${lead.executive} ${lead.source}`
        .toLowerCase()
        .includes(q);
    });
  }, [leads, query, statusFilter, sourceFilter]);

  const columns: Column<Lead>[] = [
    {
      key: "id", label: "Lead", sortable: true, hideable: false, sortValue: l => l.id,
      render: l => <button type="button" className="link-btn" onClick={() => openDetail(l.id)}>{l.id}</button>,
    },
    {
      key: "name", label: "Name", sortable: true, sortValue: l => l.name,
      render: l => <button type="button" className="cell-link" onClick={() => openDetail(l.id)}>{l.name}</button>,
    },
    { key: "interest", label: "Interest" },
    {
      key: "budget", label: "Budget", sortable: true, align: "right", sortValue: l => l.budget,
      render: l => <strong>{formatINR(l.budget)}</strong>,
    },
    { key: "source", label: "Source", defaultHidden: true },
    { key: "city", label: "City", defaultHidden: true },
    { key: "executive", label: "Executive" },
    {
      key: "status", label: "Status", sortable: true, sortValue: l => l.status,
      render: l => <Badge tone={leadStatusTone[l.status]}>{l.status}</Badge>,
    },
    { key: "priority", label: "Priority", render: l => <Badge tone={leadPriorityTone[l.priority]}>{l.priority}</Badge> },
    { key: "nextFollowUp", label: "Next follow-up" },
  ];

  const bulkAssign = (executive: string) => {
    selected.forEach(id => {
      updateLead(id, { executive });
      addLeadEvent(id, `Assigned to ${executive}`);
    });
    setBulkAssignOpen(false);
    toast({ tone: "success", title: "Leads assigned", message: `${selected.length} leads moved to ${executive}.` });
    setSelected([]);
  };

  const bulkLost = (reason: string) => {
    selected.forEach(id => {
      updateLead(id, { status: "Lost", lostReason: reason, nextFollowUp: "—" });
      addLeadEvent(id, `Marked lost — ${reason}`);
    });
    setBulkLostOpen(false);
    toast({ tone: "info", title: "Leads marked lost", message: `${selected.length} leads closed with reason “${reason}”.` });
    setSelected([]);
  };

  /* ---------- detail & form views ---------- */

  if (view.type === "detail") {
    const lead = leads.find(l => l.id === view.id);
    if (!lead) {
      setView({ type: "list" });
      return null;
    }
    return (
      <LeadDetail
        lead={lead}
        onBack={() => setView({ type: "list" })}
        onEdit={() => setView({ type: "form", id: lead.id })}
        onOpenCustomer={onOpenCustomer}
      />
    );
  }

  if (view.type === "form") {
    const lead = view.id ? leads.find(l => l.id === view.id) : undefined;
    return (
      <div className="page-stack">
        <button
          type="button"
          className="back-link"
          onClick={() => setView(lead ? { type: "detail", id: lead.id } : { type: "list" })}
        >
          ← Back to {lead ? lead.name : "lead list"}
        </button>
        <LeadForm
          lead={lead}
          onCancel={() => setView(lead ? { type: "detail", id: lead.id } : { type: "list" })}
          onSave={draft => {
            if (lead) {
              updateLead(lead.id, draft);
              addLeadEvent(lead.id, "Lead details updated");
              toast({ tone: "success", title: "Lead updated", message: `${draft.name} was saved.` });
              setView({ type: "detail", id: lead.id });
            } else {
              const created = addLead(draft);
              addNotification({
                type: "New lead", priority: created.priority === "Hot" ? "High" : "Normal",
                title: `${created.id} · ${created.name}`,
                message: `${created.interest} · ${created.city} · assigned to ${created.executive}.`,
                reference: created.id,
                recordRef: { kind: "lead", id: created.id },
              });
              toast({ tone: "success", title: "Lead created", message: `${created.name} (${created.id}) added to the pipeline.` });
              setView({ type: "detail", id: created.id });
            }
          }}
        />
      </div>
    );
  }

  /* ---------- dashboard metrics ---------- */

  const activeLeads = leads.filter(l => l.status !== "Converted" && l.status !== "Lost");
  const hotLeads = activeLeads.filter(l => l.priority === "Hot");
  const dueToday = activeLeads.filter(l => l.nextFollowUp.startsWith("Today"));
  const converted = leads.filter(l => l.status === "Converted").length;
  const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const pipelineItems = leadStatuses.map(status => ({
    label: status,
    value: leads.filter(l => l.status === status).length,
    display: String(leads.filter(l => l.status === status).length),
  }));
  const sourceItems = leadSources.map(source => ({
    label: source,
    value: leads.filter(l => l.source === source).length,
    display: String(leads.filter(l => l.source === source).length),
  }));

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">CRM · LEAD MANAGEMENT</p>
          <h1>Leads & pipeline</h1>
          <p>Capture every enquiry, nurture it through the pipeline and convert it into a customer.</p>
        </div>
        <Button onClick={() => setView({ type: "form" })}><Icon name="plus" /> New lead</Button>
      </div>
      <Tabs
        tabs={["Overview", "Lead list"]}
        active={view.type === "dashboard" ? "Overview" : "Lead list"}
        onChange={t => setView({ type: t === "Overview" ? "dashboard" : "list" })}
        label="Lead views"
      />

      {view.type === "dashboard" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Active leads" value={String(activeLeads.length)} note={`${leads.length} total in CRM`} icon="target" iconTone="royal" onClick={() => setView({ type: "list" })} />
            <KpiCard label="Hot leads" value={String(hotLeads.length)} note="Need immediate attention" noteTone="warning" icon="warning" iconTone="gold" onClick={() => setView({ type: "list" })} />
            <KpiCard label="Follow-ups due today" value={String(dueToday.length)} note="Across all executives" icon="calendar" iconTone="gold" onClick={() => setView({ type: "list" })} />
            <KpiCard label="Conversion rate" value={`${conversionRate}%`} note={`${converted} converted this quarter`} noteTone="up" icon="check" iconTone="emerald" />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">PIPELINE</p><h2>Leads by status</h2></div>
                <button type="button" className="link-btn" onClick={() => { setMode("kanban"); setView({ type: "list" }); }}>Open board</button>
              </div>
              <BarList items={pipelineItems} />
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">SOURCES</p><h2>Where leads come from</h2></div>
              </div>
              <BarList items={sourceItems} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">TODAY</p><h2>Follow-ups due</h2></div>
              </div>
              {dueToday.length === 0 ? (
                <EmptyState icon="check" title="All caught up" description="No follow-ups are due today." mini />
              ) : (
                <div className="feed">
                  {dueToday.map(lead => (
                    <button key={lead.id} type="button" onClick={() => openDetail(lead.id)}>
                      <span className="feed-icon royal"><Icon name="phone" size={15} /></span>
                      <span className="feed-body">
                        <strong>{lead.name} · {lead.interest}</strong>
                        <small>{lead.nextFollowUp} · {lead.executive}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">FRESH ENQUIRIES</p><h2>Recently added</h2></div>
              </div>
              <div className="feed">
                {leads.slice(0, 5).map(lead => (
                  <button key={lead.id} type="button" onClick={() => openDetail(lead.id)}>
                    <span className="feed-icon gold"><Icon name="user" size={15} /></span>
                    <span className="feed-body">
                      <strong>{lead.name} · {formatINR(lead.budget)}</strong>
                      <small>{lead.source} · {lead.created}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {view.type === "list" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">LEAD LIST</p><h2>{filtered.length} leads</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search leads" aria-label="Search leads" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <select aria-label="Filter by lead source" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                <option>All sources</option>
                {leadSources.map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="filter-anchor">
                <Button variant="secondary" onClick={() => setFilterOpen(o => !o)} aria-expanded={filterOpen}>
                  <Icon name="filter" /> Status{statusFilter.length > 0 && ` · ${statusFilter.length}`}
                </Button>
                {filterOpen && (
                  <>
                    <div className="popover-backdrop" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="filter-pop" role="group" aria-label="Filter by status">
                      <p>FILTER BY STATUS</p>
                      {leadStatuses.map(status => (
                        <Checkbox
                          key={status}
                          label={status}
                          checked={statusFilter.includes(status)}
                          onChange={on => setStatusFilter(f => (on ? [...f, status] : f.filter(s => s !== status)))}
                        />
                      ))}
                      <button type="button" className="link-btn" onClick={() => setStatusFilter([])}>Clear filter</button>
                    </div>
                  </>
                )}
              </div>
              <IconButton label="Table view" className={mode === "table" ? "toggle-active" : ""} onClick={() => setMode("table")}>
                <Icon name="menu" />
              </IconButton>
              <IconButton label="Kanban board view" className={mode === "kanban" ? "toggle-active" : ""} onClick={() => setMode("kanban")}>
                <Icon name="columns" />
              </IconButton>
            </div>
          </div>

          {selected.length > 0 && mode === "table" && (
            <div className="bulk-bar">
              <strong>{selected.length} selected</strong>
              <button type="button" onClick={() => setBulkAssignOpen(true)}>Assign</button>
              <button type="button" onClick={() => {
                  const rows = leads.filter(l => selected.includes(l.id));
                  const n = downloadCsv("leads.csv", ["Lead", "Name", "Phone", "Email", "Source", "Interest", "Budget", "City", "Executive", "Status"],
                    rows.map(l => [l.id, l.name, l.phone, l.email, l.source, l.interest, l.budget, l.city, l.executive, l.status]));
                  toast({ tone: "success", title: "Leads exported", message: `leads.csv downloaded with ${n} row${n === 1 ? "" : "s"}.` });
                }}>Export</button>
              <button type="button" onClick={() => setBulkLostOpen(true)}>Mark lost</button>
              <button type="button" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}

          {mode === "table" ? (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={l => l.id}
              rowLabel={l => `lead ${l.name}`}
              pageSize={8}
              selected={selected}
              onSelectedChange={setSelected}
              emptyState={
                <EmptyState
                  icon="search"
                  title="No matching leads"
                  description="Try another keyword or clear the status filter."
                  mini
                  action={<Button variant="secondary" onClick={() => { setQuery(""); setStatusFilter([]); }}>Clear filters</Button>}
                />
              }
            />
          ) : (
            <KanbanBoard leads={filtered} onOpenLead={openDetail} />
          )}
        </section>
      )}

      <AssignModal
        open={bulkAssignOpen}
        onClose={() => setBulkAssignOpen(false)}
        subject={`${selected.length} selected leads`}
        onAssign={bulkAssign}
      />
      <LostModal
        open={bulkLostOpen}
        onClose={() => setBulkLostOpen(false)}
        subject={`${selected.length} selected leads`}
        onConfirm={reason => bulkLost(reason)}
      />
    </div>
  );
}

/* ================= Lead detail ================= */

function LeadDetail({
  lead,
  onBack,
  onEdit,
  onOpenCustomer,
}: {
  lead: Lead;
  onBack: () => void;
  onEdit: () => void;
  onOpenCustomer: (customerId: string) => void;
}) {
  const { updateLead, addLeadEvent, addLeadNote, convertLead } = useCrm();
  const { addNotification, addTask, logAudit } = useTeam();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [sendTemplate, setSendTemplate] = useState<CommTemplate | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  /* A lead is a prospective customer, so it reuses the customer template set.
     The composer is opened with the lead fixed as the recipient. */
  const openComposer = (channel: "WhatsApp" | "Email") => {
    const template =
      commTemplates.find(t => t.audience === "Customer" && t.channels.includes(channel) && t.id === "tpl-quotation") ??
      commTemplates.find(t => t.audience === "Customer" && t.channels.includes(channel));
    if (!template) return;
    setSendTemplate(template);
  };

  /* No telephony in a prototype — a call is logged with its outcome, which is
     what a rep actually records after dialling. */
  const logCall = (outcome: string, note: string) => {
    addLeadEvent(lead.id, note ? `Call · ${outcome} — ${note}` : `Call · ${outcome}`);
    logAudit({
      user: currentUser, action: "Lead call logged", module: "CRM",
      record: `${lead.id} · ${lead.name}`, newValue: outcome,
    });
    if (outcome === "Follow-up needed") {
      addNotification({
        type: "Next Action", priority: "Normal",
        title: `Follow up with ${lead.name}`,
        message: note || `Call outcome: ${outcome}. Agreed next step pending.`,
        reference: lead.id,
        recordRef: { kind: "lead", id: lead.id },
      });
    }
    setCallOpen(false);
    toast({ tone: "success", title: "Call logged", message: `${lead.name} · ${outcome}` });
  };

  /* A meeting is a real task on the shared board, owned by the lead's executive. */
  const scheduleMeeting = (when: string, agenda: string) => {
    const task = addTask({
      title: `Meeting — ${lead.name}`,
      detail: agenda,
      assignee: lead.executive,
      due: when,
      dueDay: TODAY_DAY,
      priority: lead.priority === "Hot" ? "High" : "Medium",
      related: lead.id,
    });
    addLeadEvent(lead.id, `Meeting scheduled for ${when} — ${agenda}`);
    addNotification({
      type: "New Task", priority: lead.priority === "Hot" ? "High" : "Normal",
      title: `${task.id} · meeting with ${lead.name}`,
      message: `${when} · ${agenda} · ${lead.executive}`,
      reference: task.id,
      recordRef: { kind: "task", id: task.id },
    });
    logAudit({
      user: currentUser, action: "Lead meeting scheduled", module: "CRM",
      record: `${lead.id} · ${lead.name}`, newValue: `${when} · ${lead.executive}`,
    });
    setMeetingOpen(false);
    toast({ tone: "success", title: "Meeting scheduled", message: `${task.id} · ${when} · ${lead.executive}` });
  };

  const isActive = lead.status !== "Converted" && lead.status !== "Lost";
  const pipeline: LeadStatus[] = leadStatuses.filter(s => s !== "Lost");
  const stepIndex = pipeline.indexOf(lead.status);

  const changeStatus = (status: LeadStatus) => {
    updateLead(lead.id, { status });
    addLeadEvent(lead.id, `Status changed to ${status}`);
    toast({ tone: "info", title: "Status updated", message: `${lead.name} is now “${status}”.` });
  };

  const assign = (executive: string) => {
    updateLead(lead.id, { executive });
    addLeadEvent(lead.id, `Assigned to ${executive}`);
    addNotification({
      type: "Assignee Update", priority: lead.priority === "Hot" ? "High" : "Normal",
      title: `${lead.name} assigned to ${executive}`,
      message: `${lead.id} · ${lead.interest} · ${lead.city} — handed over from ${lead.executive}.`,
      reference: lead.id,
      recordRef: { kind: "lead", id: lead.id },
    });
    setAssignOpen(false);
    toast({ tone: "success", title: "Lead assigned", message: `${lead.name} is now with ${executive}.` });
  };

  const schedule = (when: string, note: string) => {
    updateLead(lead.id, { nextFollowUp: when });
    addLeadEvent(lead.id, note ? `Follow-up scheduled for ${when} — ${note}` : `Follow-up scheduled for ${when}`);
    addNotification({
      type: "Follow-up due", priority: "Normal",
      title: `Follow up with ${lead.name}`,
      message: `${when}${note ? ` — ${note}` : ""} · ${lead.executive}.`,
      reference: lead.id,
      recordRef: { kind: "lead", id: lead.id },
    });
    setFollowOpen(false);
    toast({ tone: "success", title: "Follow-up scheduled", message: `${lead.name} · ${when}` });
  };

  const markLost = (reason: string, note: string) => {
    updateLead(lead.id, { status: "Lost", lostReason: reason, nextFollowUp: "—" });
    addLeadEvent(lead.id, note ? `Marked lost — ${reason}. ${note}` : `Marked lost — ${reason}`);
    setLostOpen(false);
    toast({ tone: "info", title: "Lead marked lost", message: `${lead.name} closed with reason “${reason}”.` });
  };

  const convert = () => {
    const customer = convertLead(lead.id);
    setConvertOpen(false);
    if (customer) {
      toast({
        tone: "success",
        title: "Lead converted",
        message: `${customer.name} is now customer ${customer.id.replace("cust-", "CUST-")}.`,
      });
      onOpenCustomer(customer.id);
    }
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    addLeadNote(lead.id, { text: noteText.trim(), author: currentUser, time: "Just now" });
    addNotification({
      type: "Next Action", priority: "Normal",
      title: `Next step noted on ${lead.name}`,
      message: noteText.trim(),
      reference: lead.id,
      recordRef: { kind: "lead", id: lead.id },
    });
    setNoteText("");
    toast({ tone: "success", title: "Note added" });
  };

  const info: Array<[string, string]> = [
    ["Phone", `+91 ${lead.phone}`],
    ["Email", lead.email || "—"],
    ["Source", lead.source],
    ["City", lead.city],
    ["Product interest", lead.interest],
    ["Specifications", lead.specifications ?? "—"],
    ["Delivery expectation", lead.deliveryExpectation ?? "—"],
    ["Budget", formatINR(lead.budget)],
    ["Assigned executive", lead.executive],
    ["Next follow-up", lead.nextFollowUp],
    ["Created", lead.created],
  ];

  return (
    <div className="page-stack">
      <div className="detail-head">
        <button type="button" className="back-link" onClick={onBack}>← All leads</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-title">
              <h1>{lead.name}</h1>
              <Badge tone={leadStatusTone[lead.status]}>{lead.status}</Badge>
              <Badge tone={leadPriorityTone[lead.priority]}>{lead.priority}</Badge>
            </div>
            <p className="muted-line">{lead.id} · via {lead.source} · created {lead.created}</p>
          </div>
          <div className="detail-actions">
            {isActive && (
              <>
                <Button variant="ghost" onClick={() => setCallOpen(true)}><Icon name="phone" /> Call</Button>
                <Button variant="ghost" onClick={() => openComposer("WhatsApp")}><Icon name="phone" /> WhatsApp</Button>
                <Button variant="ghost" onClick={() => openComposer("Email")}><Icon name="mail" /> Email</Button>
                <Button variant="ghost" onClick={() => setMeetingOpen(true)}><Icon name="calendar" /> Meeting</Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setAssignOpen(true)}><Icon name="user" /> Assign</Button>
            <Button variant="secondary" onClick={() => setFollowOpen(true)}><Icon name="calendar" /> Follow-up</Button>
            <Button variant="secondary" onClick={onEdit}><Icon name="edit" /> Edit</Button>
            {isActive && <Button variant="danger" onClick={() => setLostOpen(true)}>Mark lost</Button>}
            {isActive && <Button onClick={() => setConvertOpen(true)}><Icon name="check" /> Convert to customer</Button>}
            {lead.status === "Converted" && lead.customerId && (
              <Button onClick={() => onOpenCustomer(lead.customerId!)}>View customer <Icon name="arrow" /></Button>
            )}
          </div>
        </div>
      </div>

      {lead.status === "Lost" ? (
        <Alert tone="danger" title="This lead was marked lost">
          Reason: {lead.lostReason ?? "not recorded"}. Update the status below to reopen it.
        </Alert>
      ) : (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">PIPELINE POSITION</p><h2>Lead journey</h2></div>
          </div>
          <Stepper steps={pipeline} current={stepIndex} />
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">LEAD INFORMATION</p><h2>Requirement & contact</h2></div>
          </div>
          <p className="requirement-quote">“{lead.requirement}”</p>
          <div className="detail-list">
            {info.map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
          <div className="status-change">
            <SelectField label="Update status" value={lead.status} onChange={e => changeStatus(e.target.value as LeadStatus)}>
              {leadStatuses.map(s => <option key={s}>{s}</option>)}
            </SelectField>
          </div>
        </section>
        <div className="page-stack">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">ACTIVITY</p><h2>Timeline</h2></div>
            </div>
            <Timeline
              items={lead.timeline.map((event, i) => ({
                title: event.text,
                meta: event.time,
                state: i === 0 ? "current" : "done",
              }))}
            />
          </section>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">NOTES</p><h2>Team notes</h2></div>
            </div>
            <TextAreaField
              label="Add a note"
              placeholder="Preferences, objections, context for the team..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="note-actions">
              <Button variant="secondary" onClick={addNote} disabled={!noteText.trim()}>Add note</Button>
            </div>
            {lead.notes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              <div className="note-list">
                {lead.notes.map((note, i) => (
                  <div key={i}>
                    <p>{note.text}</p>
                    <small>{note.author} · {note.time}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <CallLogModal open={callOpen} onClose={() => setCallOpen(false)} leadName={lead.name} phone={lead.phone} onLog={logCall} />
      <MeetingModal open={meetingOpen} onClose={() => setMeetingOpen(false)} leadName={lead.name} executive={lead.executive} onSchedule={scheduleMeeting} />
      <SendTemplateModal
        template={sendTemplate}
        presetParty={{ id: lead.id, name: lead.name, kind: "Lead" }}
        presetReference={lead.id}
        onClose={() => setSendTemplate(null)}
      />
      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} subject={lead.name} current={lead.executive} onAssign={assign} />
      <FollowUpModal open={followOpen} onClose={() => setFollowOpen(false)} leadName={lead.name} onSchedule={schedule} />
      <LostModal open={lostOpen} onClose={() => setLostOpen(false)} subject={lead.name} onConfirm={markLost} />
      <ConvertModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        leadName={lead.name}
        budgetLine={formatINR(lead.budget)}
        onConfirm={convert}
      />
    </div>
  );
}
