import { useEffect, useState } from "react";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import { paymentMethods } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { formatINR } from "@/utils";

export function AmountMethodModal({
  open,
  onClose,
  icon = "check",
  title,
  message,
  defaultAmount,
  max,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  icon?: IconName;
  title: string;
  message: React.ReactNode;
  defaultAmount: number;
  max?: number;
  confirmLabel: string;
  onConfirm: (amount: number, method: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(defaultAmount));
      setError(undefined);
    }
  }, [open, defaultAmount]);

  const submit = () => {
    const value = Number(amount.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
    if (max !== undefined && value > max) return setError(`Amount cannot exceed ${formatINR(max)}`);
    onConfirm(value, method);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="amount-title">
      <div className="modal-icon emerald-icon"><Icon name={icon} /></div>
      <h2 id="amount-title">{title}</h2>
      <p>{message}</p>
      <div className="modal-field-row">
        <TextField label="Amount" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} error={error} />
        <SelectField label="Method" value={method} onChange={e => setMethod(e.target.value)}>
          {paymentMethods.map(m => <option key={m}>{m}</option>)}
        </SelectField>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function SendQuoteModal({
  open,
  onClose,
  estimatedCost,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  estimatedCost: number;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(estimatedCost));
      setError(undefined);
    }
  }, [open, estimatedCost]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="cquote-title">
      <div className="modal-icon royal-icon"><Icon name="component" /></div>
      <h2 id="cquote-title">Send quotation to customer</h2>
      <p>The estimate was {formatINR(estimatedCost)}. Confirm the quoted amount — it becomes the billing basis after approval.</p>
      <TextField
        label="Quoted amount" required prefix="₹" inputMode="numeric"
        value={amount}
        onChange={e => { setAmount(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Number(amount.replace(/[,\s]/g, ""));
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
            onConfirm(value);
          }}
        >
          <Icon name="mail" /> Send quotation
        </Button>
      </div>
    </Modal>
  );
}

export function ProgressModal({
  open,
  onClose,
  current,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  current: number;
  onConfirm: (progress: number, note: string) => void;
}) {
  const [progress, setProgress] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setProgress(String(Math.min(current + 25, 100)));
      setNote("");
      setError(undefined);
    }
  }, [open, current]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="progress-title">
      <div className="modal-icon royal-icon"><Icon name="settings" /></div>
      <h2 id="progress-title">Update work progress</h2>
      <p>Currently at {current}%. Progress updates appear on the order timeline and drive the customer updates.</p>
      <div className="modal-field-row">
        <TextField
          label="Progress %" required inputMode="numeric"
          value={progress}
          onChange={e => { setProgress(e.target.value.replace(/\D/g, "")); setError(undefined); }}
          error={error}
        />
      </div>
      <TextAreaField label="What was done?" placeholder="e.g. Wrapping complete on the first 40 cartons..." value={note} onChange={e => setNote(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = parseInt(progress, 10);
            if (Number.isNaN(value) || value < current || value > 100) return setError(`Enter a value between ${current} and 100`);
            onConfirm(value, note.trim());
          }}
        >
          Update progress
        </Button>
      </div>
    </Modal>
  );
}

export function EstimateModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, expected: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [expected, setExpected] = useState("2026-03-14");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount("");
      setError(undefined);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="estimate-title">
      <div className="modal-icon royal-icon"><Icon name="component" /></div>
      <h2 id="estimate-title">Record repair estimate</h2>
      <p>The estimate is shared with the customer for approval before any work starts.</p>
      <div className="modal-field-row">
        <TextField label="Estimate" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} error={error} />
        <TextField label="Expected delivery" type="date" value={expected} onChange={e => setExpected(e.target.value)} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Number(amount.replace(/[,\s]/g, ""));
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid estimate");
            onConfirm(
              value,
              new Date(expected + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            );
          }}
        >
          Share estimate
        </Button>
      </div>
    </Modal>
  );
}

export function NewRepairModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (customerId: string, customerName: string, product: string, issue: string) => void;
}) {
  const { customers } = useCrm();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [product, setProduct] = useState("");
  const [issue, setIssue] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setCustomerId(customers[0]?.id ?? "");
      setProduct("");
      setIssue("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-repair-title">
      <div className="modal-icon royal-icon"><Icon name="settings" /></div>
      <h2 id="new-repair-title">New repair request</h2>
      <p>Log the item and the issue. It moves through inspection and an estimate before any work begins.</p>
      <SelectField label="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id.replace("cust-", "CUST-")}</option>)}
      </SelectField>
      <TextField label="Item" required placeholder="e.g. Sandal Bath Soap 100 g · carton" value={product} onChange={e => { setProduct(e.target.value); setError(undefined); }} />
      <TextAreaField label="Issue" required placeholder="What needs fixing?" value={issue} onChange={e => { setIssue(e.target.value); setError(undefined); }} error={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) return;
            if (!product.trim() || !issue.trim()) return setError("Item and issue are both required");
            onSubmit(customer.id, customer.name, product.trim(), issue.trim());
          }}
        >
          Log repair
        </Button>
      </div>
    </Modal>
  );
}
