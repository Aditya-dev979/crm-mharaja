import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Drawer from "@/components/feedback/Drawer";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { useSendComm } from "@/components/dispatch/useSendComm";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { commTemplates, fillTemplate } from "@/data/dispatchData";
import { useCrm } from "@/hooks/useCrm";
import { useDispatch } from "@/hooks/useDispatch";
import { usePurchase } from "@/hooks/usePurchase";
import { useSales } from "@/hooks/useSales";
import { useToast } from "@/hooks/useToast";
import type { CommMessage, CommPartyKind, CommTemplate, MessageChannel, MessageStatus } from "@/types";

const channelIcon: Record<MessageChannel, IconName> = {
  WhatsApp: "phone",
  Email: "mail",
  SMS: "component",
};

export const messageStatusTone: Record<MessageStatus, BadgeTone> = {
  Draft: "neutral",
  Sending: "amber",
  Sent: "emerald",
  Failed: "danger",
};

/** Opened either from the template library or from a record elsewhere in the app. */
export function SendTemplateModal({
  template,
  presetPartyId,
  presetReference,
  presetParty,
  onClose,
}: {
  template: CommTemplate | null;
  presetPartyId?: string;
  presetReference?: string;
  /** A recipient that is not in the customer or supplier lists — a lead, for
      instance. When given, the recipient is fixed rather than chosen. */
  presetParty?: { id: string; name: string; kind: CommPartyKind };
  onClose: () => void;
}) {
  const { customers } = useCrm();
  const { suppliers, pos, grns } = usePurchase();
  const { orders, quotations } = useSales();
  const sendComm = useSendComm();
  const toast = useToast();
  const [partyId, setPartyId] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("WhatsApp");
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const open = template !== null;
  const parties = template?.audience === "Supplier" ? suppliers : customers;

  useEffect(() => {
    if (template) {
      setPartyId(presetPartyId ?? (template.audience === "Supplier" ? suppliers[0]?.id : customers[0]?.id) ?? "");
      setChannel(template.channels[0]);
      setReference(presetReference ?? "");
      setSubject(template.subject);
      setBody(template.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, presetPartyId, presetReference]);

  if (!template) return null;
  const party = presetParty ?? parties.find(p => p.id === partyId);
  const references =
    template.audience === "Supplier"
      ? [...pos.filter(po => po.supplierId === partyId).map(po => po.id), ...grns.filter(g => g.supplierName === party?.name).map(g => g.id)]
      : [
          ...orders.filter(o => o.customerId === partyId).map(o => o.id),
          ...orders.filter(o => o.customerId === partyId && o.invoiceId).map(o => o.invoiceId!),
          ...quotations.filter(q => q.customerId === partyId).map(q => q.id),
        ];
  const preview = party ? fillTemplate(body, party.name, reference || undefined) : body;

  return (
    <Modal open={open} onClose={onClose} labelledBy="sendtpl-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name={channelIcon[channel]} /></div>
      <h2 id="sendtpl-title">Send “{template.name}”</h2>
      <p>Delivery is simulated in this prototype — the message is recorded in history with its state.</p>
      <div className="modal-field-row">
        {presetParty ? (
          <div className="field">
            <span className="field-label">Recipient</span>
            <div className="summary-row"><span>{presetParty.kind}</span><strong>{presetParty.name}</strong></div>
          </div>
        ) : (
          <SelectField label={template.audience} value={partyId} onChange={e => { setPartyId(e.target.value); setReference(""); }}>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
        )}
        <SelectField label="Channel" value={channel} onChange={e => setChannel(e.target.value as MessageChannel)}>
          {template.channels.map(c => <option key={c}>{c}</option>)}
        </SelectField>
      </div>
      {!presetParty && (
        <SelectField label="Related record (optional)" value={reference} onChange={e => setReference(e.target.value)}>
          <option value="">None</option>
          {[...new Set(references)].map(r => <option key={r} value={r}>{r}</option>)}
        </SelectField>
      )}
      {channel === "Email" && (
        <TextField label="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
      )}
      <TextAreaField label="Message" value={body} onChange={e => setBody(e.target.value)} />
      <p className="muted comm-preview"><Icon name="eye" size={13} /> {preview}</p>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!party || !body.trim()}
          onClick={() => {
            if (!party) return;
            sendComm({
              channel,
              templateName: template.name,
              body,
              subject: channel === "Email" ? subject : undefined,
              partyKind: presetParty ? presetParty.kind : template.audience,
              partyId: party.id,
              partyName: party.name,
              reference: presetParty ? presetReference : reference || undefined,
            });
            onClose();
            toast({
              tone: "success",
              title: `${template.name} queued`,
              message: `${channel} to ${party.name}${reference ? ` · ${reference}` : ""} — watch the status in history.`,
            });
          }}
        >
          <Icon name="send" /> Send {channel}
        </Button>
      </div>
    </Modal>
  );
}

export default function CommunicationCenter() {
  const { messages, updateMessage } = useDispatch();
  const toast = useToast();
  const [audience, setAudience] = useState("Customer");
  const [channelFilter, setChannelFilter] = useState<"All" | MessageChannel>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | MessageStatus>("All");
  const [sendTemplate, setSendTemplate] = useState<CommTemplate | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const templates = useMemo(() => commTemplates.filter(t => t.audience === audience), [audience]);
  const filteredMessages = messages.filter(
    m => (channelFilter === "All" || m.channel === channelFilter) && (statusFilter === "All" || m.status === statusFilter),
  );
  const detail = messages.find(m => m.id === detailId) ?? null;
  const failed = messages.filter(m => m.status === "Failed").length;

  /* Retrying re-runs the same simulated send on the same record. */
  const retry = (m: CommMessage) => {
    updateMessage(m.id, { status: "Sending", failureReason: undefined });
    window.setTimeout(() => updateMessage(m.id, { status: "Sent", sentAt: "Just now", failureReason: undefined }), 900);
    toast({ tone: "info", title: "Retrying", message: `${m.templateName} to ${m.partyName} on ${m.channel}.` });
  };

  return (
    <div className="page-stack">
      <div className="integration-head">
        <div>
          <p className="kicker">COMMUNICATION</p>
          <h2>Customer & supplier messaging</h2>
          <p className="muted-line">
            Send a template on WhatsApp, email or SMS against any order, invoice, PO or GRN. Every message is recorded
            against the party and the record it belongs to.
          </p>
        </div>
        <div className="integration-status">
          <Badge tone="gold">Integration prototype</Badge>
          <span><i className="dot-idle" aria-hidden="true" /> No messaging provider connected</span>
          <small>{messages.length} message{messages.length === 1 ? "" : "s"} on record</small>
        </div>
      </div>

      {failed > 0 && (
        <Alert tone="warning" title={`${failed} message${failed === 1 ? "" : "s"} failed to send`}>
          Open the message to see the reason and retry it, or switch channel.
        </Alert>
      )}

      <div className="two-col comm-grid">
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">TEMPLATES</p><h2>{templates.length} ready to send</h2></div>
          </div>
          <Tabs tabs={["Customer", "Supplier"]} active={audience} onChange={setAudience} label="Template audience" />
          <div className="template-grid">
            {templates.map(t => (
              <div key={t.id} className="template-card">
                <div className="template-head">
                  <strong>{t.name}</strong>
                  <span className="chip-row">
                    {t.channels.map(c => (
                      <span key={c} className="pref-chip"><Icon name={channelIcon[c]} size={12} /> {c}</span>
                    ))}
                  </span>
                </div>
                <p className="muted">{t.body.length > 96 ? `${t.body.slice(0, 96)}…` : t.body}</p>
                <Button variant="secondary" onClick={() => setSendTemplate(t)}><Icon name="send" /> Send</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">HISTORY</p><h2>{filteredMessages.length} messages</h2></div>
            <div className="chip-row">
              <select aria-label="Filter by channel" value={channelFilter} onChange={e => setChannelFilter(e.target.value as typeof channelFilter)}>
                <option>All</option><option>WhatsApp</option><option>Email</option><option>SMS</option>
              </select>
              <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option>All</option><option>Draft</option><option>Sending</option><option>Sent</option><option>Failed</option>
              </select>
            </div>
          </div>
          {filteredMessages.length === 0 ? (
            <EmptyState icon="mail" title="No messages yet" description="Send a template to start the history." mini />
          ) : (
            <div className="feed">
              {filteredMessages.slice(0, 12).map(m => (
                <button key={m.id} type="button" onClick={() => setDetailId(m.id)}>
                  <span className={`feed-icon ${m.channel === "WhatsApp" ? "emerald" : m.channel === "Email" ? "royal" : "gold"}`}>
                    <Icon name={channelIcon[m.channel]} size={15} />
                  </span>
                  <span className="feed-body">
                    <strong>{m.templateName} · {m.partyName}</strong>
                    <small>{m.preview}</small>
                    <small className="muted">{m.channel}{m.reference ? ` · ${m.reference}` : ""} · {m.time}</small>
                  </span>
                  <Badge tone={messageStatusTone[m.status]}>{m.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        eyebrow={detail ? `${detail.channel.toUpperCase()} · ${detail.partyKind.toUpperCase()}` : undefined}
        title={detail ? detail.templateName : ""}
        footer={
          detail?.status === "Failed" ? (
            <Button onClick={() => { retry(detail); setDetailId(null); }}><Icon name="send" /> Retry send</Button>
          ) : undefined
        }
      >
        {detail && (
          <div className="page-stack">
            {detail.status === "Failed" && detail.failureReason && (
              <Alert tone="danger" title="Delivery failed">{detail.failureReason}</Alert>
            )}
            <div className="detail-list">
              <div><span>Status</span><strong>{detail.status}</strong></div>
              <div><span>Channel</span><strong>{detail.channel}</strong></div>
              <div><span>Recipient</span><strong>{detail.partyName}</strong></div>
              <div><span>Template</span><strong>{detail.templateName}</strong></div>
              {detail.subject && <div><span>Subject</span><strong>{detail.subject}</strong></div>}
              <div><span>Related record</span><strong>{detail.reference ?? "None"}</strong></div>
              <div><span>Created by</span><strong>{detail.createdBy ?? "—"}</strong></div>
              <div><span>Created</span><strong>{detail.time}</strong></div>
              {detail.sentAt && <div><span>Sent</span><strong>{detail.sentAt}</strong></div>}
            </div>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">MESSAGE</p><h2>As the recipient sees it</h2></div></div>
              <p className="requirement-quote">{detail.body ?? detail.preview}</p>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Delivery trail</h2></div></div>
              <Timeline
                items={[
                  { title: `Composed by ${detail.createdBy ?? "the team"}`, meta: detail.time, state: "done" },
                  { title: `Queued on ${detail.channel}`, meta: detail.time, state: "done" },
                  detail.status === "Failed"
                    ? { title: "Delivery failed", meta: detail.failureReason ?? "Unknown reason", state: "current" as const }
                    : detail.status === "Sending"
                      ? { title: "Sending…", meta: "In progress", state: "current" as const }
                      : { title: "Delivered to the recipient", meta: detail.sentAt ?? detail.time, state: "done" as const },
                ]}
              />
            </section>
            <Alert tone="info" title="Prototype delivery">
              No WhatsApp, email or SMS provider is connected. States are simulated so the workflow can be reviewed.
            </Alert>
          </div>
        )}
      </Drawer>

      <SendTemplateModal template={sendTemplate} onClose={() => setSendTemplate(null)} />
    </div>
  );
}
