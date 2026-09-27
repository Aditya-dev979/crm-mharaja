import { useEffect, useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { useSendComm } from "@/components/dispatch/useSendComm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { commTemplates } from "@/data/dispatchData";
import { ratingLabel, ticketCategories, ticketPriorityTone, ticketStatusTone } from "@/data/postSalesData";
import { useAdmin } from "@/hooks/useAdmin";
import { useCrm } from "@/hooks/useCrm";
import { usePostSales } from "@/hooks/usePostSales";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { FeedbackChannel, TicketPriority, TicketStatus } from "@/types";

const tabs = ["Overview", "Feedback & Reviews", "Support Tickets"];
const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers } = useCrm();
  const { orders } = useSales();
  const { addFeedback } = usePostSales();
  const toast = useToast();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [orderId, setOrderId] = useState("");
  const [rating, setRating] = useState("5");
  const [channel, setChannel] = useState<FeedbackChannel>("WhatsApp");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setCustomerId(customers[0]?.id ?? "");
      setOrderId("");
      setRating("5");
      setChannel("WhatsApp");
      setComment("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      setError("Select the customer this feedback belongs to.");
      return;
    }
    if (!comment.trim()) {
      setError("Record what the customer actually said.");
      return;
    }
    const created = addFeedback({
      customerId: customer.id, customerName: customer.name,
      orderId: orderId || undefined,
      rating: parseInt(rating, 10), channel, comment: comment.trim(),
    });
    toast({ tone: "success", title: `${created.id} captured`, message: `${customer.name} · ${created.rating}★ — publish it as a review when approved.` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="fb-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="mail" /></div>
      <h2 id="fb-title">Capture customer feedback</h2>
      <p>Feedback stays linked to the customer and, where relevant, the order it came from.</p>
      {error && <Alert tone="danger" title="Check the feedback">{error}</Alert>}
      <div className="modal-field-row">
        <SelectField label="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
        </SelectField>
        <SelectField label="Against order" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">No specific order</option>
          {orders.filter(o => o.customerId === customerId).map(o => <option key={o.id} value={o.id}>{o.id}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <SelectField label="Rating" value={rating} onChange={e => setRating(e.target.value)}>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{stars(r)} · {ratingLabel(r)}</option>)}
        </SelectField>
        <SelectField label="Channel" value={channel} onChange={e => setChannel(e.target.value as FeedbackChannel)}>
          <option>WhatsApp</option>
          <option>Email</option>
          <option>In store</option>
          <option>Phone</option>
        </SelectField>
      </div>
      <TextAreaField label="What did they say?" placeholder="In the customer's words…" value={comment} onChange={e => setComment(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Save feedback</Button>
      </div>
    </Modal>
  );
}

function TicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers } = useCrm();
  const { orders } = useSales();
  const { addTicket } = usePostSales();
  const { addNotification } = useTeam();
  const toast = useToast();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(ticketCategories[0]);
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [assignedTo, setAssignedTo] = useState("Priya Nair");
  const [dueDate, setDueDate] = useState("12 Mar 2026");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setCustomerId(customers[0]?.id ?? "");
      setOrderId("");
      setSubject("");
      setCategory(ticketCategories[0]);
      setPriority("Medium");
      setAssignedTo("Priya Nair");
      setDueDate("12 Mar 2026");
      setDescription("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      setError("Select the customer raising this request.");
      return;
    }
    if (!subject.trim()) {
      setError("Give the ticket a subject the team can scan.");
      return;
    }
    const created = addTicket({
      customerId: customer.id, customerName: customer.name,
      orderId: orderId || undefined, subject: subject.trim(), category, priority,
      assignedTo, dueDate, description: description.trim(),
    });
    addNotification({
      type: "Support Ticket", priority: priority === "High" ? "High" : "Normal",
      title: `${created.id} · ${created.subject}`,
      message: `${customer.name} · ${category} · assigned to ${assignedTo}, due ${dueDate}.`,
      reference: created.id,
      recordRef: { kind: "ticket", id: created.id },
    });
    toast({ tone: "success", title: `${created.id} raised`, message: `Assigned to ${assignedTo}.` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="tk-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="help" /></div>
      <h2 id="tk-title">New support ticket</h2>
      <p>Support requests carry an owner, a due date and a resolution trail the customer can be answered from.</p>
      {error && <Alert tone="danger" title="Check the ticket">{error}</Alert>}
      <div className="modal-field-row">
        <SelectField label="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
        </SelectField>
        <SelectField label="Against order" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">No specific order</option>
          {orders.filter(o => o.customerId === customerId).map(o => <option key={o.id} value={o.id}>{o.id}</option>)}
        </SelectField>
      </div>
      <TextField label="Subject" placeholder="e.g. Clasp loosened within a week" value={subject} onChange={e => setSubject(e.target.value)} />
      <div className="modal-field-row">
        <SelectField label="Category" value={category} onChange={e => setCategory(e.target.value)}>
          {ticketCategories.map(c => <option key={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Priority" value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </SelectField>
      </div>
      <div className="modal-field-row">
        <SelectField label="Assign to" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
          <option>Priya Nair</option>
          <option>Meenal Joshi</option>
          <option>Suresh Yadav</option>
          <option>Vikram Singh</option>
        </SelectField>
        <TextField label="Due date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <TextAreaField label="Description" placeholder="What happened, and what has been done so far?" value={description} onChange={e => setDescription(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Raise ticket</Button>
      </div>
    </Modal>
  );
}

export default function PostSalesPage({
  initialTab,
  onTabHandled,
  focusRecordId,
  onFocusHandled,
  onOpenCustomer,
  onOpenOrder,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  focusRecordId?: string;
  onFocusHandled?: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const { feedback, tickets, updateFeedback, updateTicket } = usePostSales();
  const { can, activeRole, currentUser } = useAdmin();
  const { logAudit } = useTeam();
  const sendComm = useSendComm();
  const toast = useToast();
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    if (!initialTab) return;
    if (tabs.includes(initialTab)) setTab(initialTab);
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [feedbackModal, setFeedbackModal] = useState(false);
  const [ticketModal, setTicketModal] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    if (!focusRecordId) return;
    if (focusRecordId.startsWith("TK-")) {
      setOpenTicketId(focusRecordId);
      setTab("Support Tickets");
    } else if (focusRecordId.startsWith("FB-")) {
      setTab("Feedback & Reviews");
    }
    onFocusHandled?.();
  }, [focusRecordId, onFocusHandled]);

  const canEdit = can("Customers", "Edit");
  const openTickets = tickets.filter(t => !["Resolved", "Closed"].includes(t.status));
  const avgRating = feedback.length ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10 : 0;
  const detractors = feedback.filter(f => f.rating <= 2);
  const ticket = tickets.find(t => t.id === openTicketId) ?? tickets[0];

  const publishReview = (id: string, published: boolean) => {
    updateFeedback(id, { published });
    toast({
      tone: published ? "success" : "info",
      title: published ? "Published as a review" : "Unpublished",
      message: published ? "It now appears in the public review wall." : "Removed from the public review wall.",
    });
  };

  const respond = (id: string) => {
    if (!reply.trim()) return;
    const item = feedback.find(f => f.id === id);
    updateFeedback(id, { response: reply.trim(), respondedBy: "Priya Nair" });
    if (item) {
      const template = commTemplates.find(t => t.id === "tpl-feedback");
      if (template) {
        sendComm({
          channel: "WhatsApp",
          templateName: "Feedback response",
          body: template.body,
          partyKind: "Customer",
          partyId: item.customerId,
          partyName: item.customerName,
          reference: item.orderId,
        });
      }
    }
    setReply("");
    toast({ tone: "success", title: "Response recorded", message: "Sent to the customer and logged in their communication history." });
  };

  const moveTicket = (status: TicketStatus) => {
    if (!ticket) return;
    updateTicket(ticket.id, { status }, `Status changed to ${status}`);
    toast({ tone: "info", title: `${ticket.id} · ${status}`, message: ticket.subject });
  };

  const resolveTicket = () => {
    if (!ticket) return;
    if (!resolution.trim()) {
      toast({ tone: "error", title: "Resolution notes required", message: "Record what was actually done before closing." });
      return;
    }
    updateTicket(
      ticket.id,
      { status: "Resolved", resolutionNotes: resolution.trim(), resolvedBy: "Priya Nair" },
      `Resolved — “${resolution.trim()}”`,
    );
    logAudit({
      user: currentUser, action: "Support ticket resolved", module: "Customers",
      record: ticket.id, newValue: resolution.trim(),
    });
    setResolution("");
    toast({ tone: "success", title: "Ticket resolved", message: `${ticket.id} · follow-up stays on the customer record.` });
  };

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">POST-SALES · FEEDBACK, REVIEWS & SUPPORT</p>
          <h1>After the sale is where loyalty is earned.</h1>
          <p>Every rating, review and support request tied back to the customer and the order it came from — with a resolution trail and a follow-up.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setFeedbackModal(true)}><Icon name="mail" /> Capture feedback</Button>
          <Button onClick={() => setTicketModal(true)}><Icon name="plus" /> New ticket</Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Post-sales views" />

      {tab === "Overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Average rating" value={`${avgRating} / 5`} note={`${feedback.length} responses this quarter`} icon="target" iconTone="gold" onClick={() => setTab("Feedback & Reviews")} />
            <KpiCard label="Published reviews" value={String(feedback.filter(f => f.published).length)} note="Visible on the review wall" icon="gem" iconTone="royal" onClick={() => setTab("Feedback & Reviews")} />
            <KpiCard label="Open tickets" value={String(openTickets.length)} note={`${tickets.filter(t => t.priority === "High" && !["Resolved", "Closed"].includes(t.status)).length} high priority`} noteTone={openTickets.length ? "warning" : "muted"} icon="help" iconTone="gold" onClick={() => setTab("Support Tickets")} />
            <KpiCard label="Unhappy customers" value={String(detractors.length)} note="Rated 2★ or below — needs a call" noteTone={detractors.length ? "warning" : "muted"} icon="warning" iconTone="royal" onClick={() => setTab("Feedback & Reviews")} />
          </div>

          {detractors.length > 0 && (
            <Alert tone="warning" title={`${detractors.length} customer${detractors.length === 1 ? "" : "s"} rated us poorly`}>
              {detractors.map(d => `${d.customerName} (${d.rating}★)`).join(" · ")}. Each has a response and follow-up recorded below.
            </Alert>
          )}

          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">RECENT FEEDBACK</p><h2>What customers told us</h2></div></div>
              <div className="related-list">
                {feedback.slice(0, 4).map(f => (
                  <button key={f.id} type="button" onClick={() => onOpenCustomer(f.customerId)}>
                    <span className="doc-icon"><Icon name="mail" /></span>
                    <span>
                      <strong>{f.customerName} · {stars(f.rating)}</strong>
                      <small>{f.comment.slice(0, 74)}{f.comment.length > 74 ? "…" : ""}</small>
                    </span>
                    <Badge tone={f.rating >= 4 ? "emerald" : f.rating === 3 ? "amber" : "danger"}>{ratingLabel(f.rating)}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">SUPPORT</p><h2>Open requests</h2></div></div>
              {openTickets.length === 0 ? (
                <EmptyState icon="check" title="Nothing open" description="Every support request has been resolved." mini />
              ) : (
                <div className="related-list">
                  {openTickets.map(t => (
                    <button key={t.id} type="button" onClick={() => { setOpenTicketId(t.id); setTab("Support Tickets"); }}>
                      <span className="doc-icon"><Icon name="help" /></span>
                      <span>
                        <strong>{t.id} · {t.subject}</strong>
                        <small>{t.customerName} · {t.assignedTo} · due {t.dueDate}</small>
                      </span>
                      <Badge tone={ticketStatusTone[t.status]}>{t.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {tab === "Feedback & Reviews" && (
        <div className="page-stack">
          {feedback.map(f => (
            <section className="panel" key={f.id}>
              <div className="section-head">
                <div>
                  <p className="kicker">{f.id} · {f.channel.toUpperCase()} · {f.date}</p>
                  <h2>
                    <button type="button" className="link-btn" onClick={() => onOpenCustomer(f.customerId)}>{f.customerName}</button>
                    {" "}<span className="rating-stars">{stars(f.rating)}</span>
                  </h2>
                  {f.orderId && (
                    <p className="muted-line">
                      Against <button type="button" className="link-btn" onClick={() => onOpenOrder(f.orderId!)}>{f.orderId}</button>
                    </p>
                  )}
                </div>
                <div className="release-status">
                  <Badge tone={f.rating >= 4 ? "emerald" : f.rating === 3 ? "amber" : "danger"}>{ratingLabel(f.rating)}</Badge>
                  <Badge tone={f.published ? "royal" : "neutral"}>{f.published ? "Published review" : "Private feedback"}</Badge>
                </div>
              </div>
              <p className="requirement-quote">“{f.comment}”</p>
              {f.response && (
                <div className="detail-list">
                  <div><span>Our response · {f.respondedBy}</span><strong>{f.response}</strong></div>
                </div>
              )}
              {f.followUp && (
                <Alert tone="info" title="Follow-up">{f.followUp}</Alert>
              )}
              {canEdit && (
                <>
                  {!f.response && (
                    <>
                      <TextAreaField
                        label={`Respond to ${f.customerName}`}
                        placeholder="Your reply is sent on WhatsApp and stored in their communication history."
                        value={openTicketId === f.id ? reply : ""}
                        onChange={e => { setOpenTicketId(f.id); setReply(e.target.value); }}
                      />
                      <div className="note-actions">
                        <Button variant="secondary" onClick={() => respond(f.id)} disabled={openTicketId !== f.id || !reply.trim()}>Send response</Button>
                      </div>
                    </>
                  )}
                  <div className="note-actions">
                    <Button variant={f.published ? "secondary" : "primary"} onClick={() => publishReview(f.id, !f.published)}>
                      {f.published ? "Unpublish review" : "Publish as review"}
                    </Button>
                  </div>
                </>
              )}
            </section>
          ))}
        </div>
      )}

      {tab === "Support Tickets" && (
        <>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">SUPPORT REQUESTS</p><h2>{tickets.length} tickets</h2></div>
              <Button variant="secondary" onClick={() => setTicketModal(true)}><Icon name="plus" /> New ticket</Button>
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead>
                  <tr><th>Ticket</th><th>Customer</th><th>Subject</th><th>Category</th><th>Priority</th><th>Owner</th><th>Created</th><th>Due</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} className={t.id === ticket?.id ? "sq-selected" : undefined}>
                      <td><button type="button" className="link-btn" onClick={() => setOpenTicketId(t.id)}>{t.id}</button></td>
                      <td><button type="button" className="link-btn" onClick={() => onOpenCustomer(t.customerId)}>{t.customerName}</button></td>
                      <td className="note-cell">{t.subject}</td>
                      <td className="note-cell">{t.category}</td>
                      <td><Badge tone={ticketPriorityTone[t.priority]}>{t.priority}</Badge></td>
                      <td>{t.assignedTo}</td>
                      <td>{t.created}</td>
                      <td>{t.dueDate}</td>
                      <td><Badge tone={ticketStatusTone[t.status]}>{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {ticket && (
            <div className="two-col">
              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="kicker">{ticket.id} · {ticket.category.toUpperCase()}</p>
                    <h2>{ticket.subject}</h2>
                    <p className="muted-line">
                      <button type="button" className="link-btn" onClick={() => onOpenCustomer(ticket.customerId)}>{ticket.customerName}</button>
                      {ticket.orderId && <> · <button type="button" className="link-btn" onClick={() => onOpenOrder(ticket.orderId!)}>{ticket.orderId}</button></>}
                      {" "}· {ticket.assignedTo} · due {ticket.dueDate}
                    </p>
                  </div>
                  <Badge tone={ticketStatusTone[ticket.status]}>{ticket.status}</Badge>
                </div>
                <p className="requirement-quote">“{ticket.description}”</p>
                {ticket.resolutionNotes && (
                  <Alert tone="success" title={`Resolved by ${ticket.resolvedBy}`}>{ticket.resolutionNotes}</Alert>
                )}
                {ticket.followUpDate && !["Resolved", "Closed"].includes(ticket.status) && (
                  <Alert tone="info" title="Follow-up scheduled">Check back with {ticket.customerName} on {ticket.followUpDate}.</Alert>
                )}
                {canEdit ? (
                  !["Resolved", "Closed"].includes(ticket.status) ? (
                    <>
                      <div className="note-actions">
                        {ticket.status === "Open" && <Button variant="secondary" onClick={() => moveTicket("In Progress")}>Start work</Button>}
                        {ticket.status === "In Progress" && <Button variant="secondary" onClick={() => moveTicket("Awaiting Customer")}>Await customer</Button>}
                        {ticket.status === "Awaiting Customer" && <Button variant="secondary" onClick={() => moveTicket("In Progress")}>Resume work</Button>}
                      </div>
                      <TextAreaField
                        label="Resolution notes"
                        placeholder="What was actually done to fix it?"
                        value={resolution}
                        onChange={e => setResolution(e.target.value)}
                      />
                      <div className="note-actions">
                        <Button onClick={resolveTicket}><Icon name="check" /> Resolve ticket</Button>
                      </div>
                    </>
                  ) : (
                    <div className="note-actions">
                      <Button variant="secondary" onClick={() => moveTicket("Closed")} disabled={ticket.status === "Closed"}>Close ticket</Button>
                    </div>
                  )
                ) : (
                  <Alert tone="info" title="Read-only">{activeRole} can review support requests but not update them.</Alert>
                )}
              </section>
              <section className="panel">
                <div className="section-head"><div><p className="kicker">RESOLUTION TRAIL</p><h2>Ticket timeline</h2></div></div>
                <Timeline items={ticket.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
              </section>
            </div>
          )}
        </>
      )}

      <FeedbackModal open={feedbackModal} onClose={() => setFeedbackModal(false)} />
      <TicketModal open={ticketModal} onClose={() => setTicketModal(false)} />
    </div>
  );
}
