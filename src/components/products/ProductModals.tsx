import { useEffect, useState } from "react";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { certAuthorities, certTypes, productStatuses } from "@/data/productData";
import { useProducts } from "@/hooks/useProducts";
import type { Product, ProductCertificate, ProductStatus } from "@/types";
import { isCertificateNumber } from "@/utils";

const terminalStatuses: ProductStatus[] = ["Sold", "Damaged", "Dispatched"];

export function StatusModal({
  open,
  onClose,
  product,
  initialStatus,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  initialStatus?: ProductStatus;
  onConfirm: (status: ProductStatus, note: string) => void;
}) {
  const [status, setStatus] = useState<ProductStatus>(initialStatus ?? product.status);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      setStatus(initialStatus ?? product.status);
      setNote("");
    }
  }, [open, initialStatus, product.status]);

  const leavingTerminal = terminalStatuses.includes(product.status) && status !== product.status;
  const enteringTerminal = terminalStatuses.includes(status) && status !== product.status;

  return (
    <Modal open={open} onClose={onClose} labelledBy="status-title">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="status-title">Change product status</h2>
      <p>{product.name} is currently <strong>{product.status}</strong>. Status changes are recorded in the activity trail.</p>
      <SelectField label="New status" value={status} onChange={e => setStatus(e.target.value as ProductStatus)}>
        {productStatuses.map(s => <option key={s}>{s}</option>)}
      </SelectField>
      {leavingTerminal && (
        <Alert tone="warning" title={`Reopening a ${product.status.toLowerCase()} product`}>
          This product is marked {product.status}. Confirming will reopen it — make sure the linked order or inspection record is also corrected.
        </Alert>
      )}
      {enteringTerminal && !leavingTerminal && (
        <Alert tone="warning" title={`Marking as ${status}`}>
          {status === "Sold" && "Sold products leave the sellable catalogue and stock drops to zero."}
          {status === "Damaged" && "Damaged products are excluded from quotations until repaired."}
          {status === "Dispatched" && "Dispatched products are in transit and cannot be reserved."}
        </Alert>
      )}
      <TextAreaField label="Note" placeholder="Why is the status changing? (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={status === "Damaged" ? "danger" : "primary"}
          disabled={status === product.status}
          onClick={() => onConfirm(status, note.trim())}
        >
          Confirm — {status}
        </Button>
      </div>
    </Modal>
  );
}

export function AdjustStockModal({
  open,
  onClose,
  product,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (newStock: number, reason: string) => void;
}) {
  const [delta, setDelta] = useState("1");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [reason, setReason] = useState("");
  const amount = Math.abs(parseInt(delta, 10) || 0);
  const newStock = direction === "add" ? product.stock + amount : Math.max(0, product.stock - amount);

  return (
    <Modal open={open} onClose={onClose} labelledBy="stock-title">
      <div className="modal-icon royal-icon"><Icon name="component" /></div>
      <h2 id="stock-title">Adjust stock</h2>
      <p>{product.name} currently has <strong>{product.stock}</strong> in stock. Adjustments are audited.</p>
      <div className="modal-field-row">
        <SelectField label="Adjustment" value={direction} onChange={e => setDirection(e.target.value as "add" | "remove")}>
          <option value="add">Add stock</option>
          <option value="remove">Remove stock</option>
        </SelectField>
        <TextField label="Quantity" inputMode="numeric" value={delta} onChange={e => setDelta(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="summary-row"><span>Stock after adjustment</span><strong>{newStock}</strong></div>
      <TextAreaField label="Reason" required placeholder="e.g. Returned from job work, physical count correction..." value={reason} onChange={e => setReason(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={amount === 0 || !reason.trim() || newStock === product.stock} onClick={() => onConfirm(newStock, reason.trim())}>
          Apply adjustment
        </Button>
      </div>
    </Modal>
  );
}

export function TransferModal({
  open,
  onClose,
  subject,
  currentLocation,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  currentLocation?: string;
  onConfirm: (location: string) => void;
}) {
  const { locations } = useProducts();
  const options = locations.filter(l => l !== currentLocation);
  const [location, setLocation] = useState(options[0]);
  useEffect(() => {
    if (open) setLocation(locations.filter(l => l !== currentLocation)[0]);
  }, [open, currentLocation, locations]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="transfer-title">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="transfer-title">Transfer {subject}</h2>
      <p>{currentLocation ? `Currently at ${currentLocation}. ` : ""}Transfers create a stock movement entry for the audit trail.</p>
      <SelectField label="Destination" value={location} onChange={e => setLocation(e.target.value)}>
        {options.map(l => <option key={l}>{l}</option>)}
      </SelectField>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onConfirm(location)}>Confirm transfer</Button>
      </div>
    </Modal>
  );
}

export function CertificateFormModal({
  open,
  onClose,
  product,
  mode,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  mode: "add" | "replace";
  onSave: (certificate: ProductCertificate) => void;
}) {
  const [number, setNumber] = useState("");
  const [authority, setAuthority] = useState(certAuthorities[0]);
  const [type, setType] = useState(certTypes[0]);
  const [issueDate, setIssueDate] = useState("2026-03-08");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setNumber("");
      setError(undefined);
      setNotes("");
    }
  }, [open]);

  const save = () => {
    if (!isCertificateNumber(number)) {
      setError("Certificate number is not recognised (e.g. NABL-6247119928)");
      return;
    }
    onSave({
      number: number.trim().toUpperCase(),
      authority,
      type,
      issueDate: new Date(issueDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Uploaded",
      fileName: `${number.trim().toUpperCase()}.pdf`,
      uploadedAt: "Just now",
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cert-form-title">
      <div className="modal-icon royal-icon"><Icon name="shield" /></div>
      <h2 id="cert-form-title">{mode === "add" ? "Add certificate" : "Replace certificate"}</h2>
      <p>
        {mode === "replace" && product.certificate
          ? `This replaces ${product.certificate.number} on ${product.sku}. The previous file is archived in the activity trail.`
          : `Attach a lab report to ${product.sku}. It starts as Uploaded and moves through verification.`}
      </p>
      <TextField
        label="Certificate number" required placeholder="NABL-6247119928"
        value={number}
        onChange={e => { setNumber(e.target.value); setError(undefined); }}
        error={error}
      />
      <div className="modal-field-row">
        <SelectField label="Authority" value={authority} onChange={e => setAuthority(e.target.value)}>
          {certAuthorities.map(a => <option key={a}>{a}</option>)}
        </SelectField>
        <TextField label="Issue date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
      </div>
      <SelectField label="Certificate type" value={type} onChange={e => setType(e.target.value)}>
        {certTypes.map(t => <option key={t}>{t}</option>)}
      </SelectField>
      <TextAreaField label="Notes" placeholder="Optional remarks..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save}><Icon name="upload" /> {mode === "add" ? "Upload certificate" : "Replace certificate"}</Button>
      </div>
    </Modal>
  );
}
