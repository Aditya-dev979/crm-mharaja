import { useEffect, useState } from "react";
import Modal from "@/components/feedback/Modal";
import Radio from "@/components/forms/Radio";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { executives } from "@/data/crmData";
import { poTotals } from "@/data/purchaseData";
import { paymentMethods } from "@/data/salesData";
import type { PORevisionDraft } from "@/hooks/usePurchase";
import type { POLine, PRPriority, PurchaseOrder, PurchaseRequest } from "@/types";
import { formatINR } from "@/utils";

export function PurchaseRequestModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<PurchaseRequest, "id" | "date" | "status">) => void;
}) {
  const [requester, setRequester] = useState(executives[0]);
  const [items, setItems] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState<PRPriority>("Medium");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setItems("");
      setQty("1");
      setReason("");
      setCost("");
      setPriority("Medium");
      setError(undefined);
    }
  }, [open]);

  const submit = () => {
    const quantity = parseInt(qty, 10);
    const estimated = Number(cost.replace(/[,\s]/g, ""));
    if (!items.trim()) return setError("Describe what needs to be purchased");
    if (!quantity || quantity < 1) return setError("Enter a valid quantity");
    if (!estimated || Number.isNaN(estimated)) return setError("Enter an estimated cost");
    if (!reason.trim()) return setError("A reason is required for approval");
    onSubmit({ requester, items: items.trim(), qty: quantity, reason: reason.trim(), estimatedCost: estimated, priority });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="pr-title">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="pr-title">New purchase request</h2>
      <p>Requests go to an Approving Manager before a purchase order is raised.</p>
      <div className="modal-field-row">
        <SelectField label="Requested by" value={requester} onChange={e => setRequester(e.target.value)}>
          {executives.map(x => <option key={x}>{x}</option>)}
        </SelectField>
        <TextField label="Quantity" inputMode="numeric" value={qty} onChange={e => { setQty(e.target.value.replace(/\D/g, "")); setError(undefined); }} />
      </div>
      <TextField label="Items" required placeholder="e.g. Palm oil (RBD) · 5 MT" value={items} onChange={e => { setItems(e.target.value); setError(undefined); }} />
      <TextField label="Estimated cost" required prefix="₹" inputMode="numeric" value={cost} onChange={e => { setCost(e.target.value); setError(undefined); }} />
      <div className="field">
        <span className="field-label">Priority</span>
        <div className="radio-row">
          {(["High", "Medium", "Low"] as PRPriority[]).map(p => (
            <Radio key={p} name="pr-priority" label={p} checked={priority === p} onChange={() => setPriority(p)} />
          ))}
        </div>
      </div>
      <TextAreaField label="Reason" required placeholder="Why is this purchase needed?" value={reason} onChange={e => { setReason(e.target.value); setError(undefined); }} error={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Submit for approval</Button>
      </div>
    </Modal>
  );
}

export function SupplierPaymentModal({
  open,
  onClose,
  poId,
  supplierName,
  balance,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  poId: string;
  supplierName: string;
  balance: number;
  onConfirm: (amount: number, method: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(balance));
      setError(undefined);
    }
  }, [open, balance]);

  const submit = () => {
    const value = Number(amount.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
    if (value > balance) return setError(`Amount exceeds the outstanding ${formatINR(balance)}`);
    onConfirm(value, method);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="sp-title">
      <div className="modal-icon emerald-icon"><Icon name="check" /></div>
      <h2 id="sp-title">Pay {supplierName}</h2>
      <p>{poId}. Supplier payments post to the payable ledger and the PO timeline.</p>
      <div className="summary-row"><span>Outstanding on this PO</span><strong>{formatINR(balance)}</strong></div>
      <div className="modal-field-row">
        <TextField label="Amount" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} error={error} />
        <SelectField label="Method" value={method} onChange={e => setMethod(e.target.value)}>
          {paymentMethods.map(m => <option key={m}>{m}</option>)}
        </SelectField>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Record payment</Button>
      </div>
    </Modal>
  );
}

/* A PO cannot be edited in place once it is approved — a change creates a new
   version, withdraws the approval and sends the order back for re-approval. */
export function RevisePOModal({
  open,
  onClose,
  po,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
  onConfirm: (next: PORevisionDraft, reason: string) => void;
}) {
  const [lines, setLines] = useState<POLine[]>(po.lines);
  const [transport, setTransport] = useState(String(po.transport));
  const [deliveryDate, setDeliveryDate] = useState(po.deliveryDate);
  const [paymentTerms, setPaymentTerms] = useState(po.paymentTerms);
  const [transporter, setTransporter] = useState(po.transporter ?? "");
  const [creditDays, setCreditDays] = useState(String(po.creditDays ?? 0));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setLines(po.lines);
    setTransport(String(po.transport));
    setDeliveryDate(po.deliveryDate);
    setPaymentTerms(po.paymentTerms);
    setTransporter(po.transporter ?? "");
    setCreditDays(String(po.creditDays ?? 0));
    setReason("");
    setError(undefined);
  }, [open, po]);

  const setLine = (index: number, patch: Partial<POLine>) =>
    setLines(list => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const transportValue = Number(transport.replace(/[,\s]/g, "")) || 0;
  const oldTotal = poTotals(po).total;
  const newTotal = poTotals({ lines, transport: transportValue, taxPct: po.taxPct }).total;
  const delta = newTotal - oldTotal;
  const deltaPct = oldTotal ? (Math.abs(delta) / oldTotal) * 100 : 0;

  const submit = () => {
    if (lines.some(l => l.qty <= 0)) return setError("Every line needs a quantity above zero");
    if (!deliveryDate.trim()) return setError("Give the revised delivery date");
    if (!reason.trim()) return setError("A revision reason is required — it goes on the audit trail");
    onConfirm(
      {
        lines,
        transport: transportValue,
        deliveryDate: deliveryDate.trim(),
        paymentTerms: paymentTerms.trim(),
        transporter: transporter.trim() || undefined,
        creditDays: Number(creditDays.replace(/\D/g, "")) || 0,
      },
      reason.trim(),
    );
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="rev-title" className="wide-modal">
      <div className="modal-icon amber-icon"><Icon name="edit" /></div>
      <h2 id="rev-title">Revise {po.id}</h2>
      <p>
        This creates version {(po.version ?? 1) + 1}. Version {po.version ?? 1} stays on record, the approval is
        withdrawn and the PO returns to Draft for re-approval before it can be re-sent.
      </p>
      <div className="table-wrap op-table">
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="note-cell">{line.description}</td>
                <td>
                  <input
                    className="count-input" inputMode="numeric" aria-label={`Quantity for ${line.description}`}
                    value={String(line.qty)}
                    onChange={e => { setLine(i, { qty: Number(e.target.value.replace(/\D/g, "")) || 0 }); setError(undefined); }}
                  />
                </td>
                <td>
                  <input
                    className="count-input" inputMode="numeric" aria-label={`Unit price for ${line.description}`}
                    value={String(line.unitPrice)}
                    onChange={e => { setLine(i, { unitPrice: Number(e.target.value.replace(/\D/g, "")) || 0 }); setError(undefined); }}
                  />
                </td>
                <td><strong>{formatINR(line.qty * line.unitPrice)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-field-row">
        <TextField label="Transport & insurance" prefix="₹" inputMode="numeric" value={transport} onChange={e => setTransport(e.target.value)} />
        <TextField label="Revised delivery date" required value={deliveryDate} onChange={e => { setDeliveryDate(e.target.value); setError(undefined); }} />
      </div>
      <div className="modal-field-row">
        <TextField label="Transporter" value={transporter} onChange={e => setTransporter(e.target.value)} />
        <TextField label="Credit period (days)" inputMode="numeric" value={creditDays} onChange={e => setCreditDays(e.target.value.replace(/\D/g, ""))} />
      </div>
      <TextField label="Payment terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
      <div className="summary-row"><span>Version {po.version ?? 1} total</span><strong>{formatINR(oldTotal)}</strong></div>
      <div className="summary-row">
        <span>Version {(po.version ?? 1) + 1} total</span>
        <strong>{formatINR(newTotal)}{delta !== 0 && ` · ${delta > 0 ? "+" : "−"}${deltaPct.toFixed(1)}%`}</strong>
      </div>
      <TextAreaField
        label="Reason for revision" required
        placeholder="e.g. Supplier revised the palm oil rate after the market movement on 06 Mar."
        value={reason} onChange={e => { setReason(e.target.value); setError(undefined); }} error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create version {(po.version ?? 1) + 1}</Button>
      </div>
    </Modal>
  );
}

export function ReceiveMaterialModal({
  open,
  onClose,
  poId,
  supplierName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  poId: string;
  supplierName: string;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote("");
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="receive-title">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="receive-title">Receive material for {poId}</h2>
      <p>
        Creates a GRN from {supplierName} with expected quantities from the PO. It then moves through
        verification and quality inspection before stock is posted.
      </p>
      <TextAreaField label="Receiving note" placeholder="Condition of packaging, seals, transporter reference..." value={note} onChange={e => setNote(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onConfirm(note.trim())}><Icon name="check" /> Create GRN</Button>
      </div>
    </Modal>
  );
}
