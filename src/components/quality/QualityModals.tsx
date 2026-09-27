import { useEffect, useState } from "react";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { saleTotals } from "@/data/salesData";
import { useSales } from "@/hooks/useSales";
import type { RefundMethod, ReturnCase, SalesOrder } from "@/types";
import { formatINR } from "@/utils";

const returnableStatuses = ["Dispatched", "Delivered", "Completed"];

export function NewReturnModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: SalesOrder, reason: string, qty: number) => void;
}) {
  const { orders } = useSales();
  const returnable = orders.filter(o => returnableStatuses.includes(o.status));
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setOrderId(returnable[0]?.id ?? "");
      setReason("");
      setQty("1");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const order = returnable.find(o => o.id === orderId);
  /* A customer can only return what was sold on the order. */
  const orderedQty = order?.lines.reduce((sum, l) => sum + l.qty, 0) ?? 0;
  const qtyValue = Number(qty.replace(/\D/g, "")) || 0;

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-return-title">
      <div className="modal-icon royal-icon"><Icon name="grid" /></div>
      <h2 id="new-return-title">New return request</h2>
      <p>Returns can be raised against dispatched, delivered or completed orders. Each return goes through inspection before approval.</p>
      {returnable.length === 0 ? (
        <p className="muted">No returnable orders right now.</p>
      ) : (
        <>
          <SelectField label="Order" value={orderId} onChange={e => setOrderId(e.target.value)}>
            {returnable.map(o => (
              <option key={o.id} value={o.id}>{o.id} · {o.customerName} · {o.lines[0]?.name}</option>
            ))}
          </SelectField>
          {order && (
            <>
              <div className="summary-row">
                <span>{order.lines[0]?.sku}</span>
                <strong>{formatINR(saleTotals(order.lines, order.gstPct).total)}</strong>
              </div>
              <div className="summary-row"><span>Dispatched on this order</span><strong>{orderedQty} unit{orderedQty === 1 ? "" : "s"}</strong></div>
              <TextField
                label="Return quantity" required inputMode="numeric"
                helper={`Between 1 and ${orderedQty} — the quantity carries through inspection, disposition and any reprocessing.`}
                value={qty}
                onChange={e => { setQty(e.target.value.replace(/\D/g, "")); setError(undefined); }}
              />
            </>
          )}
          <TextAreaField
            label="Reason" required
            placeholder="What is wrong, and what does the customer want?"
            value={reason}
            onChange={e => { setReason(e.target.value); setError(undefined); }}
            error={error}
          />
        </>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!order}
          onClick={() => {
            if (!order) return;
            if (qtyValue <= 0) return setError("Return quantity must be at least 1");
            if (qtyValue > orderedQty) return setError(`Only ${orderedQty} unit${orderedQty === 1 ? "" : "s"} were dispatched on ${order.id}`);
            if (!reason.trim()) return setError("A reason is required");
            onSubmit(order, reason.trim(), qtyValue);
          }}
        >
          Raise return
        </Button>
      </div>
    </Modal>
  );
}

const refundMethods: RefundMethod[] = ["Bank transfer", "UPI", "Cash", "Card reversal"];

export function RefundModal({
  open,
  onClose,
  ret,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  ret: ReturnCase;
  onConfirm: (method: RefundMethod, amount: number, reference: string) => void;
}) {
  const [method, setMethod] = useState<RefundMethod>("Bank transfer");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(ret.amount));
      setReference(`UTR-${Math.floor(10000000 + ((ret.amount * 7919) % 89999999))}`);
      setError(undefined);
    }
  }, [open, ret.amount]);

  const submit = () => {
    const value = Number(amount.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
    if (value > ret.amount) return setError(`Refund cannot exceed ${formatINR(ret.amount)}`);
    if (!reference.trim()) return setError("A transaction reference is required");
    onConfirm(method, value, reference.trim());
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="refund-title">
      <div className="modal-icon emerald-icon"><Icon name="check" /></div>
      <h2 id="refund-title">Process refund — {ret.id}</h2>
      <p>{ret.customerName} · {ret.product}. Refunds need manager approval and a transaction reference for the audit trail.</p>
      <div className="summary-row"><span>Return value</span><strong>{formatINR(ret.amount)}</strong></div>
      <div className="modal-field-row">
        <TextField label="Refund amount" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} />
        <SelectField label="Method" value={method} onChange={e => setMethod(e.target.value as RefundMethod)}>
          {refundMethods.map(m => <option key={m}>{m}</option>)}
        </SelectField>
      </div>
      <TextField label="Transaction reference" required value={reference} onChange={e => { setReference(e.target.value); setError(undefined); }} error={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Approve & complete refund</Button>
      </div>
    </Modal>
  );
}

export function CreditNoteModal({
  open,
  onClose,
  ret,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  ret: ReturnCase;
  onConfirm: (amount: number, validUntil: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [validUntil, setValidUntil] = useState("2026-09-08");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(ret.amount));
      setError(undefined);
    }
  }, [open, ret.amount]);

  const submit = () => {
    const value = Number(amount.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a valid amount");
    if (value > ret.amount) return setError(`Credit cannot exceed ${formatINR(ret.amount)}`);
    onConfirm(
      value,
      new Date(validUntil + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    );
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cn-title">
      <div className="modal-icon royal-icon"><Icon name="component" /></div>
      <h2 id="cn-title">Issue credit note — {ret.id}</h2>
      <p>{ret.customerName} can apply the credit against any future purchase before it expires.</p>
      <div className="modal-field-row">
        <TextField label="Credit amount" required prefix="₹" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value); setError(undefined); }} error={error} />
        <TextField label="Valid until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Issue credit note</Button>
      </div>
    </Modal>
  );
}
