import { useEffect, useState } from "react";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { couriers, orderStatuses, paidAmount, paymentMethods, saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useProducts } from "@/hooks/useProducts";
import { toneForCategory } from "@/components/products/ProductForm";
import type { OrderStatus, QuoteLine, SalesOrder } from "@/types";
import { formatINR } from "@/utils";

export function RecordPaymentModal({
  open,
  onClose,
  order,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  order: SalesOrder;
  onConfirm: (amount: number, method: string) => void;
}) {
  const { total } = saleTotals(order.lines, order.gstPct);
  const balance = total - paidAmount(order);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setAmount(String(balance));
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const value = Number(amount.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (value > balance) {
      setError(`Amount exceeds the balance of ${formatINR(balance)}`);
      return;
    }
    onConfirm(value, method);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="payment-title">
      <div className="modal-icon emerald-icon"><Icon name="check" /></div>
      <h2 id="payment-title">Record payment</h2>
      <p>{order.id} · {order.customerName}. Payments post a receipt and update the balance instantly.</p>
      <div className="summary-row"><span>Outstanding balance</span><strong>{formatINR(balance)}</strong></div>
      <div className="modal-field-row">
        <TextField
          label="Amount" required prefix="₹" inputMode="numeric"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(undefined); }}
          error={error}
        />
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

export function DispatchModal({
  open,
  onClose,
  order,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  order: SalesOrder;
  onConfirm: (courier: string, tracking: string, expected: string) => void;
}) {
  const [courier, setCourier] = useState(couriers[0]);
  const [tracking, setTracking] = useState("");
  const [expected, setExpected] = useState("Tomorrow");
  const [error, setError] = useState<string>();
  const { total } = saleTotals(order.lines, order.gstPct);
  const balance = total - paidAmount(order);
  useEffect(() => {
    if (open) {
      setTracking("");
      setError(undefined);
    }
  }, [open]);

  const submit = () => {
    if (courier !== "Store pickup" && !tracking.trim()) {
      setError("Tracking reference is required for courier dispatch");
      return;
    }
    onConfirm(courier, tracking.trim() || "—", expected.trim() || "—");
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="dispatch-title">
      <div className="modal-icon royal-icon"><Icon name="upload" /></div>
      <h2 id="dispatch-title">Dispatch {order.id}</h2>
      <p>Delivery to: {order.deliveryAddress ?? "address on file"}. Dispatch posts a stock movement and notifies the customer.</p>
      {balance > 0 && (
        <Alert tone="warning" title={`Balance of ${formatINR(balance)} is unpaid`}>
          Policy requires full payment before dispatch. Confirming records a payment-pending dispatch exception.
        </Alert>
      )}
      <SelectField label="Courier" value={courier} onChange={e => setCourier(e.target.value)}>
        {couriers.map(c => <option key={c}>{c}</option>)}
      </SelectField>
      <div className="modal-field-row">
        <TextField
          label="Tracking reference" placeholder="e.g. SQ-889124"
          value={tracking}
          onChange={e => { setTracking(e.target.value); setError(undefined); }}
          error={error}
        />
        <TextField label="Expected delivery" value={expected} onChange={e => setExpected(e.target.value)} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}><Icon name="upload" /> Confirm dispatch</Button>
      </div>
    </Modal>
  );
}

/* Statuses the Dispatch module owns. They are reached by completing the
   shipment journey (packing → challan → LR → gate pass → FIFO reduction),
   never by setting them by hand on the order. */
export const dispatchOwnedStatuses: OrderStatus[] = ["Dispatched", "Delivered"];

export function OrderStatusModal({
  open,
  onClose,
  order,
  onConfirm,
  shipmentId,
  onOpenShipment,
  onCreateShipment,
}: {
  open: boolean;
  onClose: () => void;
  order: SalesOrder;
  onConfirm: (status: OrderStatus, note: string) => void;
  /** The shipment already raised against this order, when there is one. */
  shipmentId?: string;
  onOpenShipment?: () => void;
  onCreateShipment?: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      setStatus(order.status);
      setNote("");
    }
  }, [open, order.status]);

  /* A dispatch-owned status may only be re-selected if the order is already
     there — so history stays editable, but the workflow cannot be skipped. */
  const isLocked = (s: OrderStatus) => dispatchOwnedStatuses.includes(s) && s !== order.status;
  const lockedSelected = isLocked(status);

  return (
    <Modal open={open} onClose={onClose} labelledBy="order-status-title">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="order-status-title">Change order status</h2>
      <p>{order.id} is currently <strong>{order.status}</strong>. Changes are recorded on the order timeline.</p>
      <SelectField label="New status" value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
        {orderStatuses.map(s => (
          <option key={s} value={s} disabled={isLocked(s)}>
            {s}{isLocked(s) ? " — set by Dispatch" : ""}
          </option>
        ))}
      </SelectField>
      {lockedSelected && (
        <Alert tone="warning" title="Complete the dispatch workflow first">
          <p>
            “{status}” is set by the Dispatch module once the consignment has been packed, a delivery challan and
            invoice raised, the LR and transporter recorded, the gate pass issued and stock reduced FIFO. Setting it
            here would leave the order without any of those records.
          </p>
          <div className="note-actions">
            {shipmentId && onOpenShipment ? (
              <Button variant="secondary" onClick={() => { onClose(); onOpenShipment(); }}>
                <Icon name="send" /> Open {shipmentId}
              </Button>
            ) : onCreateShipment ? (
              <Button variant="secondary" onClick={() => { onClose(); onCreateShipment(); }}>
                <Icon name="send" /> Create shipment
              </Button>
            ) : null}
          </div>
        </Alert>
      )}
      {status === "Cancelled" && (
        <Alert tone="warning" title="Cancelling releases reserved stock">
          Reserved products on this order return to Available and the reservation is reversed in the stock ledger.
        </Alert>
      )}
      {status === "Completed" && (
        <Alert tone="info" title="Completing closes the order">
          Complete only after delivery and full payment. The order stays in history for returns and repairs.
        </Alert>
      )}
      <TextAreaField label="Note" placeholder="Why is the status changing? (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={status === "Cancelled" ? "danger" : "primary"}
          disabled={status === order.status || lockedSelected}
          onClick={() => onConfirm(status, note.trim())}
        >
          Confirm — {status}
        </Button>
      </div>
    </Modal>
  );
}

export function NewOrderModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (customerId: string, line: QuoteLine) => void;
}) {
  const { customers } = useCrm();
  const { products } = useProducts();
  const sellable = products.filter(p => p.status === "Available" && p.stock > 0);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [productId, setProductId] = useState(sellable[0]?.id ?? "");
  useEffect(() => {
    if (open) {
      setCustomerId(customers[0]?.id ?? "");
      setProductId(sellable[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const product = products.find(p => p.id === productId);

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-order-title">
      <div className="modal-icon royal-icon"><Icon name="grid" /></div>
      <h2 id="new-order-title">Quick sales order</h2>
      <p>Creates a confirmed order at list price and reserves the stock. For discounts and multiple items, start from a quotation.</p>
      <SelectField label="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id.replace("cust-", "CUST-")}</option>)}
      </SelectField>
      <SelectField label="Product" value={productId} onChange={e => setProductId(e.target.value)}>
        {sellable.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name} · {formatINR(p.sellingPrice)}</option>)}
      </SelectField>
      {product && (
        <div className="summary-row"><span>Order value · incl. 18% GST</span><strong>{formatINR(product.sellingPrice)}</strong></div>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!product || !customerId}
          onClick={() => {
            if (!product) return;
            onSubmit(customerId, {
              productId: product.id,
              sku: product.sku,
              name: product.name,
              tone: product.images.find(i => i.id === product.primaryImageId)?.tone ?? toneForCategory(product.category),
              price: product.sellingPrice,
              qty: 1,
              discountPct: 0,
            });
          }}
        >
          Create order & reserve stock
        </Button>
      </div>
    </Modal>
  );
}
