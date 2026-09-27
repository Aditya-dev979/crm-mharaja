import { useEffect, useMemo, useState } from "react";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import Checkbox from "@/components/forms/Checkbox";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { packageTypes } from "@/data/dispatchData";
import { couriers, paidAmount, saleTotals } from "@/data/salesData";
import { useDispatch } from "@/hooks/useDispatch";
import { useSales } from "@/hooks/useSales";
import type { ProofOfDelivery, SalesOrder, Shipment, TransportDetails } from "@/types";
import { formatINR } from "@/utils";

export function NewDispatchModal({
  open,
  onClose,
  onCreate,
  presetOrderId,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (order: SalesOrder, packageType: string, weight: string, insured: boolean, address: string) => void;
  /** Opened from a sales order: that order is preselected and locked. */
  presetOrderId?: string;
}) {
  const { orders } = useSales();
  const { shipments } = useDispatch();
  const eligible = useMemo(
    () =>
      presetOrderId
        ? orders.filter(o => o.id === presetOrderId)
        : orders.filter(
            o =>
              ["Processing", "Ready", "Confirmed", "Partially Paid"].includes(o.status) &&
              !shipments.some(s => s.orderId === o.id && !["Failed", "Returned"].includes(s.status)),
          ),
    [orders, shipments, presetOrderId],
  );
  const [orderId, setOrderId] = useState("");
  const [packageType, setPackageType] = useState(packageTypes[0]);
  const [weight, setWeight] = useState("0.4 kg");
  const [insured, setInsured] = useState(true);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (open) {
      const first = eligible[0];
      setOrderId(presetOrderId ?? first?.id ?? "");
      setPackageType(packageTypes[0]);
      setWeight("0.4 kg");
      setInsured(true);
      setAddress(first?.deliveryAddress ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetOrderId]);

  const order = eligible.find(o => o.id === orderId);

  return (
    <Modal open={open} onClose={onClose} labelledBy="newdispatch-title">
      <div className="modal-icon royal-icon"><Icon name="send" /></div>
      <h2 id="newdispatch-title">New dispatch</h2>
      <p>Pick a paid or processing order. Packing starts next, and the order updates as the shipment moves.</p>
      {eligible.length === 0 ? (
        <p className="muted">No orders are ready for dispatch right now — collect payments or confirm orders first.</p>
      ) : (
        <>
          <SelectField
            label="Sales order"
            value={orderId}
            onChange={e => {
              setOrderId(e.target.value);
              const next = eligible.find(o => o.id === e.target.value);
              setAddress(next?.deliveryAddress ?? "");
            }}
          >
            {eligible.map(o => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.customerName} · {formatINR(saleTotals(o.lines, o.gstPct).total)} · {o.status}
              </option>
            ))}
          </SelectField>
          {order && paidAmount(order) < saleTotals(order.lines, order.gstPct).total && (
            <p className="muted"><Icon name="warning" size={13} /> Balance pending on this order — dispatch is normally held until it clears.</p>
          )}
          <TextAreaField label="Delivery address" required value={address} onChange={e => setAddress(e.target.value)} />
          <div className="modal-field-row">
            <SelectField label="Package" value={packageType} onChange={e => setPackageType(e.target.value)}>
              {packageTypes.map(p => <option key={p}>{p}</option>)}
            </SelectField>
            <TextField label="Weight" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <Checkbox checked={insured} onChange={setInsured} label="Transit insurance & declared value" />
        </>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!order || !address.trim()}
          onClick={() => order && onCreate(order, packageType, weight.trim(), insured, address.trim())}
        >
          Create shipment
        </Button>
      </div>
    </Modal>
  );
}

export function ConfirmDispatchModal({
  open,
  onClose,
  shipmentId,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  onConfirm: (courier: string, tracking: string, expected: string, notify: boolean, transport: TransportDetails) => void;
}) {
  const [courier, setCourier] = useState(couriers[0]);
  const [tracking, setTracking] = useState("");
  const [expected, setExpected] = useState("2026-03-11");
  const [notify, setNotify] = useState(true);
  const [transporter, setTransporter] = useState(couriers[0]);
  const [lrNumber, setLrNumber] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setCourier(couriers[0]);
      setTracking(`SQ-${880000 + Math.floor(shipmentId.length * 4321) % 9999}`);
      setExpected("2026-03-11");
      setNotify(true);
      setTransporter(couriers[0]);
      setLrNumber(`LR-${260400 + (shipmentId.length * 7) % 99}`);
      setVehicle("RJ14 GC 2291");
      setError(undefined);
    }
  }, [open, shipmentId]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="confirmdispatch-title">
      <div className="modal-icon emerald-icon"><Icon name="send" /></div>
      <h2 id="confirmdispatch-title">Confirm dispatch — {shipmentId}</h2>
      <p>The order status updates to Dispatched and the customer can be notified with the dispatch template.</p>
      <div className="modal-field-row">
        <SelectField label="Courier" value={courier} onChange={e => setCourier(e.target.value)}>
          {couriers.map(c => <option key={c}>{c}</option>)}
        </SelectField>
        <TextField
          label="Tracking number" required value={tracking}
          onChange={e => { setTracking(e.target.value); setError(undefined); }}
          error={error}
        />
      </div>
      <TextField label="Expected delivery" type="date" value={expected} onChange={e => setExpected(e.target.value)} />
      <div className="modal-field-row">
        <SelectField label="Transporter" value={transporter} onChange={e => setTransporter(e.target.value)}>
          {couriers.map(c => <option key={c}>{c}</option>)}
        </SelectField>
        <TextField label="LR number" required value={lrNumber} onChange={e => { setLrNumber(e.target.value); setError(undefined); }} />
      </div>
      <TextField label="Vehicle / transport reference" placeholder="e.g. RJ14 GC 2291 or courier bag number" value={vehicle} onChange={e => setVehicle(e.target.value)} />
      <Checkbox checked={notify} onChange={setNotify} label="Notify customer on WhatsApp (Dispatch template, includes the LR number)" />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!tracking.trim()) return setError("Tracking number is required");
            if (!lrNumber.trim()) return setError("LR number is required for transport documents");
            onConfirm(
              courier,
              tracking.trim(),
              new Date(expected + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              notify,
              {
                transporter,
                lrNumber: lrNumber.trim(),
                vehicle: vehicle.trim() || undefined,
                lrDate: "08 Mar 2026",
                documents: ["Lorry receipt", "Insurance declaration", "E-way bill (where applicable)"],
              },
            );
          }}
        >
          <Icon name="send" /> Dispatch package
        </Button>
      </div>
    </Modal>
  );
}

/* Proof of delivery. A delivery is not a status flip — somebody at the
   customer's end receives the goods, in a stated condition, on a stated date. */
export function PodModal({
  open,
  shipment,
  recordedBy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  shipment: Shipment;
  recordedBy: string;
  onClose: () => void;
  onConfirm: (pod: ProofOfDelivery) => void;
}) {
  const totalQty = shipment.challan?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedOn, setReceivedOn] = useState("");
  const [condition, setCondition] = useState<ProofOfDelivery["condition"]>("Accepted in full");
  const [shortQty, setShortQty] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setReceivedBy("");
      setReceivedOn(shipment.expectedDelivery ?? "");
      setCondition("Accepted in full");
      setShortQty("");
      setRemarks("");
      setError(undefined);
    }
  }, [open, shipment.expectedDelivery]);

  const needsQty = condition === "Short received" || condition === "Damaged on arrival";
  const parsedShort = Math.max(0, parseInt(shortQty || "0", 10) || 0);
  const needsRemarks = condition !== "Accepted in full";

  return (
    <Modal open={open} onClose={onClose} labelledBy="pod-title">
      <div className="modal-icon"><Icon name="check" /></div>
      <h2 id="pod-title">Record proof of delivery — {shipment.id}</h2>
      <p>
        {shipment.customerName} · {shipment.address}
        {shipment.challan ? ` · challan ${shipment.challan.id}` : ""}
      </p>
      <TextField
        label="Received by (name at the customer's end)" required value={receivedBy}
        placeholder="e.g. Store in-charge name"
        onChange={e => { setReceivedBy(e.target.value); setError(undefined); }}
      />
      <TextField
        label="Received on" required value={receivedOn} placeholder="e.g. 14 Mar 2026"
        onChange={e => { setReceivedOn(e.target.value); setError(undefined); }}
      />
      <SelectField
        label="Condition on arrival" value={condition}
        onChange={e => { setCondition(e.target.value as ProofOfDelivery["condition"]); setError(undefined); }}
      >
        <option>Accepted in full</option>
        <option>Accepted with remarks</option>
        <option>Short received</option>
        <option>Damaged on arrival</option>
      </SelectField>
      {needsQty && (
        <TextField
          label={totalQty ? `Units affected (challan quantity ${totalQty})` : "Units affected"}
          required inputMode="numeric" value={shortQty}
          onChange={e => { setShortQty(e.target.value.replace(/\D/g, "")); setError(undefined); }}
        />
      )}
      <TextAreaField
        label={needsRemarks ? "Remarks" : "Remarks (optional)"} required={needsRemarks} value={remarks}
        placeholder="What the receiver noted on the challan copy"
        onChange={e => { setRemarks(e.target.value); setError(undefined); }}
        error={error}
      />
      {needsQty && (
        <Alert tone="warning" title="This delivery closes with a discrepancy">
          The shipment still moves to Delivered, but a sales return or credit note is needed to settle
          {parsedShort ? ` the ${parsedShort} affected unit(s)` : " the affected units"}. Raise it from Quality &amp; Returns.
        </Alert>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!receivedBy.trim()) return setError("Enter who received the consignment");
            if (!receivedOn.trim()) return setError("Enter the date it was received");
            if (needsQty && parsedShort <= 0) return setError("Enter the number of units affected");
            if (needsQty && totalQty > 0 && parsedShort > totalQty) return setError(`Cannot exceed the challan quantity of ${totalQty}`);
            if (needsRemarks && !remarks.trim()) return setError("Remarks are required when the condition is not clean");
            onConfirm({
              receivedBy: receivedBy.trim(),
              receivedOn: receivedOn.trim(),
              condition,
              shortQty: needsQty ? parsedShort : undefined,
              remarks: remarks.trim() || undefined,
              recordedBy,
            });
          }}
        >
          Record delivery
        </Button>
      </div>
    </Modal>
  );
}

export function FailDeliveryModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setReason("");
      setError(undefined);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="fail-title">
      <div className="modal-icon"><Icon name="warning" /></div>
      <h2 id="fail-title">Mark delivery failed</h2>
      <p>The shipment moves to Failed. You can retry dispatch or return the package to store afterwards.</p>
      <TextAreaField
        label="What happened?" required placeholder="e.g. Customer unreachable, address incorrect…"
        value={reason}
        onChange={e => { setReason(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!reason.trim()) return setError("A reason keeps delivery issues traceable");
            onConfirm(reason.trim());
          }}
        >
          Mark failed
        </Button>
      </div>
    </Modal>
  );
}
