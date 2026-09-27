import { useEffect, useState } from "react";
import Modal from "@/components/feedback/Modal";
import Radio from "@/components/forms/Radio";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { executives, lostReasons } from "@/data/crmData";

export function AssignModal({
  open,
  onClose,
  subject,
  current,
  onAssign,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  current?: string;
  onAssign: (executive: string) => void;
}) {
  const [choice, setChoice] = useState(current ?? executives[0]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="assign-title">
      <div className="modal-icon royal-icon"><Icon name="user" /></div>
      <h2 id="assign-title">Assign {subject}</h2>
      <p>The assigned executive owns follow-ups, quotations and conversion for this lead.</p>
      <div className="assign-list" role="radiogroup" aria-label="Assign to executive">
        {executives.map(name => (
          <Radio key={name} name="assign-exec" label={name} checked={choice === name} onChange={() => setChoice(name)} />
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onAssign(choice)}>Assign lead{subject.includes("leads") ? "s" : ""}</Button>
      </div>
    </Modal>
  );
}

export function FollowUpModal({
  open,
  onClose,
  leadName,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  leadName: string;
  onSchedule: (when: string, note: string) => void;
}) {
  const [date, setDate] = useState("2026-03-10");
  const [time, setTime] = useState("11:00");
  const [note, setNote] = useState("");
  const submit = () => {
    const when = `${new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}`;
    onSchedule(when, note.trim());
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="followup-title">
      <div className="modal-icon royal-icon"><Icon name="calendar" /></div>
      <h2 id="followup-title">Schedule follow-up</h2>
      <p>Set the next touchpoint with {leadName}. It will appear in follow-up queues and the timeline.</p>
      <div className="modal-field-row">
        <TextField label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <TextField label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <TextAreaField
        label="Agenda"
        placeholder="What should this follow-up cover?"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Schedule</Button>
      </div>
    </Modal>
  );
}

export function LostModal({
  open,
  onClose,
  subject,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState(lostReasons[0]);
  const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} labelledBy="lost-title">
      <div className="modal-icon"><Icon name="warning" /></div>
      <h2 id="lost-title">Mark {subject} as lost?</h2>
      <p>Lost leads stay in the CRM for reporting and can be reopened later.</p>
      <SelectField label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
        {lostReasons.map(r => <option key={r}>{r}</option>)}
      </SelectField>
      <TextAreaField
        label="Closing note"
        placeholder="Optional context for the team..."
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => onConfirm(reason, note.trim())}>Mark as lost</Button>
      </div>
    </Modal>
  );
}

export function ConvertModal({
  open,
  onClose,
  leadName,
  budgetLine,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  leadName: string;
  budgetLine: string;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="convert-title">
      <div className="modal-icon emerald-icon"><Icon name="check" /></div>
      <h2 id="convert-title">Convert {leadName} to a customer?</h2>
      <p>
        A customer record will be created with this lead’s contact details, and the lead will be
        marked <strong>Converted</strong>. Quotations and orders can then be raised against the
        customer.
      </p>
      <div className="summary-row"><span>Expected first purchase</span><strong>{budgetLine}</strong></div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm}>Convert to customer</Button>
      </div>
    </Modal>
  );
}

/* ---------- Lead call log ---------- */

const callOutcomes = [
  "Connected — interested",
  "Connected — needs time",
  "Follow-up needed",
  "No answer",
  "Wrong number",
  "Not interested",
];

export function CallLogModal({
  open,
  onClose,
  leadName,
  phone,
  onLog,
}: {
  open: boolean;
  onClose: () => void;
  leadName: string;
  phone: string;
  onLog: (outcome: string, note: string) => void;
}) {
  const [outcome, setOutcome] = useState(callOutcomes[0]);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      setOutcome(callOutcomes[0]);
      setNote("");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="call-title">
      <div className="modal-icon royal-icon"><Icon name="phone" /></div>
      <h2 id="call-title">Log a call — {leadName}</h2>
      <p>Dial +91 {phone}, then record what happened. The outcome goes on the lead timeline.</p>
      <SelectField label="Outcome" value={outcome} onChange={e => setOutcome(e.target.value)}>
        {callOutcomes.map(o => <option key={o}>{o}</option>)}
      </SelectField>
      <TextAreaField
        label="What was discussed?"
        placeholder="Requirement, objection, price expectation, agreed next step…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onLog(outcome, note.trim())}>Save call</Button>
      </div>
    </Modal>
  );
}

/* ---------- Lead meeting ---------- */

export function MeetingModal({
  open,
  onClose,
  leadName,
  executive,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  leadName: string;
  executive: string;
  onSchedule: (when: string, agenda: string) => void;
}) {
  const [when, setWhen] = useState("12 Mar 2026, 11:00 AM");
  const [agenda, setAgenda] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setWhen("12 Mar 2026, 11:00 AM");
      setAgenda("");
      setError(undefined);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="meeting-title">
      <div className="modal-icon royal-icon"><Icon name="calendar" /></div>
      <h2 id="meeting-title">Schedule a meeting — {leadName}</h2>
      <p>The meeting becomes a task on {executive}&rsquo;s board and is linked back to this lead.</p>
      <TextField label="When" value={when} onChange={e => setWhen(e.target.value)} />
      <TextAreaField
        label="Agenda" required
        placeholder="Plant visit, sample review, rate-card discussion…"
        value={agenda}
        onChange={e => { setAgenda(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (!agenda.trim()) return setError("Give the meeting an agenda"); onSchedule(when.trim(), agenda.trim()); }}>
          Schedule meeting
        </Button>
      </div>
    </Modal>
  );
}
