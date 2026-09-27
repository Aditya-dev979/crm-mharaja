import { useState } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { poTotals, purchaseTerms } from "@/data/purchaseData";
import { usePurchase } from "@/hooks/usePurchase";
import { useToast } from "@/hooks/useToast";
import type { POLine, PurchaseOrder, PurchaseRequest } from "@/types";
import { formatINR } from "@/utils";

export default function POForm({
  presetPr,
  presetSupplierId,
  onCancel,
  onSave,
}: {
  presetPr?: PurchaseRequest;
  presetSupplierId?: string;
  onCancel: () => void;
  onSave: (draft: Omit<PurchaseOrder, "id" | "created" | "grnIds" | "payments" | "timeline">) => void;
}) {
  const { suppliers } = usePurchase();
  const toast = useToast();
  const activeSuppliers = suppliers.filter(s => s.active);
  const [supplierId, setSupplierId] = useState(presetSupplierId ?? activeSuppliers[0]?.id ?? "");
  const [lines, setLines] = useState<POLine[]>(() =>
    presetPr
      ? [{ description: presetPr.items, qty: presetPr.qty, unitPrice: Math.round(presetPr.estimatedCost / Math.max(presetPr.qty, 1)) }]
      : [{ description: "", qty: 1, unitPrice: 0 }],
  );
  const [transport, setTransport] = useState("0");
  const [taxPct, setTaxPct] = useState("18");
  const [paymentTerms, setPaymentTerms] = useState(purchaseTerms[0]);
  const [deliveryDate, setDeliveryDate] = useState("2026-03-20");
  const [notes, setNotes] = useState("");

  const patchLine = (index: number, patch: Partial<POLine>) =>
    setLines(list => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const totals = poTotals({
    lines,
    transport: Number(transport.replace(/[,\s]/g, "")) || 0,
    taxPct: Number(taxPct) || 0,
  });

  const save = () => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return toast({ tone: "error", title: "Choose a supplier" });
    const clean = lines.filter(l => l.description.trim());
    if (!clean.length) return toast({ tone: "error", title: "Add at least one line item" });
    if (clean.some(l => l.qty < 1 || l.unitPrice <= 0)) {
      return toast({ tone: "error", title: "Check line values", message: "Quantities must be at least 1 and prices above zero." });
    }
    onSave({
      supplierId,
      supplierName: supplier.name,
      lines: clean,
      transport: Number(transport.replace(/[,\s]/g, "")) || 0,
      taxPct: Number(taxPct) || 0,
      paymentTerms,
      deliveryDate: new Date(deliveryDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Draft",
      prId: presetPr?.id,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">NEW PURCHASE ORDER</p>
          <h2>{presetPr ? `From request ${presetPr.id}` : "Raise a purchase order"}</h2>
        </div>
      </div>
      <div className="form-grid">
        <SelectField label="Supplier" required value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} · {s.city}</option>)}
        </SelectField>
        <SelectField label="Payment terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
          {purchaseTerms.map(t => <option key={t}>{t}</option>)}
        </SelectField>
        <TextField label="Expected delivery" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
      </div>

      <p className="mini-title">LINE ITEMS</p>
      <div className="po-lines">
        {lines.map((line, i) => (
          <div key={i} className="po-line">
            <TextField
              label={i === 0 ? "Description" : `Line ${i + 1}`}
              placeholder="e.g. Palm oil (RBD) · 5 MT"
              value={line.description}
              onChange={e => patchLine(i, { description: e.target.value })}
            />
            <label className="quote-line-field">
              <span>Qty</span>
              <input inputMode="numeric" value={line.qty} aria-label={`Quantity for line ${i + 1}`} onChange={e => patchLine(i, { qty: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
            </label>
            <label className="quote-line-field wide">
              <span>Unit price ₹</span>
              <input inputMode="numeric" value={line.unitPrice || ""} aria-label={`Unit price for line ${i + 1}`} onChange={e => patchLine(i, { unitPrice: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
            </label>
            <strong className="quote-line-total">{formatINR(line.qty * line.unitPrice)}</strong>
            <IconButton label={`Remove line ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(list => list.filter((_, idx) => idx !== i))}>
              <Icon name="close" size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={() => setLines(list => [...list, { description: "", qty: 1, unitPrice: 0 }])}>
        <Icon name="plus" /> Add line
      </Button>

      <div className="form-grid form-grid-secondary">
        <TextField label="Transport & insurance" prefix="₹" inputMode="numeric" value={transport} onChange={e => setTransport(e.target.value)} />
        <TextField label="GST %" inputMode="numeric" value={taxPct} onChange={e => setTaxPct(e.target.value.replace(/\D/g, ""))} helper="Added on top of the subtotal" />
      </div>

      <div className="quote-totals">
        <div><span>Subtotal</span><strong>{formatINR(totals.subtotal)}</strong></div>
        <div><span>Transport</span><strong>{formatINR(Number(transport.replace(/[,\s]/g, "")) || 0)}</strong></div>
        <div><span>GST ({taxPct || 0}%)</span><strong>{formatINR(totals.tax)}</strong></div>
        <div className="quote-grand"><span>PO total</span><strong>{formatINR(totals.total)}</strong></div>
      </div>

      <TextAreaField label="Notes" placeholder="Quality expectations, certificates required, delivery instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Create purchase order</Button>
      </div>
    </section>
  );
}
