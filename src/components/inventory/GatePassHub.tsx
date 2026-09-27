import { useEffect, useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import Checkbox from "@/components/forms/Checkbox";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { gatePassPurposes, gatePassTone } from "@/data/inventoryData";
import { useAdmin } from "@/hooks/useAdmin";
import { useInventory } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { GatePassKind } from "@/types";

export interface GatePassPrefill {
  kind?: GatePassKind;
  item?: string;
  sku?: string;
  qty?: string;
  unit?: string;
  issuedTo?: string;
  purpose?: string;
  requestedBy?: string;
  remarks?: string;
  reference?: string;
}

export function GatePassModal({
  open,
  onClose,
  prefill,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: GatePassPrefill;
  onCreated?: (id: string) => void;
}) {
  const { addGatePass } = useInventory();
  const { products } = useProducts();
  const { logAudit } = useTeam();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [kind, setKind] = useState<GatePassKind>("Finished Goods");
  const [item, setItem] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [weight, setWeight] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [purpose, setPurpose] = useState(gatePassPurposes[0]);
  const [requestedBy, setRequestedBy] = useState(currentUser);
  const [returnable, setReturnable] = useState(true);
  const [expectedReturn, setExpectedReturn] = useState("12 Mar 2026");
  const [noBilling, setNoBilling] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setKind(prefill?.kind ?? "Finished Goods");
      setItem(prefill?.item ?? "");
      setSku(prefill?.sku ?? "");
      setQty(prefill?.qty ?? "1");
      setUnit(prefill?.unit ?? "pcs");
      setWeight("");
      setIssuedTo(prefill?.issuedTo ?? "");
      setPurpose(prefill?.purpose ?? gatePassPurposes[0]);
      setRequestedBy(prefill?.requestedBy ?? currentUser);
      setReturnable(true);
      setExpectedReturn("12 Mar 2026");
      setNoBilling(true);
      setRemarks(prefill?.remarks ?? "");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const submit = () => {
    if (!item.trim()) {
      setError("Name the item or product leaving the premises.");
      return;
    }
    if (!issuedTo.trim()) {
      setError("Record who the material is issued to — a gate pass must be traceable to a person.");
      return;
    }
    const created = addGatePass(
      {
        kind, item: item.trim(), sku: sku.trim() || undefined,
        qty: parseInt(qty || "1", 10), unit, weight: weight.trim() || undefined,
        issuedTo: issuedTo.trim(), purpose, requestedBy,
        issuedAt: "08 Mar 2026, Just now",
        returnable, expectedReturn: returnable ? expectedReturn : undefined,
        noBilling, remarks: remarks.trim() || undefined,
        reference: prefill?.reference,
      },
      `Gate pass raised by ${requestedBy} — ${purpose.toLowerCase()}`,
    );
    logAudit({
      user: requestedBy, action: "Gate pass raised", module: "Inventory",
      record: created.id, newValue: `${created.qty} ${created.unit} · ${created.item} → ${created.issuedTo}`,
    });
    toast({ tone: "success", title: `${created.id} raised`, message: "Awaiting approval before material leaves." });
    onCreated?.(created.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="gp-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="shield" /></div>
      <h2 id="gp-title">New gate pass</h2>
      <p>Material leaving the premises without a sale — sampling, job work or display. Nothing bills against a gate pass.</p>
      {error && <Alert tone="danger" title="Check the gate pass">{error}</Alert>}
      <div className="modal-field-row">
        <SelectField label="Material type" value={kind} onChange={e => setKind(e.target.value as GatePassKind)}>
          <option>Finished Goods</option>
          <option>Raw Material</option>
          <option>Packaging</option>
        </SelectField>
        <SelectField label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)}>
          {gatePassPurposes.map(p => <option key={p}>{p}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Item / product" placeholder="e.g. Maharaja Rose Beauty Soap · 100 g" value={item} onChange={e => setItem(e.target.value)} />
        <SelectField label="Link an SKU (optional)" value={sku} onChange={e => setSku(e.target.value)}>
          <option value="">Not linked to a catalogue SKU</option>
          {products.map(p => <option key={p.id} value={p.sku}>{p.sku} · {p.name}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Quantity" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ""))} />
        <SelectField label="Unit" value={unit} onChange={e => setUnit(e.target.value)}>
          <option>pcs</option>
          <option>carton</option>
          <option>kg</option>
          <option>litre</option>
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Weight (where applicable)" placeholder="e.g. 14.4 kg" value={weight} onChange={e => setWeight(e.target.value)} />
        <TextField label="Issued to" placeholder="Person, customer or vendor" value={issuedTo} onChange={e => setIssuedTo(e.target.value)} />
      </div>
      <div className="modal-field-row">
        <SelectField label="Issued on whose request" value={requestedBy} onChange={e => setRequestedBy(e.target.value)}>
          <option>Priya Nair</option>
          <option>Vikram Singh</option>
          <option>Suresh Yadav</option>
          <option>Kavita Shah</option>
        </SelectField>
        <TextField
          label="Expected return"
          value={returnable ? expectedReturn : "Not returnable"}
          disabled={!returnable}
          onChange={e => setExpectedReturn(e.target.value)}
        />
      </div>
      <Checkbox checked={returnable} onChange={setReturnable} label="Returnable movement" />
      <Checkbox checked={noBilling} onChange={setNoBilling} label="No billing / free of cost — no sales invoice is raised" />
      <TextAreaField label="Remarks" placeholder="Insurance, packing, handover notes…" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Raise gate pass</Button>
      </div>
    </Modal>
  );
}

export default function GatePassHub() {
  const { gatePasses, updateGatePass } = useInventory();
  const { logMovement } = useProducts();
  const { can, activeRole, currentUser } = useAdmin();
  const { logAudit } = useTeam();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(gatePasses[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; withRemarks?: boolean; action: (remarks?: string) => void } | null>(null);

  const pass = gatePasses.find(g => g.id === openId) ?? gatePasses[0];
  const canApprove = can("Inventory", "Approve");

  const approve = () =>
    setConfirm({
      title: `Approve ${pass.id}?`,
      message: (
        <>
          {pass.qty} {pass.unit} of {pass.item} leaves for {pass.issuedTo}.
          {pass.noBilling && " This is a no-billing movement — no sales invoice is raised."}{" "}
          The movement posts to the stock ledger as a Gate Pass entry.
        </>
      ),
      confirmLabel: "Approve gate pass",
      withRemarks: true,
      action: remarks => {
        updateGatePass(
          pass.id,
          { status: "Approved", approvedBy: currentUser, approvedAt: "08 Mar 2026, Just now", remarks: remarks || pass.remarks },
          `Approved by Arjun Sharma${remarks ? ` — “${remarks}”` : ""}`,
        );
        logMovement({
          sku: pass.sku ?? pass.id, product: pass.item, type: "Gate Pass", qty: -pass.qty,
          location: "Vapi Plant",
          note: `${pass.id} · ${pass.purpose} · issued to ${pass.issuedTo}${pass.noBilling ? " · no billing" : ""}`,
        });
        logAudit({
          user: currentUser, action: "Gate pass approved", module: "Inventory",
          record: pass.id, newValue: `${pass.qty} ${pass.unit} · ${pass.item}`,
        });
        toast({ tone: "success", title: "Gate pass approved", message: `${pass.id} posted to the stock ledger.` });
        setConfirm(null);
      },
    });

  const markReturned = () =>
    setConfirm({
      title: `Record return against ${pass.id}?`,
      message: <>{pass.qty} {pass.unit} of {pass.item} comes back into stock. The ledger records the reverse movement.</>,
      confirmLabel: "Record return",
      action: () => {
        updateGatePass(pass.id, { status: "Returned" }, "Material returned and re-weighed");
        logMovement({
          sku: pass.sku ?? pass.id, product: pass.item, type: "Gate Pass", qty: pass.qty,
          location: "Vapi Plant", note: `${pass.id} returned from ${pass.issuedTo}`,
        });
        toast({ tone: "success", title: "Return recorded", message: `${pass.id} closed.` });
        setConfirm(null);
      },
    });

  const reject = () =>
    setConfirm({
      title: `Reject ${pass.id}?`,
      danger: true,
      message: "The material stays in the warehouse. The request remains on record with the reason.",
      confirmLabel: "Reject gate pass",
      withRemarks: true,
      action: remarks => {
        updateGatePass(pass.id, { status: "Rejected" }, `Rejected by Arjun Sharma — “${remarks}”`);
        toast({ tone: "warning", title: "Gate pass rejected", message: pass.id });
        setConfirm(null);
      },
    });

  if (!pass) {
    return (
      <section className="panel">
        <div className="section-head"><div><p className="kicker">GATE PASS & SAMPLING</p><h2>No gate passes yet</h2></div></div>
        <Button onClick={() => setModalOpen(true)}><Icon name="plus" /> New gate pass</Button>
        <GatePassModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">GATE PASS & SAMPLING</p><h2>{gatePasses.length} movements on record</h2></div>
          <Button variant="secondary" onClick={() => setModalOpen(true)}><Icon name="plus" /> New gate pass</Button>
        </div>
        <div className="table-wrap op-table">
          <table>
            <thead>
              <tr><th>Gate pass</th><th>Type</th><th>Item</th><th>Qty</th><th>Issued to</th><th>Purpose</th><th>Billing</th><th>Issued</th><th>Status</th></tr>
            </thead>
            <tbody>
              {gatePasses.map(g => (
                <tr key={g.id} className={g.id === pass.id ? "sq-selected" : undefined}>
                  <td><button type="button" className="link-btn" onClick={() => setOpenId(g.id)}>{g.id}</button></td>
                  <td><Badge tone={g.kind === "Finished Goods" ? "royal" : g.kind === "Raw Material" ? "gold" : "neutral"}>{g.kind}</Badge></td>
                  <td className="note-cell">{g.item}{g.weight ? ` · ${g.weight}` : ""}</td>
                  <td>{g.qty} {g.unit}</td>
                  <td className="note-cell">{g.issuedTo}</td>
                  <td className="note-cell">{g.purpose}</td>
                  <td>{g.noBilling ? <Badge tone="amber">No billing</Badge> : <Badge tone="neutral">Billed</Badge>}</td>
                  <td className="note-cell">{g.issuedAt}</td>
                  <td><Badge tone={gatePassTone[g.status]}>{g.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">{pass.id}</p>
              <h2>{pass.item}</h2>
              <p className="muted-line">{pass.kind} · {pass.qty} {pass.unit}{pass.weight ? ` · ${pass.weight}` : ""} · {pass.purpose}</p>
            </div>
            <Badge tone={gatePassTone[pass.status]}>{pass.status}</Badge>
          </div>
          {pass.noBilling && (
            <Alert tone="info" title="No billing / free of cost">
              This movement never creates a sales invoice. It stays visible in the stock ledger and audit trail as a Gate Pass entry.
            </Alert>
          )}
          <div className="detail-list">
            <div><span>Issued to</span><strong>{pass.issuedTo}</strong></div>
            <div><span>On whose request</span><strong>{pass.requestedBy}</strong></div>
            <div><span>Issue date & time</span><strong>{pass.issuedAt}</strong></div>
            <div><span>Returnable</span><strong>{pass.returnable ? `Yes · due ${pass.expectedReturn ?? "—"}` : "No"}</strong></div>
            <div><span>Approved by</span><strong>{pass.approvedBy ? `${pass.approvedBy} · ${pass.approvedAt}` : "Pending approval"}</strong></div>
            {pass.sku && <div><span>Linked SKU</span><strong>{pass.sku}</strong></div>}
          </div>
          {pass.remarks && <p className="requirement-quote">“{pass.remarks}”</p>}
          <div className="detail-actions">
            <Button variant="secondary" onClick={() => setPrintOpen(true)}><Icon name="eye" /> Print view</Button>
            {pass.status === "Pending Approval" && canApprove && (
              <>
                <Button variant="danger" onClick={reject}>Reject</Button>
                <Button onClick={approve}><Icon name="check" /> Approve</Button>
              </>
            )}
            {pass.status === "Pending Approval" && !canApprove && (
              <Button variant="secondary" disabled>Awaiting approval — {activeRole} cannot approve</Button>
            )}
            {pass.status === "Approved" && pass.returnable && (
              <Button variant="secondary" onClick={markReturned}><Icon name="arrow" /> Record return</Button>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">MATERIAL MOVEMENT</p><h2>Gate pass timeline</h2></div></div>
          <Timeline items={pass.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      <GatePassModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <Modal open={printOpen} onClose={() => setPrintOpen(false)} labelledBy="gp-print-title" className="wide-modal">
        <h2 id="gp-print-title">Gate pass {pass.id}</h2>
        <div className="doc-print">
          <div className="doc-print-head">
            <div>
              <strong>MAHARAJA SOAP</strong>
              <small>Vapi Plant · GSTIN 08AACCM1234F1Z5</small>
            </div>
            <div className="doc-print-meta">
              <strong>GATE PASS</strong>
              <small>{pass.id} · {pass.issuedAt}</small>
            </div>
          </div>
          <div className="detail-list">
            <div><span>Material type</span><strong>{pass.kind}</strong></div>
            <div><span>Item</span><strong>{pass.item}{pass.sku ? ` (${pass.sku})` : ""}</strong></div>
            <div><span>Quantity / weight</span><strong>{pass.qty} {pass.unit}{pass.weight ? ` · ${pass.weight}` : ""}</strong></div>
            <div><span>Issued to</span><strong>{pass.issuedTo}</strong></div>
            <div><span>Purpose</span><strong>{pass.purpose}</strong></div>
            <div><span>Requested by</span><strong>{pass.requestedBy}</strong></div>
            <div><span>Approved by</span><strong>{pass.approvedBy ?? "—"}</strong></div>
            <div><span>Billing</span><strong>{pass.noBilling ? "No billing / free of cost" : "Billed separately"}</strong></div>
            <div><span>Return</span><strong>{pass.returnable ? `Expected ${pass.expectedReturn}` : "Not returnable"}</strong></div>
          </div>
          {pass.remarks && <p className="requirement-quote">“{pass.remarks}”</p>}
          <p className="muted">Security gate copy · this document does not constitute a sale or an invoice.</p>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setPrintOpen(false)}>Close</Button>
          <Button onClick={() => toast({ tone: "info", title: "Print preview", message: "A real deployment would send this to the gate printer." })}>Print</Button>
        </div>
      </Modal>

      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          withRemarks={confirm.withRemarks}
          remarksLabel="Remarks"
          onConfirm={confirm.action}
        />
      )}
    </div>
  );
}
