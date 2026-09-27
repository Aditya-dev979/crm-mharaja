import { useEffect, useState } from "react";
import Modal from "@/components/feedback/Modal";
import Badge from "@/components/ui/Badge";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { docTotals, EXPENSE_APPROVAL_LIMIT, expenseCategories, piStatusTone } from "@/data/financeData";
import { paymentMethods } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { usePurchase } from "@/hooks/usePurchase";
import { useSales } from "@/hooks/useSales";
import type { Expense, ExpenseCategory, FinanceDoc, SalesQuotation } from "@/types";
import { formatINR } from "@/utils";

const toDisplayDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function ExpenseModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: Omit<Expense, "id" | "status" | "recordedBy">) => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>("Rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("2026-03-08");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [attachment, setAttachment] = useState<string>();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setCategory("Rent");
      setDescription("");
      setAmount("");
      setDate("2026-03-08");
      setMethod(paymentMethods[0]);
      setAttachment(undefined);
      setNotes("");
      setError(undefined);
    }
  }, [open]);

  const value = Number(amount.replace(/[,\s]/g, ""));
  const needsApproval = !Number.isNaN(value) && value > EXPENSE_APPROVAL_LIMIT;

  return (
    <Modal open={open} onClose={onClose} labelledBy="expense-title">
      <div className="modal-icon royal-icon"><Icon name="wallet" /></div>
      <h2 id="expense-title">Record an expense</h2>
      <p>Recorded expenses post straight to the ledger. Anything above {formatINR(EXPENSE_APPROVAL_LIMIT)} waits for manager approval first.</p>
      <div className="modal-field-row">
        <SelectField label="Category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
          {expenseCategories.map(c => <option key={c}>{c}</option>)}
        </SelectField>
        <TextField label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <TextField
        label="Description" required placeholder="e.g. Sample room rent — March"
        value={description}
        onChange={e => { setDescription(e.target.value); setError(undefined); }}
      />
      <div className="modal-field-row">
        <TextField
          label="Amount" required prefix="₹" inputMode="numeric"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(undefined); }}
          error={error}
          helper={needsApproval ? "Above the limit — needs manager approval" : undefined}
        />
        <SelectField label="Payment method" value={method} onChange={e => setMethod(e.target.value)}>
          {paymentMethods.map(m => <option key={m}>{m}</option>)}
        </SelectField>
      </div>
      <div className="field">
        <span className="field-label">Attachment</span>
        {attachment ? (
          <span className="pref-chip"><Icon name="component" size={13} /> {attachment}</span>
        ) : (
          <Button variant="secondary" onClick={() => setAttachment(`${category.toLowerCase()}-receipt.pdf`)}>
            <Icon name="upload" /> Attach receipt
          </Button>
        )}
      </div>
      <TextAreaField label="Notes" placeholder="Anything the accountant should know…" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!description.trim()) return setError("Description and a valid amount are required");
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
            onSubmit({
              category,
              description: description.trim(),
              amount: value,
              date: toDisplayDate(date),
              method,
              attachment,
              notes: notes.trim() || undefined,
            });
          }}
        >
          {needsApproval ? "Submit for approval" : "Record expense"}
        </Button>
      </div>
    </Modal>
  );
}

export type DocCreateMode = "proforma" | "credit-note" | "debit-note" | "refund-receipt";

const modeCopy: Record<DocCreateMode, { title: string; blurb: string; confirm: string }> = {
  proforma: {
    title: "New proforma invoice",
    blurb: "Pick the quotation to bill — its lines, discounts and GST carry over.",
    confirm: "Create proforma",
  },
  "credit-note": {
    title: "New credit note",
    blurb: "Issues store credit to a customer, adjustable against future purchases.",
    confirm: "Issue credit note",
  },
  "debit-note": {
    title: "New debit note",
    blurb: "Raises a recoverable amount against a supplier — short shipments, rejections or rate differences.",
    confirm: "Raise debit note",
  },
  "refund-receipt": {
    title: "New refund receipt",
    blurb: "Records money returned to a customer. Refunds are manager-authorised and post to the ledger.",
    confirm: "Record refund",
  },
};

export function DocCreateModal({
  mode,
  onClose,
  onCreateProforma,
  onCreateParty,
}: {
  mode: DocCreateMode | null;
  onClose: () => void;
  onCreateProforma: (quotation: SalesQuotation) => void;
  onCreateParty: (args: {
    mode: Exclude<DocCreateMode, "proforma">;
    partyId: string;
    partyName: string;
    amount: number;
    reason: string;
    method: string;
  }) => void;
}) {
  const { customers } = useCrm();
  const { suppliers } = usePurchase();
  const { quotations } = useSales();
  const [quoteId, setQuoteId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [error, setError] = useState<string>();

  const open = mode !== null;
  const billableQuotes = quotations.filter(q => !["Converted", "Rejected", "Expired"].includes(q.status));

  useEffect(() => {
    if (open) {
      setQuoteId(billableQuotes[0]?.id ?? "");
      setPartyId(mode === "debit-note" ? suppliers[0]?.id ?? "" : customers[0]?.id ?? "");
      setAmount("");
      setReason("");
      setMethod(paymentMethods[0]);
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!mode) return null;
  const copy = modeCopy[mode];
  const parties = mode === "debit-note" ? suppliers : customers;

  return (
    <Modal open={open} onClose={onClose} labelledBy="newdoc-title">
      <div className="modal-icon royal-icon"><Icon name="component" /></div>
      <h2 id="newdoc-title">{copy.title}</h2>
      <p>{copy.blurb}</p>
      {mode === "proforma" ? (
        <SelectField label="Quotation" value={quoteId} onChange={e => setQuoteId(e.target.value)}>
          {billableQuotes.map(q => (
            <option key={q.id} value={q.id}>{q.id} · {q.customerName} · {q.status}</option>
          ))}
        </SelectField>
      ) : (
        <>
          <SelectField label={mode === "debit-note" ? "Supplier" : "Customer"} value={partyId} onChange={e => setPartyId(e.target.value)}>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
          <div className="modal-field-row">
            <TextField
              label="Amount" required prefix="₹" inputMode="numeric"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(undefined); }}
              error={error}
            />
            {mode === "refund-receipt" ? (
              <SelectField label="Refund method" value={method} onChange={e => setMethod(e.target.value)}>
                {paymentMethods.map(m => <option key={m}>{m}</option>)}
              </SelectField>
            ) : (
              <div />
            )}
          </div>
          <TextAreaField
            label="Reason" required placeholder="What is this document for?"
            value={reason}
            onChange={e => { setReason(e.target.value); setError(undefined); }}
          />
          {mode === "refund-receipt" && (
            <p className="muted"><Icon name="shield" size={13} /> Manager authorisation — recorded as Arjun Sharma (Approving Manager).</p>
          )}
        </>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (mode === "proforma") {
              const quote = billableQuotes.find(q => q.id === quoteId);
              if (!quote) return setError("Pick a quotation");
              onCreateProforma(quote);
              return;
            }
            const party = parties.find(p => p.id === partyId);
            const value = Number(amount.replace(/[,\s]/g, ""));
            if (!party) return;
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
            if (!reason.trim()) return setError("A reason keeps the document traceable");
            onCreateParty({ mode, partyId: party.id, partyName: party.name, amount: value, reason: reason.trim(), method });
          }}
        >
          {copy.confirm}
        </Button>
      </div>
    </Modal>
  );
}

export function AdvanceModal({
  doc,
  total,
  onClose,
  onSubmit,
}: {
  doc: FinanceDoc | null;
  total: number;
  onClose: () => void;
  onSubmit: (args: { amount: number; method: string; txnRef: string; remarks?: string }) => string | undefined;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [txnRef, setTxnRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();
  const [refError, setRefError] = useState<string>();

  const open = doc !== null;
  useEffect(() => {
    if (doc) {
      setAmount(String(Math.max(Math.round(total * 0.4), total - doc.paid > 0 ? Math.min(Math.round(total * 0.4), total - doc.paid) : 0)));
      setMethod(paymentMethods[0]);
      setTxnRef("");
      setRemarks("");
      setError(undefined);
      setRefError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  if (!doc) return null;
  const remaining = total - doc.paid;
  const value = Number(amount.replace(/[,\s]/g, ""));

  return (
    <Modal open={open} onClose={onClose} labelledBy="advance-title" className="wide-modal">
      <div className="modal-icon emerald-icon"><Icon name="wallet" /></div>
      <h2 id="advance-title">Customer advance — {doc.id}</h2>
      <p>Linked to <b>{doc.partyName}</b> and PI <b>{doc.id}</b> (v{doc.pi?.version}). The advance updates the PI, the customer timeline and the ledger.</p>
      <div className="quote-totals">
        <div><span>PI amount</span><strong>{formatINR(total)}</strong></div>
        <div><span>Advance received</span><strong className="up-text">{formatINR(doc.paid)}</strong></div>
        <div className="quote-grand"><span>Remaining</span><strong className={remaining > 0 ? "warning-text" : "up-text"}>{formatINR(Math.max(remaining, 0))}</strong></div>
      </div>
      <div className="modal-field-row">
        <TextField label="Amount" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} error={error} />
        <SelectField label="Method" value={method} onChange={e => setMethod(e.target.value)}>
          {paymentMethods.map(m => <option key={m}>{m}</option>)}
        </SelectField>
      </div>
      <TextField
        label="Transaction / reference number" required placeholder="e.g. UTR-88240119"
        helper="Checked against every recorded payment — duplicate references are blocked."
        value={txnRef} onChange={e => { setTxnRef(e.target.value); setRefError(undefined); }} error={refError}
      />
      <TextAreaField label="Remarks" placeholder="Anything the accounts team should know…" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
            if (value > remaining) return setError(`Amount cannot exceed the remaining ${formatINR(remaining)}`);
            if (!txnRef.trim()) return setRefError("The transaction reference is mandatory for advances");
            const failure = onSubmit({ amount: value, method, txnRef: txnRef.trim(), remarks: remarks.trim() || undefined });
            if (failure) setRefError(failure);
          }}
        >
          <Icon name="check" /> Record advance
        </Button>
      </div>
    </Modal>
  );
}

export function PiCompareModal({
  current,
  previous,
  onClose,
}: {
  current: FinanceDoc | null;
  previous: FinanceDoc | null;
  onClose: () => void;
}) {
  if (!current || !previous) return null;
  const cur = docTotals(current.lines, current.gstPct);
  const prev = docTotals(previous.lines, previous.gstPct);
  const cell = (doc: FinanceDoc, totals: { total: number }) => (
    <div className="pi-compare-col">
      <div className="pi-compare-head">
        <strong>{doc.id}</strong>
        {doc.pi && <Badge tone={piStatusTone[doc.pi.status]}>v{doc.pi.version} · {doc.pi.status}</Badge>}
      </div>
      <div className="detail-list">
        <div><span>Total</span><strong>{formatINR(totals.total)}</strong></div>
        <div><span>Date</span><strong>{doc.date}</strong></div>
      </div>
      <p className="mini-title">LINES</p>
      <ul className="pi-list">
        {doc.lines.map((l, i) => <li key={i}>{l.name} · qty {l.qty} · {formatINR(l.price)}{l.discountPct ? ` · ${l.discountPct}% off` : ""}</li>)}
      </ul>
      <p className="mini-title">SPECIFICATIONS</p>
      <ul className="pi-list">
        {(doc.pi?.specifications ?? []).map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
  const delta = cur.total - prev.total;
  return (
    <Modal open onClose={onClose} labelledBy="picompare-title" className="wide-modal pi-compare-modal">
      <div className="modal-icon royal-icon"><Icon name="columns" /></div>
      <h2 id="picompare-title">Compare versions — {current.pi?.baseId}</h2>
      <p>
        v{previous.pi?.version} → v{current.pi?.version} ·{" "}
        {delta === 0 ? "no value change" : <b className={delta > 0 ? "warning-text" : "up-text"}>{delta > 0 ? "+" : "−"}{formatINR(Math.abs(delta))}</b>}
      </p>
      <div className="pi-compare-grid">
        {cell(previous, prev)}
        {cell(current, cur)}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

export function HoldModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: FinanceDoc | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (doc) {
      setReason("");
      setError(undefined);
    }
  }, [doc?.id]);
  if (!doc) return null;
  return (
    <Modal open onClose={onClose} labelledBy="hold-title">
      <div className="modal-icon"><Icon name="warning" /></div>
      <h2 id="hold-title">Hold payment — {doc.id}</h2>
      <p>Payments against this document stay blocked until the hold is released. The hold, reason and responsible person are visible everywhere the document appears.</p>
      <TextAreaField
        label="Hold reason" required placeholder="e.g. Credit note dispute — CN amount not agreed with customer"
        value={reason} onChange={e => { setReason(e.target.value); setError(undefined); }} error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => { if (!reason.trim()) return setError("A reason is required to hold payment"); onConfirm(reason.trim()); }}>
          Place hold
        </Button>
      </div>
    </Modal>
  );
}
