import { useEffect, useState } from "react";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Radio from "@/components/forms/Radio";
import { cmCapabilities, materialCategories, materialLocations, materialUnits, plants } from "@/data/productionData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProduction } from "@/hooks/useProduction";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { Bom, MaterialItem, MaterialKind, ProductionOrder } from "@/types";

/* ---------- Daily production entry ---------- */

export function DailyEntryModal({
  order,
  open,
  onClose,
}: {
  order: ProductionOrder;
  open: boolean;
  onClose: () => void;
}) {
  const { addDailyEntry } = useProduction();
  const toast = useToast();
  const [produced, setProduced] = useState("1");
  const [rejected, setRejected] = useState("0");
  const [materialNote, setMaterialNote] = useState("");
  const [responsible, setResponsible] = useState(order.responsible);
  const [date, setDate] = useState("08 Mar 2026");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setProduced("1");
      setRejected("0");
      setMaterialNote("");
      setResponsible(order.responsible);
      setDate("08 Mar 2026");
      setRemarks("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const balance = order.plannedQty - order.producedQty;
  const producedNum = parseInt(produced || "0", 10);
  const rejectedNum = parseInt(rejected || "0", 10);

  const submit = () => {
    if (producedNum <= 0 && rejectedNum <= 0) {
      setError("Record at least one produced or rejected unit.");
      return;
    }
    if (producedNum > balance) {
      setError(`Only ${balance} unit${balance === 1 ? "" : "s"} remain against the planned quantity. Adjust the plan first if the order has grown.`);
      return;
    }
    if (!materialNote.trim()) {
      setError("Record what material was consumed — it feeds the planned-versus-actual variance.");
      return;
    }
    const entry = addDailyEntry(order.id, {
      date, produced: producedNum, rejected: rejectedNum,
      materialNote: materialNote.trim(), responsible,
      remarks: remarks.trim() || undefined,
    });
    toast({ tone: "success", title: `${entry.id} recorded`, message: `${producedNum} produced${rejectedNum ? `, ${rejectedNum} rejected` : ""} on ${order.id}.` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="dpr-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="dpr-title">Daily production entry — {order.id}</h2>
      <p>{order.product} · planned {order.plannedQty} · produced {order.producedQty} · balance {balance}.</p>
      {error && <Alert tone="danger" title="Check the entry">{error}</Alert>}
      <div className="modal-field-row">
        <TextField label="Production date" value={date} onChange={e => setDate(e.target.value)} />
        <SelectField label="Responsible person" value={responsible} onChange={e => setResponsible(e.target.value)}>
          <option>Vikram Singh</option>
          <option>Shalini Rao</option>
          <option>Meenal Joshi</option>
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Produced quantity" inputMode="numeric" value={produced} onChange={e => setProduced(e.target.value.replace(/\D/g, ""))} />
        <TextField label="Rejected / damaged" inputMode="numeric" value={rejected} onChange={e => setRejected(e.target.value.replace(/\D/g, ""))} />
      </div>
      <TextField label="Material consumed" placeholder="e.g. 480 kg palm kernel oil, 12 kg rose fragrance" value={materialNote} onChange={e => setMaterialNote(e.target.value)} />
      <TextAreaField label="Remarks" placeholder="Anything the plant needs on record…" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="detail-list">
        <div><span>Balance after this entry</span><strong>{Math.max(0, balance - producedNum)} of {order.plannedQty}</strong></div>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Record entry</Button>
      </div>
    </Modal>
  );
}

/* ---------- Plant Manager plan adjustment (business rule: up to 125%) ---------- */

export function PlanAdjustModal({
  order,
  open,
  onClose,
}: {
  order: ProductionOrder;
  open: boolean;
  onClose: () => void;
}) {
  const { adjustPlan } = useProduction();
  const { getControl, activeRole, currentUser } = useAdmin();
  const toast = useToast();
  const cap = getControl("plantAdjustment", 125);
  const [qty, setQty] = useState(String(order.plannedQty));
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setQty(String(order.plannedQty));
      setRemarks("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const original = order.plannedQty;
  const maxQty = Math.floor((original * cap) / 100);
  const next = parseInt(qty || "0", 10);
  const pct = original > 0 ? Math.round((next / original) * 100) : 0;

  const submit = () => {
    if (next <= 0) {
      setError("Enter the revised planned quantity.");
      return;
    }
    if (next > maxQty) {
      setError(`The plant adjustment limit is ${cap}% — at most ${maxQty} unit${maxQty === 1 ? "" : "s"} against the original ${original}. Anything beyond that needs a fresh production order.`);
      return;
    }
    if (!remarks.trim()) {
      setError("Adjustment remarks are mandatory — they go on the production timeline and the audit trail.");
      return;
    }
    adjustPlan(order.id, next, currentUser, remarks.trim());
    toast({ tone: "success", title: "Plan adjusted", message: `${order.id} planned quantity is now ${next} (${pct}% of the original).` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="adj-title">
      <div className="modal-icon royal-icon"><Icon name="shield" /></div>
      <h2 id="adj-title">Adjust plan — {order.id}</h2>
      <p>{order.product} · original planned quantity {original}. The Plant Manager may adjust up to {cap}% ({maxQty} units).</p>
      {error && <Alert tone="danger" title="Adjustment not allowed">{error}</Alert>}
      <TextField label="Revised planned quantity" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ""))} />
      <div className="detail-list">
        <div><span>Adjustment</span><strong className={pct > cap ? "warning-text" : undefined}>{pct}% of the original plan</strong></div>
        <div><span>Ceiling</span><strong>{cap}% · {maxQty} units</strong></div>
      </div>
      <TextAreaField label="Adjustment remarks *" placeholder="Why is the plan changing?" value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Record adjustment</Button>
      </div>
    </Modal>
  );
}

/* ---------- New production order ---------- */

export function ProductionOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { boms, addProductionOrder } = useProduction();
  const { orders: salesOrders } = useSales();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [orderId, setOrderId] = useState("");
  const [qty, setQty] = useState("1");
  const [plant, setPlant] = useState(plants[0]);
  const [responsible, setResponsible] = useState(currentUser);
  const [start, setStart] = useState("09 Mar 2026");
  const [complete, setComplete] = useState("20 Mar 2026");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setBomId(boms[0]?.id ?? "");
      setOrderId("");
      setQty("1");
      setPlant(plants[0]);
      setResponsible(currentUser);
      setStart("09 Mar 2026");
      setComplete("20 Mar 2026");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bom = boms.find(b => b.id === bomId);
  const qtyNum = parseInt(qty || "0", 10);

  const submit = () => {
    if (!bom) {
      setError("Select a formulation — the material requirement comes from the BOM.");
      return;
    }
    if (qtyNum <= 0) {
      setError("Planned quantity must be at least 1.");
      return;
    }
    const created = addProductionOrder(
      {
        product: bom.product, sku: bom.sku, orderId: orderId || undefined, bomId: bom.id,
        plannedQty: qtyNum, plannedStart: start, plannedComplete: complete,
        plant, responsible,
        consumption: bom.lines.map(l => ({
          materialId: l.materialId, materialName: l.materialName, unit: l.unit,
          planned: l.qtyPerUnit * qtyNum, actual: 0,
        })),
      },
      orderId ? `Production order created from ${orderId}` : "Production order created",
    );
    toast({ tone: "success", title: `${created.id} planned`, message: `${qtyNum} × ${bom.product} at ${plant}.` });
    onCreated(created.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="prd-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="prd-title">New production order</h2>
      <p>Material requirement is calculated from the selected formulation, so planned consumption is never guessed.</p>
      {error && <Alert tone="danger" title="Check the plan">{error}</Alert>}
      <div className="modal-field-row">
        <SelectField label="Formulation / BOM" value={bomId} onChange={e => setBomId(e.target.value)}>
          {boms.map(b => <option key={b.id} value={b.id}>{b.id} · {b.product}</option>)}
        </SelectField>
        <SelectField label="Against sales order" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">Stock build (no order)</option>
          {salesOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.customerName}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Planned quantity" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ""))} />
        <SelectField label="Plant / responsibility" value={plant} onChange={e => setPlant(e.target.value)}>
          {plants.map(p => <option key={p}>{p}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Planned start" value={start} onChange={e => setStart(e.target.value)} />
        <TextField label="Planned completion" value={complete} onChange={e => setComplete(e.target.value)} />
      </div>
      <SelectField label="Responsible person" value={responsible} onChange={e => setResponsible(e.target.value)}>
        <option>Vikram Singh</option>
        <option>Shalini Rao</option>
        <option>Meenal Joshi</option>
      </SelectField>
      {bom && (
        <>
          <p className="kicker" style={{ marginTop: 12 }}>MATERIAL REQUIREMENT · {qtyNum || 0} UNIT{qtyNum === 1 ? "" : "S"}</p>
          <div className="detail-list">
            {bom.lines.map(l => (
              <div key={l.materialId}>
                <span>{l.materialName}</span>
                <strong>{l.qtyPerUnit * (qtyNum || 0)} {l.unit}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create production order</Button>
      </div>
    </Modal>
  );
}

/* ---------- BOM / formulation ---------- */

export function BomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { materials, addBom } = useProduction();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [product, setProduct] = useState("");
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<{ materialId: string; qty: string }[]>([{ materialId: materials[0]?.id ?? "", qty: "1" }]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setProduct("");
      setSku("");
      setNotes("");
      setLines([{ materialId: materials[0]?.id ?? "", qty: "1" }]);
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (!product.trim()) {
      setError("Name the finished product this formulation builds.");
      return;
    }
    const valid = lines
      .map(l => ({ material: materials.find(m => m.id === l.materialId), qty: parseFloat(l.qty || "0") }))
      .filter(l => l.material && l.qty > 0);
    if (valid.length === 0) {
      setError("Add at least one material line with a quantity.");
      return;
    }
    const created = addBom({
      product: product.trim(), sku: sku.trim() || undefined, createdBy: currentUser,
      notes: notes.trim() || undefined,
      lines: valid.map(l => ({
        materialId: l.material!.id, materialName: l.material!.name,
        qtyPerUnit: l.qty, unit: l.material!.unit,
      })),
    });
    toast({ tone: "success", title: `${created.id} created`, message: `${valid.length} material line${valid.length === 1 ? "" : "s"} for ${created.product}.` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="bom-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="gem" /></div>
      <h2 id="bom-title">New formulation / BOM</h2>
      <p>Define oils, actives, fragrance and packaging per finished unit. Production orders inherit this as the planned consumption.</p>
      {error && <Alert tone="danger" title="Check the formulation">{error}</Alert>}
      <div className="modal-field-row">
        <TextField label="Finished product" placeholder="e.g. Herbal Neem Soap 100 g" value={product} onChange={e => setProduct(e.target.value)} />
        <TextField label="SKU (optional)" placeholder="MS-JW-…" value={sku} onChange={e => setSku(e.target.value)} />
      </div>
      {lines.map((line, i) => (
        <div className="modal-field-row" key={i}>
          <SelectField
            label={`Material · line ${i + 1}`}
            value={line.materialId}
            onChange={e => setLines(list => list.map((l, j) => (j === i ? { ...l, materialId: e.target.value } : l)))}
          >
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </SelectField>
          <TextField
            label="Quantity per unit"
            inputMode="decimal"
            value={line.qty}
            onChange={e => setLines(list => list.map((l, j) => (j === i ? { ...l, qty: e.target.value.replace(/[^\d.]/g, "") } : l)))}
          />
        </div>
      ))}
      <div className="note-actions">
        <Button variant="secondary" onClick={() => setLines(list => [...list, { materialId: materials[0]?.id ?? "", qty: "1" }])}>
          <Icon name="plus" /> Add material line
        </Button>
      </div>
      <TextAreaField label="Notes" placeholder="Process notes, tolerances, wastage allowance…" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Save formulation</Button>
      </div>
    </Modal>
  );
}

/* ---------- Formulation revision ---------- */

/* A formulation changes when the plant changes the recipe — a different oil blend,
   a new fragrance dose, a revised packaging spec. The old version is never edited
   in place, because production orders already released against it must keep
   showing what was actually used. */
export function ReviseBomModal({ bom, onClose }: { bom: Bom | null; onClose: () => void }) {
  const { materials, reviseBom, orders } = useProduction();
  const { currentUser } = useAdmin();
  const { logAudit } = useTeam();
  const toast = useToast();
  const [lines, setLines] = useState<{ materialId: string; qty: string }[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (bom) {
      setLines(bom.lines.map(l => ({ materialId: l.materialId, qty: String(l.qtyPerUnit) })));
      setReason("");
      setError(undefined);
    }
  }, [bom]);

  if (!bom) return null;

  const usedBy = orders.filter(o => o.bomId === bom.id);
  const nextVersion = (bom.version ?? 1) + 1;

  const submit = () => {
    if (!reason.trim()) {
      setError("State why the formulation is changing — it becomes part of the version record.");
      return;
    }
    const valid = lines
      .map(l => ({ material: materials.find(m => m.id === l.materialId), qty: parseFloat(l.qty || "0") }))
      .filter(l => l.material && l.qty > 0);
    if (valid.length === 0) {
      setError("Keep at least one material line with a quantity.");
      return;
    }
    const created = reviseBom(
      bom.id,
      valid.map(l => ({
        materialId: l.material!.id,
        materialName: l.material!.name,
        qtyPerUnit: l.qty,
        unit: l.material!.unit,
      })),
      reason.trim(),
      currentUser,
    );
    logAudit({
      user: currentUser,
      action: "Formulation revised",
      module: "Production",
      record: `${bom.id} · ${bom.product}`,
      oldValue: `v${bom.version} · ${bom.lines.length} lines`,
      newValue: `v${nextVersion} · ${valid.length} lines — ${reason.trim()}`,
    });
    onClose();
    toast(
      created
        ? { tone: "success", title: `${created.id} is now live`, message: `${bom.product} · version ${created.version}. Version ${bom.version} stays on record.` }
        : { tone: "error", title: "Revision failed", message: "The source formulation could not be found." },
    );
  };

  return (
    <Modal open onClose={onClose} labelledBy="bomrev-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="edit" /></div>
      <h2 id="bomrev-title">Revise formulation — {bom.product}</h2>
      <p>
        {bom.id} · version {bom.version} becomes version {nextVersion}. Production orders already released against
        version {bom.version}{usedBy.length ? ` (${usedBy.length})` : ""} keep that version, so completed batches stay
        traceable to the recipe actually used.
      </p>
      {error && <Alert tone="danger" title="Check the revision">{error}</Alert>}
      {lines.map((line, i) => {
        const before = bom.lines[i];
        const changed = !before || before.materialId !== line.materialId || String(before.qtyPerUnit) !== line.qty;
        return (
          <div className="modal-field-row" key={i}>
            <SelectField
              label={`Material · line ${i + 1}${changed ? " · changed" : ""}`}
              value={line.materialId}
              onChange={e => setLines(list => list.map((l, j) => (j === i ? { ...l, materialId: e.target.value } : l)))}
            >
              {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </SelectField>
            <TextField
              label={before ? `Per unit (was ${before.qtyPerUnit} ${before.unit})` : "Quantity per unit"}
              inputMode="decimal"
              value={line.qty}
              onChange={e => setLines(list => list.map((l, j) => (j === i ? { ...l, qty: e.target.value.replace(/[^\d.]/g, "") } : l)))}
            />
          </div>
        );
      })}
      <div className="note-actions">
        <Button variant="secondary" onClick={() => setLines(list => [...list, { materialId: materials[0]?.id ?? "", qty: "1" }])}>
          <Icon name="plus" /> Add material line
        </Button>
        {lines.length > 1 && (
          <Button variant="ghost" onClick={() => setLines(list => list.slice(0, -1))}>
            Remove last line
          </Button>
        )}
      </div>
      <TextAreaField
        label="Reason for the revision" required
        placeholder="e.g. Palm oil share reduced to 22% after the March cost review"
        value={reason}
        onChange={e => { setReason(e.target.value); setError(undefined); }}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Save version {nextVersion}</Button>
      </div>
    </Modal>
  );
}

/* ---------- Contract manufacturing assignment ---------- */

export function AssignmentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { manufacturers, addAssignment } = useProduction();
  const { orders: salesOrders } = useSales();
  const toast = useToast();
  const active = manufacturers.filter(m => m.active);
  const [manufacturerId, setManufacturerId] = useState(active[0]?.id ?? "");
  const [orderId, setOrderId] = useState(salesOrders[0]?.id ?? "");
  const [piId, setPiId] = useState("PI-2601");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [sent, setSent] = useState("08 Mar 2026");
  const [expected, setExpected] = useState("28 Mar 2026");
  const [specs, setSpecs] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setManufacturerId(active[0]?.id ?? "");
      setOrderId(salesOrders[0]?.id ?? "");
      setPiId("PI-2601");
      setProduct("");
      setQty("1");
      setSent("08 Mar 2026");
      setExpected("28 Mar 2026");
      setSpecs("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const manufacturer = manufacturers.find(m => m.id === manufacturerId);
    if (!manufacturer) {
      setError("Select an active contract manufacturer.");
      return;
    }
    if (!product.trim()) {
      setError("Name the product being assigned.");
      return;
    }
    const specLines = specs.split("\n").map(s => s.trim()).filter(Boolean);
    if (specLines.length === 0) {
      setError("Specifications are mandatory — the manufacturer works to the approved PI.");
      return;
    }
    const created = addAssignment(
      {
        manufacturerId: manufacturer.id, manufacturerName: manufacturer.name,
        orderId: orderId || undefined, piId: piId || undefined,
        product: product.trim(), qty: parseInt(qty || "1", 10),
        specifications: specLines, sentDate: sent, expectedCompletion: expected,
        attachments: piId ? [`${piId}-approved.pdf`] : [],
      },
      `Approved ${piId || "specifications"} sent to ${manufacturer.name}`,
    );
    toast({ tone: "success", title: `${created.id} sent`, message: `${manufacturer.name} · ${created.qty} × ${created.product}.` });
    onCreated(created.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cma-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="cma-title">Assign to contract manufacturer</h2>
      <p>The approved PI and specifications go out with the assignment. Their inventory stays theirs — we track status and ready quantity only.</p>
      {error && <Alert tone="danger" title="Check the assignment">{error}</Alert>}
      <div className="modal-field-row">
        <SelectField label="Contract manufacturer" value={manufacturerId} onChange={e => setManufacturerId(e.target.value)}>
          {active.map(m => <option key={m.id} value={m.id}>{m.name} · {m.city}</option>)}
        </SelectField>
        <SelectField label="Against sales order" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">No linked order</option>
          {salesOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.customerName}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label="Approved PI" placeholder="PI-2601" value={piId} onChange={e => setPiId(e.target.value)} />
        <TextField label="Quantity" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ""))} />
      </div>
      <TextField label="Product" placeholder="e.g. Private-label guest soap · 15 g" value={product} onChange={e => setProduct(e.target.value)} />
      <div className="modal-field-row">
        <TextField label="Sent date" value={sent} onChange={e => setSent(e.target.value)} />
        <TextField label="Expected completion" value={expected} onChange={e => setExpected(e.target.value)} />
      </div>
      <TextAreaField
        label="Specifications * (one per line)"
        placeholder={"Soap base supplied by Maharaja Soap — 144 bars per carton\nWrapper artwork as per the approved proof\nBatch code printed before return"}
        value={specs}
        onChange={e => setSpecs(e.target.value)}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Send assignment</Button>
      </div>
    </Modal>
  );
}

/* ---------- Material store: new line ---------- */

export function MaterialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMaterial } = useProduction();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MaterialKind>("Raw Material");
  const [category, setCategory] = useState(materialCategories["Raw Material"][0]);
  const [unit, setUnit] = useState(materialUnits[0]);
  const [available, setAvailable] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [rate, setRate] = useState("");
  const [location, setLocation] = useState(materialLocations[0]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setCode(""); setName(""); setKind("Raw Material");
    setCategory(materialCategories["Raw Material"][0]);
    setUnit(materialUnits[0]); setAvailable("0"); setReorderLevel("0"); setRate("");
    setLocation(materialLocations[0]); setError(undefined);
  }, [open]);

  const pickKind = (next: MaterialKind) => {
    setKind(next);
    setCategory(materialCategories[next][0]);
  };

  const submit = () => {
    if (!code.trim()) return setError("Give the material a store code");
    if (!name.trim()) return setError("Name the material");
    const rateValue = Number(rate.replace(/[,\s]/g, ""));
    if (!rateValue || Number.isNaN(rateValue)) return setError("Enter the standard rate");
    const created = addMaterial({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      kind,
      category,
      unit,
      available: Number(available.replace(/\D/g, "")) || 0,
      reorderLevel: Number(reorderLevel.replace(/\D/g, "")) || 0,
      rate: rateValue,
      location,
    });
    toast({
      tone: "success",
      title: "Material line created",
      message: `${created.code} · ${created.name} added to the ${kind.toLowerCase()} store.`,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="mat-title">
      <div className="modal-icon royal-icon"><Icon name="droplet" /></div>
      <h2 id="mat-title">New material line</h2>
      <p>Raw material and packaging lines feed formulation, issue and variance.</p>
      <div className="modal-field-row">
        <TextField label="Store code" required placeholder="e.g. RM-GLYC" value={code} onChange={e => { setCode(e.target.value); setError(undefined); }} />
        <SelectField label="Kind" value={kind} onChange={e => pickKind(e.target.value as MaterialKind)}>
          {(["Raw Material", "Packaging"] as MaterialKind[]).map(k => <option key={k}>{k}</option>)}
        </SelectField>
      </div>
      <TextField label="Material" required placeholder="e.g. Glycerine (pharma grade)" value={name} onChange={e => { setName(e.target.value); setError(undefined); }} />
      <div className="modal-field-row">
        <SelectField label="Category" value={category} onChange={e => setCategory(e.target.value)}>
          {materialCategories[kind].map(c => <option key={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Unit" value={unit} onChange={e => setUnit(e.target.value)}>
          {materialUnits.map(u => <option key={u}>{u}</option>)}
        </SelectField>
      </div>
      <div className="modal-field-row">
        <TextField label={`Opening stock (${unit})`} inputMode="numeric" value={available} onChange={e => setAvailable(e.target.value.replace(/\D/g, ""))} />
        <TextField label={`Reorder level (${unit})`} inputMode="numeric" value={reorderLevel} onChange={e => setReorderLevel(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="modal-field-row">
        <TextField label={`Standard rate (per ${unit})`} required prefix="₹" inputMode="numeric" value={rate} onChange={e => { setRate(e.target.value); setError(undefined); }} error={error} />
        <SelectField label="Store location" value={location} onChange={e => setLocation(e.target.value)}>
          {materialLocations.map(l => <option key={l}>{l}</option>)}
        </SelectField>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create material line</Button>
      </div>
    </Modal>
  );
}

/* ---------- Material store: receipt, issue or adjustment ---------- */

export function MaterialMovementModal({
  open,
  onClose,
  material,
}: {
  open: boolean;
  onClose: () => void;
  material: MaterialItem | null;
}) {
  const { logMaterialMovement } = useProduction();
  const { logAudit, addNotification } = useTeam();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [direction, setDirection] = useState<"Receipt" | "Issue" | "Adjustment">("Receipt");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setDirection("Receipt"); setQty(""); setNote(""); setError(undefined);
  }, [open, material]);

  if (!material) return null;

  const submit = () => {
    const value = Number(qty.replace(/[,\s]/g, ""));
    if (!value || Number.isNaN(value) || value <= 0) return setError("Enter a quantity above zero");
    if (direction !== "Receipt" && value > material.available)
      return setError(`Only ${material.available} ${material.unit} available in the store`);
    if (!note.trim()) return setError("Say what this movement is for — it goes on the store history");
    const signed = direction === "Receipt" ? value : -value;
    logMaterialMovement(material.id, `${direction} · ${note.trim()}`, signed);
    /* Crossing the reorder level is the moment the buyer needs to know. */
    const after = Math.max(0, material.available + signed);
    if (signed < 0 && after <= material.reorderLevel && material.available > material.reorderLevel) {
      addNotification({
        type: "Low stock", priority: after === 0 ? "High" : "Normal",
        title: `${material.name} at reorder level`,
        message: `${after} ${material.unit} left against a reorder level of ${material.reorderLevel} ${material.unit} — raise a purchase request.`,
        reference: material.code,
        recordRef: { kind: "material", id: material.code },
      });
    }
    logAudit({
      user: currentUser,
      action: `Material ${direction.toLowerCase()} recorded`,
      module: "Production",
      record: material.code,
      newValue: `${signed > 0 ? "+" : ""}${signed} ${material.unit} · ${note.trim()}`,
    });
    toast({
      tone: "success",
      title: `${direction} recorded`,
      message: `${material.name} · ${signed > 0 ? "+" : ""}${signed} ${material.unit}. Store balance updated.`,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="matmv-title">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="matmv-title">{material.name}</h2>
      <p>{material.code} · {material.location}</p>
      <div className="summary-row"><span>Available now</span><strong>{material.available} {material.unit}</strong></div>
      <div className="field">
        <span className="field-label">Movement</span>
        <div className="radio-row">
          {(["Receipt", "Issue", "Adjustment"] as const).map(d => (
            <Radio key={d} name="mat-direction" label={d} checked={direction === d} onChange={() => { setDirection(d); setError(undefined); }} />
          ))}
        </div>
      </div>
      <TextField
        label={`Quantity (${material.unit})`} required inputMode="numeric"
        value={qty} onChange={e => { setQty(e.target.value.replace(/\D/g, "")); setError(undefined); }}
      />
      <TextAreaField
        label="Reference or reason" required
        placeholder={direction === "Receipt" ? "e.g. Posted from GRN-260082" : direction === "Issue" ? "e.g. Issued to PRD-2604" : "e.g. Cycle count correction — 4 kg spillage"}
        value={note} onChange={e => { setNote(e.target.value); setError(undefined); }} error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Record {direction.toLowerCase()}</Button>
      </div>
    </Modal>
  );
}

/* ---------- Contract manufacturer onboarding ---------- */

export function ManufacturerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addManufacturer } = useProduction();
  const { logAudit } = useTeam();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [speciality, setSpeciality] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setName(""); setContact(""); setPhone(""); setEmail(""); setCity("");
    setSpeciality([]); setNotes(""); setError(undefined);
  }, [open]);

  const toggle = (s: string) =>
    setSpeciality(list => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]));

  const submit = () => {
    if (!name.trim()) return setError("Name the manufacturing partner");
    if (!contact.trim()) return setError("Give a contact person");
    if (phone.length !== 10) return setError("Enter a 10-digit phone number");
    if (!city.trim()) return setError("Which city is the unit in?");
    if (speciality.length === 0) return setError("Pick at least one capability");
    const created = addManufacturer({
      name: name.trim(), contact: contact.trim(), phone, email: email.trim(),
      city: city.trim(), speciality, notes: notes.trim() || undefined,
    });
    logAudit({
      user: currentUser, action: "Contract manufacturer onboarded", module: "Production",
      record: created.id, newValue: `${created.name} · ${created.city} · ${speciality.join(", ")}`,
    });
    toast({
      tone: "success",
      title: "Manufacturer added",
      message: `${created.name} is active and available for new assignments.`,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cmnew-title">
      <div className="modal-icon royal-icon"><Icon name="building" /></div>
      <h2 id="cmnew-title">Add a contract manufacturer</h2>
      <p>Their stock stays theirs — we track the assignment, status and ready quantity only.</p>
      <div className="modal-field-row">
        <TextField label="Unit name" required placeholder="e.g. Rajkot Soap Works" value={name} onChange={e => { setName(e.target.value); setError(undefined); }} />
        <TextField label="City" required placeholder="e.g. Rajkot" value={city} onChange={e => { setCity(e.target.value); setError(undefined); }} />
      </div>
      <div className="modal-field-row">
        <TextField label="Contact person" required value={contact} onChange={e => { setContact(e.target.value); setError(undefined); }} />
        <TextField label="Phone" required prefix="+91" inputMode="numeric" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(undefined); }} />
      </div>
      <TextField label="Email" type="email" placeholder="orders@partner.in" value={email} onChange={e => setEmail(e.target.value)} />
      <div className="field">
        <span className="field-label">Capabilities *</span>
        <div className="chip-row">
          {cmCapabilities.map(c => (
            <button
              key={c}
              type="button"
              className={speciality.includes(c) ? "pref-chip active-chip" : "pref-chip"}
              onClick={() => { toggle(c); setError(undefined); }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <TextAreaField label="Notes" placeholder="Capacity, lead time, quality history…" value={notes} onChange={e => setNotes(e.target.value)} error={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Add manufacturer</Button>
      </div>
    </Modal>
  );
}
