import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useAdmin } from "@/hooks/useAdmin";
import { useProducts } from "@/hooks/useProducts";

export function ConfirmModal({
  open,
  onClose,
  icon = "warning",
  danger = false,
  title,
  message,
  confirmLabel,
  withRemarks = false,
  remarksLabel = "Remarks",
  remarksRequired = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  icon?: IconName;
  danger?: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  /** Show a remarks field; the value is passed to onConfirm for the approval record. */
  withRemarks?: boolean;
  remarksLabel?: string;
  remarksRequired?: boolean;
  onConfirm: (remarks?: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();
  const { activeRole } = useAdmin();
  useEffect(() => {
    if (open) {
      setRemarks("");
      setError(undefined);
    }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="confirm-title">
      <div className={danger ? "modal-icon" : "modal-icon royal-icon"}><Icon name={icon} /></div>
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      {withRemarks && (
        <>
          <TextAreaField
            label={remarksLabel}
            required={remarksRequired}
            placeholder="Recorded with your name and timestamp on the approval trail…"
            value={remarks}
            onChange={e => { setRemarks(e.target.value); setError(undefined); }}
            error={error}
          />
          {/* Every approval names its approver before the decision is taken. */}
          <p className="approver-line">
            <Icon name="shield" size={13} />
            Recorded as <strong>Arjun Sharma</strong> · {activeRole} · 08 Mar 2026
          </p>
        </>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            if (withRemarks && remarksRequired && !remarks.trim()) return setError("Remarks are required for this decision");
            onConfirm(withRemarks ? remarks.trim() || undefined : undefined);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function NewTransferModal({
  open,
  onClose,
  presetProductId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  presetProductId?: string;
  onSubmit: (productId: string, qty: number, destination: string, reason: string) => void;
}) {
  const { products, locations } = useProducts();
  const movable = useMemo(
    () => products.filter(p => p.stock > 0 && p.status !== "Sold" && p.status !== "Dispatched"),
    [products],
  );
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [destination, setDestination] = useState(locations[0]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      const initial = presetProductId ?? movable[0]?.id ?? "";
      setProductId(initial);
      setQty("1");
      setReason("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetProductId]);

  const product = products.find(p => p.id === productId);
  const destinations = locations.filter(l => l !== product?.location);

  useEffect(() => {
    if (product && destinations.length && !destinations.includes(destination)) {
      setDestination(destinations[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, open]);

  const submit = () => {
    const quantity = parseInt(qty, 10);
    if (!product) return;
    if (!quantity || quantity < 1 || quantity > product.stock) {
      setError(`Enter a quantity between 1 and ${product.stock}`);
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for the approval trail");
      return;
    }
    onSubmit(product.id, quantity, destination, reason.trim());
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-transfer-title">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="new-transfer-title">New stock transfer</h2>
      <p>Transfers need approval before stock moves. The request is logged for the audit trail.</p>
      <SelectField label="Product" value={productId} onChange={e => { setProductId(e.target.value); setError(undefined); }}>
        {movable.map(p => (
          <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
        ))}
      </SelectField>
      {product && (
        <div className="summary-row"><span>Source · current stock</span><strong>{product.location} · {product.stock}</strong></div>
      )}
      <div className="modal-field-row">
        <TextField label="Quantity" inputMode="numeric" value={qty} onChange={e => { setQty(e.target.value.replace(/\D/g, "")); setError(undefined); }} />
        <SelectField label="Destination" value={destination} onChange={e => setDestination(e.target.value)}>
          {destinations.map(l => <option key={l}>{l}</option>)}
        </SelectField>
      </div>
      <TextAreaField
        label="Reason" required
        placeholder="Why is this stock moving?"
        value={reason}
        onChange={e => { setReason(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!product}>Request transfer</Button>
      </div>
    </Modal>
  );
}

export function NewSessionModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (location: string) => void;
}) {
  const { products, locations } = useProducts();
  const [location, setLocation] = useState(locations[0]);
  const count = products.filter(p => p.location === location).length;

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-session-title">
      <div className="modal-icon royal-icon"><Icon name="check" /></div>
      <h2 id="new-session-title">Start physical verification</h2>
      <p>Counting freezes expectations at today’s book stock. Differences need approval before any adjustment is posted.</p>
      <SelectField label="Location" value={location} onChange={e => setLocation(e.target.value)}>
        {locations.map(l => <option key={l}>{l}</option>)}
      </SelectField>
      <div className="summary-row"><span>Products to count</span><strong>{count}</strong></div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(location)} disabled={count === 0}>Start counting</Button>
      </div>
    </Modal>
  );
}

export function AddLocationModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const { locations } = useProducts();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setName("");
      setError(undefined);
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Location name is required");
      return;
    }
    if (locations.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setError("This location already exists");
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-location-title">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="add-location-title">Add warehouse location</h2>
      <p>Use the pattern “Branch · Area”, e.g. “Vapi Plant · Warehouse C”.</p>
      <TextField
        label="Location name" required placeholder="Vapi Plant · Warehouse C"
        value={name}
        onChange={e => { setName(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Add location</Button>
      </div>
    </Modal>
  );
}
