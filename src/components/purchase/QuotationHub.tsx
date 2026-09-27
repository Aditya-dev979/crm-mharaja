import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { prStatusTone, purchaseTerms } from "@/data/purchaseData";
import { useAdmin } from "@/hooks/useAdmin";
import { usePurchase } from "@/hooks/usePurchase";
import { useToast } from "@/hooks/useToast";
import type { PurchaseRequest, SupplierQuotation } from "@/types";
import { formatINR } from "@/utils";

function QuotationModal({
  pr,
  open,
  onClose,
}: {
  pr: PurchaseRequest;
  open: boolean;
  onClose: () => void;
}) {
  const { suppliers, addSupplierQuotation } = usePurchase();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [terms, setTerms] = useState(purchaseTerms[0]);
  const [deliveryDays, setDeliveryDays] = useState("10");
  const [transport, setTransport] = useState("Included");
  const [creditDays, setCreditDays] = useState("0");
  const [validUntil, setValidUntil] = useState("22 Mar 2026");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setSupplierId(suppliers[0]?.id ?? "");
      setPrice("");
      setTerms(purchaseTerms[0]);
      setDeliveryDays("10");
      setTransport("Included");
      setCreditDays("0");
      setValidUntil("22 Mar 2026");
      setRemarks("");
      setAttachment(undefined);
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="sq-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="sq-title">Supplier quotation — {pr.id}</h2>
      <p>{pr.items} · qty {pr.qty}. Every collected quotation stays on record for audit.</p>
      <div className="modal-field-row">
        <SelectField label="Supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          {suppliers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        <TextField label="Quoted price" required prefix="₹" inputMode="numeric" value={price} onChange={e => { setPrice(e.target.value); setError(undefined); }} error={error} />
      </div>
      <div className="modal-field-row">
        <SelectField label="Terms" value={terms} onChange={e => setTerms(e.target.value)}>
          {purchaseTerms.map(t => <option key={t}>{t}</option>)}
        </SelectField>
        <TextField label="Delivery (days)" inputMode="numeric" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="modal-field-row">
        <TextField label="Transport" value={transport} onChange={e => setTransport(e.target.value)} />
        <TextField label="Credit period (days)" inputMode="numeric" value={creditDays} onChange={e => setCreditDays(e.target.value.replace(/\D/g, ""))} />
      </div>
      <TextField label="Valid until" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
      <TextAreaField label="Remarks" placeholder="Grade, split-delivery options, negotiation notes…" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="field">
        <span className="field-label">Attachment</span>
        {attachment ? (
          <span className="pref-chip"><Icon name="component" size={13} /> {attachment}</span>
        ) : (
          <Button variant="secondary" onClick={() => setAttachment("supplier-quote.pdf")}><Icon name="upload" /> Attach quote</Button>
        )}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const value = Number(price.replace(/[,\s]/g, ""));
            if (!value || Number.isNaN(value) || value <= 0) return setError("Enter the quoted price");
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) return;
            const created = addSupplierQuotation({
              prId: pr.id, supplierId: supplier.id, supplierName: supplier.name,
              price: value, terms, deliveryDays: parseInt(deliveryDays || "0", 10),
              transport: transport.trim() || "Included", taxPct: 18,
              creditDays: parseInt(creditDays || "0", 10), validUntil: validUntil.trim(),
              remarks: remarks.trim() || undefined, attachment,
            });
            onClose();
            toast({ tone: "success", title: `Quotation ${created.id} recorded`, message: `${supplier.name} · ${formatINR(value)}.` });
          }}
        >
          Record quotation
        </Button>
      </div>
    </Modal>
  );
}

export default function QuotationHub({
  onCreatePo,
  onOpenSupplier,
}: {
  onCreatePo: (prId: string, supplierId: string) => void;
  onOpenSupplier: (supplierId: string) => void;
}) {
  const { requests, quotations, selectSupplierQuotation, reviseSupplierQuotation } = usePurchase();
  const { can, getControl, activeRole, currentUser } = useAdmin();
  const toast = useToast();
  const eligible = requests.filter(r => r.status !== "Rejected");
  const [prId, setPrId] = useState(eligible.find(r => quotations.some(q => q.prId === r.id))?.id ?? eligible[0]?.id ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; withRemarks?: boolean; remarksRequired?: boolean; action: (remarks?: string) => void } | null>(null);

  const pr = eligible.find(r => r.id === prId);
  /* A supplier who re-quotes supersedes its own earlier quote. The comparison
     and the minimum-quotation count run on live versions only, but nothing is
     deleted — superseded quotes stay on record under the table. */
  const prQuotes = useMemo(
    () => quotations.filter(q => q.prId === prId && !q.supersededById).sort((a, b) => a.price - b.price),
    [quotations, prId],
  );
  const supersededQuotes = useMemo(
    () => quotations.filter(q => q.prId === prId && q.supersededById),
    [quotations, prId],
  );
  const minQuotes = getControl("minQuotations", 5);
  const targetCompare = getControl("targetComparisons", 2);
  const canSelect = can("Purchase", "Approve");

  if (!pr) return <EmptyState icon="building" title="No purchase requests" description="Raise a request to start collecting quotations." mini />;

  const shortlist = prQuotes.slice(0, targetCompare);
  const selected = prQuotes.find(q => q.selected);
  /* Business control: a supplier cannot be selected until the configured
     minimum number of quotations has been collected. */
  const minimumMet = prQuotes.length >= minQuotes;
  const shortfall = Math.max(0, minQuotes - prQuotes.length);

  /* Suppliers re-quote after negotiation. The revision is captured as a new
     version so the original price stays auditable. */
  const reviseQuote = (q: SupplierQuotation) => {
    setConfirm({
      title: `Record revised quote — ${q.supplierName}`,
      message: (
        <>
          <p>
            {q.supplierName} has sent a revised quotation against {q.prId}. Version {(q.version ?? 1) + 1} will
            become the live quote for comparison and version {q.version ?? 1} at {formatINR(q.price)} will be kept
            on record as superseded.
          </p>
          <p className="muted">Update the revised price and terms on the new version after it is created.</p>
        </>
      ),
      confirmLabel: "Record revision",
      withRemarks: true,
      remarksRequired: true,
      action: remarks => {
        const created = reviseSupplierQuotation(q.id, {}, remarks ?? "");
        setConfirm(null);
        toast(
          created
            ? { tone: "success", title: "Revision recorded", message: `${created.id} is now the live quote for ${q.supplierName}.` }
            : { tone: "error", title: "Revision failed", message: "The source quotation could not be found." },
        );
      },
    });
  };

  const selectQuote = (q: SupplierQuotation) => {
    if (!minimumMet) {
      toast({
        tone: "error",
        title: "Selection locked",
        message: `${prQuotes.length} of ${minQuotes} quotations collected — ${shortfall} more needed before a supplier can be selected.`,
      });
      return;
    }
    setConfirm({
      title: `Select ${q.supplierName} for ${pr.id}?`,
      message: <>{formatINR(q.price)} · {q.deliveryDays} days · {q.terms}. The reason is recorded with all {prQuotes.length} collected quotations preserved for audit.</>,
      confirmLabel: "Select supplier",
      withRemarks: true,
      remarksRequired: true,
      action: remarks => {
        selectSupplierQuotation(pr.id, q.id, remarks ?? "", currentUser);
        setConfirm(null);
        toast({ tone: "success", title: `${q.supplierName} selected`, message: `${pr.id} — raise the PO from this quotation.` });
      },
    });
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">QUOTATION COLLECTION</p><h2>{pr.id} · {pr.items}</h2></div>
          <div className="table-actions">
            <select aria-label="Purchase request" value={prId} onChange={e => setPrId(e.target.value)}>
              {eligible.map(r => <option key={r.id} value={r.id}>{r.id} · {r.items}</option>)}
            </select>
            <Button variant="secondary" onClick={() => setAddOpen(true)}><Icon name="plus" /> Add quotation</Button>
          </div>
        </div>
        <div className="stat-chips">
          <div className="stat-chip">
            <span>Collected</span>
            <strong className={minimumMet ? "up-text" : "warning-text"}>{prQuotes.length} of {minQuotes} required</strong>
            <small>{minimumMet ? "Minimum met — selection open" : "Selection locked"}</small>
          </div>
          <div className="stat-chip"><span>Comparison target</span><strong>Top {targetCompare}</strong></div>
          <div className="stat-chip"><span>Estimated budget</span><strong>{formatINR(pr.estimatedCost)}</strong></div>
          <div className="stat-chip"><span>Status</span><strong><Badge tone={prStatusTone[pr.status]}>{pr.status}</Badge></strong></div>
        </div>
        {!minimumMet && (
          <Alert tone="warning" title={`Selection locked — ${shortfall} more quotation${shortfall > 1 ? "s" : ""} to collect`}>
            {prQuotes.length} of {minQuotes} quotations collected. The business rule requires a minimum of {minQuotes}
            {" "}supplier quotations before a supplier can be selected, comparing the best {targetCompare}.
          </Alert>
        )}
        {selected && (
          <Alert tone="success" title={`${selected.supplierName} selected by ${selected.selectedBy}`}>
            “{selected.selectionRemarks}” — all collected quotations remain on record.
          </Alert>
        )}
        {prQuotes.length === 0 ? (
          <EmptyState icon="building" title="No quotations yet" description="Record the first supplier quotation for this request." mini />
        ) : (
          <div className="table-wrap sq-compare">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th><th>Price</th><th>Delivery</th><th>Terms</th><th>Transport</th><th>Credit</th><th>Validity</th><th></th>
                </tr>
              </thead>
              <tbody>
                {prQuotes.map((q, i) => (
                  <tr key={q.id} className={q.selected ? "sq-selected" : shortlist.includes(q) ? "sq-shortlist" : undefined}>
                    <td>
                      <button type="button" className="link-btn" onClick={() => onOpenSupplier(q.supplierId)}>{q.supplierName}</button>
                      <div className="note-cell">
                        {q.id}
                        {(q.version ?? 1) > 1 && <> · <strong>v{q.version}</strong></>}
                        {q.remarks ? ` · ${q.remarks}` : ""}
                      </div>
                    </td>
                    <td><strong>{formatINR(q.price)}</strong>{i === 0 && <div className="note-cell up-text">Lowest</div>}</td>
                    <td>{q.deliveryDays} days</td>
                    <td>{q.terms}</td>
                    <td>{q.transport}</td>
                    <td>{q.creditDays ? `${q.creditDays} days` : "—"}</td>
                    <td>{q.validUntil}</td>
                    <td>
                      {q.selected ? (
                        <Badge tone="emerald">Selected</Badge>
                      ) : selected ? (
                        <span className="muted">—</span>
                      ) : shortlist.includes(q) && canSelect ? (
                        <Button
                          variant="secondary"
                          disabled={!minimumMet}
                          title={minimumMet ? undefined : `Collect ${shortfall} more quotation${shortfall > 1 ? "s" : ""} to unlock selection`}
                          onClick={() => selectQuote(q)}
                        >
                          Select
                        </Button>
                      ) : shortlist.includes(q) ? (
                        <Badge tone="royal">Shortlist</Badge>
                      ) : (
                        <span className="muted">On record</span>
                      )}
                      {!selected && canSelect && (
                        <button type="button" className="link-btn sq-revise" onClick={() => reviseQuote(q)}>
                          Revised quote
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {supersededQuotes.length > 0 && (
          <div className="superseded-quotes">
            <h4>Superseded quotations preserved</h4>
            <ul>
              {supersededQuotes
                .slice()
                .sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
                .map(q => (
                  <li key={q.id}>
                    <span>
                      <strong>{q.supplierName}</strong> · {q.id} · v{q.version ?? 1}
                    </span>
                    <span>{formatINR(q.price)} · {q.deliveryDays} days</span>
                    <span className="muted">Replaced by {q.supersededById}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {canSelect && !minimumMet && prQuotes.length > 0 && !selected && (
          <p className="muted"><Icon name="lock" size={13} /> Selection unlocks at {minQuotes} quotations — {shortfall} still to collect. The threshold is set in Settings › Business Controls.</p>
        )}
        {!canSelect && prQuotes.length > 0 && !selected && (
          <p className="muted"><Icon name="lock" size={13} /> Supplier selection needs Purchase approval rights — {activeRole} can only collect quotations.</p>
        )}
        {selected && pr.status === "Approved" && (
          <div className="form-actions">
            <Button onClick={() => onCreatePo(pr.id, selected.supplierId)}><Icon name="building" /> Create PO from {selected.id}</Button>
          </div>
        )}
      </section>

      <QuotationModal pr={pr} open={addOpen} onClose={() => setAddOpen(false)} />
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          withRemarks={confirm.withRemarks}
          remarksRequired={confirm.remarksRequired}
          onConfirm={confirm.action}
        />
      )}
    </div>
  );
}
