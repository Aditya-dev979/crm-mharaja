import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import { AmountMethodModal, EstimateModal } from "@/components/workshop/WorkshopModals";
import { SelectField, TextAreaField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { inspectionStatusTone } from "@/data/qualityData";
import { customerVisibleStatus, repairStages, repairStageTone, workers } from "@/data/workshopData";
import { useQuality } from "@/hooks/useQuality";
import { useToast } from "@/hooks/useToast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { RepairJob } from "@/types";
import { formatINR } from "@/utils";

export default function RepairDetail({
  repair,
  onBack,
  onOpenCustomer,
  onOpenProduct,
  onOpenInspection,
}: {
  repair: RepairJob;
  onBack: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenInspection: (inspectionId: string) => void;
}) {
  const { updateRepair, addRepairPhoto, addRepairNote, addRepairPayment } = useWorkshop();
  const { inspections, addInspection } = useQuality();
  const toast = useToast();
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [worker, setWorker] = useState(repair.worker ?? workers[0]);
  const [noteText, setNoteText] = useState("");
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const inspection = repair.inspectionId ? inspections.find(i => i.id === repair.inspectionId) : undefined;
  const stageIndex = repair.stage === "Declined" ? 3 : repairStages.indexOf(repair.stage);
  const paid = repair.payments.reduce((s, p) => s + p.amount, 0);

  const startInspection = () => {
    const created = addInspection(
      {
        productId: repair.productId,
        sku: repair.id,
        product: repair.product,
        tone: repair.tone,
        source: "Repair QC",
        reference: repair.id,
        date: "Just now",
        status: "Pending",
        condition: undefined,
        remarks: repair.issue,
        photos: repair.photosBefore.map((p, i) => ({ ...p, id: `qi-${repair.id}-${i}` })),
      },
      `Queued from repair ${repair.id}`,
    );
    updateRepair(repair.id, { stage: "Inspection", inspectionId: created.id }, `Assessment started — ${created.id}`);
    toast({ tone: "info", title: "Assessment started", message: `${created.id} created for ${repair.product}.` });
  };

  const recordEstimate = (amount: number, expected: string) => {
    updateRepair(repair.id, { stage: "Customer Approval", estimate: amount, expectedDelivery: expected }, `Estimate ${formatINR(amount)} shared — expected ${expected}`);
    setEstimateOpen(false);
    toast({ tone: "success", title: "Estimate shared", message: `${formatINR(amount)} · awaiting customer approval.` });
  };

  const customerApproved = () => {
    updateRepair(repair.id, { stage: "Repair Work", worker }, `Customer approved — work started with ${worker}`);
    toast({ tone: "success", title: "Approved — work started", message: `${repair.id} with ${worker}.` });
  };

  const customerDeclined = () =>
    setConfirm({
      title: `Mark ${repair.id} declined?`,
      danger: true,
      message: "The customer declined the estimate. The consignment is returned unchanged.",
      confirmLabel: "Mark declined",
      action: () => {
        updateRepair(repair.id, { stage: "Declined" }, "Customer declined the estimate — consignment returned unchanged");
        toast({ tone: "info", title: "Repair declined", message: repair.id });
        setConfirm(null);
      },
    });

  const sendToQc = () => {
    updateRepair(repair.id, { stage: "Quality Check" }, "Work complete — in final quality check");
    toast({ tone: "info", title: "Quality check", message: "Add after photos and pass QC to mark it ready." });
  };

  const passQc = () =>
    setConfirm({
      title: `Pass quality check for ${repair.id}?`,
      message:
        repair.photosAfter.length === 0 ? (
          <>No after photos yet — add at least one so the customer can see the result. You can still pass QC now.</>
        ) : (
          <>The repair meets standard. The customer will be notified it’s ready.</>
        ),
      confirmLabel: "Pass QC — mark ready",
      action: () => {
        updateRepair(repair.id, { stage: "Ready" }, "Quality check passed — ready for collection");
        toast({ tone: "success", title: "Ready for collection", message: `${repair.customerName} notified (demo).` });
        setConfirm(null);
      },
    });

  const deliver = (amount: number, method: string) => {
    const payment = addRepairPayment(repair.id, { amount, method });
    updateRepair(repair.id, { stage: "Delivered" }, `Delivered · ${payment.id} charge ${formatINR(amount)} collected`);
    setCollectOpen(false);
    toast({ tone: "success", title: "Delivered", message: `${repair.id} closed · ${formatINR(amount)} collected.` });
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All repairs</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{repair.id}</h1>
            <Badge tone={repairStageTone[repair.stage]}>{repair.stage}</Badge>
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenCustomer(repair.customerId)}>{repair.customerName}</button>
            {" "}· {repair.product} · logged {repair.created} · expected {repair.expectedDelivery}
          </p>
        </div>
        <div className="detail-actions">
          {repair.productId && (
            <Button variant="secondary" onClick={() => onOpenProduct(repair.productId!)}><Icon name="gem" /> View product</Button>
          )}
          {repair.stage === "Request" && <Button onClick={startInspection}><Icon name="shield" /> Start assessment</Button>}
          {repair.stage === "Inspection" && (
            <>
              {inspection && <Button variant="secondary" onClick={() => onOpenInspection(inspection.id)}><Icon name="eye" /> Open {inspection.id}</Button>}
              <Button onClick={() => setEstimateOpen(true)}><Icon name="component" /> Record estimate</Button>
            </>
          )}
          {repair.stage === "Customer Approval" && (
            <>
              <Button variant="danger" onClick={customerDeclined}>Customer declined</Button>
              <Button onClick={customerApproved}><Icon name="check" /> Customer approved</Button>
            </>
          )}
          {repair.stage === "Repair Work" && <Button onClick={sendToQc}><Icon name="shield" /> Send to quality check</Button>}
          {repair.stage === "Quality Check" && <Button onClick={passQc}><Icon name="check" /> Pass QC — ready</Button>}
          {repair.stage === "Ready" && (
            <Button onClick={() => setCollectOpen(true)}><Icon name="check" /> Deliver & collect charge</Button>
          )}
        </div>
      </div>

      <Alert tone="info" title="Customer sees">
        “{customerVisibleStatus[repair.stage]}”
      </Alert>

      {repair.stage === "Declined" ? (
        <Alert tone="danger" title="Estimate declined">The consignment was returned to the customer unchanged.</Alert>
      ) : (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">REPAIR JOURNEY</p><h2>Request → Delivered</h2></div></div>
          <Stepper steps={repairStages} current={repair.stage === "Delivered" ? repairStages.length : stageIndex} />
        </section>
      )}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">THE PIECE</p><h2>{repair.product}</h2></div></div>
            <p className="requirement-quote">“{repair.issue}”</p>
            <div className="detail-list">
              <div><span>Estimate</span><strong>{repair.estimate ? formatINR(repair.estimate) : "Not shared yet"}</strong></div>
              <div><span>Line operator</span><strong>{repair.worker ?? "Unassigned"}</strong></div>
              <div><span>Expected delivery</span><strong>{repair.expectedDelivery}</strong></div>
              {inspection && (
                <div>
                  <span>Assessment</span>
                  <strong>
                    <button type="button" className="link-btn" onClick={() => onOpenInspection(inspection.id)}>{inspection.id}</button>
                    {" "}· <Badge tone={inspectionStatusTone[inspection.status]}>{inspection.status}</Badge>
                  </strong>
                </div>
              )}
              {paid > 0 && <div><span>Charge collected</span><strong>{formatINR(paid)}</strong></div>}
            </div>
            {repair.stage === "Customer Approval" && (
              <div className="status-change">
                <SelectField label="Line operator on approval" value={worker} onChange={e => setWorker(e.target.value)}>
                  {workers.map(w => <option key={w}>{w}</option>)}
                </SelectField>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-head"><div><p className="kicker">PHOTOS</p><h2>Before & after</h2></div></div>
            <p className="mini-title">BEFORE</p>
            <div className="gallery-thumbs">
              {repair.photosBefore.map(p => (
                <div key={p.id} className="gallery-thumb">
                  <span className="thumb-btn"><GemImage tone={p.tone} size="thumb" label={p.label} /></span>
                  <small className="muted">{p.label}</small>
                </div>
              ))}
              <button
                type="button"
                className="gallery-add"
                onClick={() => {
                  addRepairPhoto(repair.id, "before", { label: `Before ${repair.photosBefore.length + 1}`, tone: repair.tone });
                  toast({ tone: "success", title: "Before photo added" });
                }}
              >
                <Icon name="plus" /><span>Add</span>
              </button>
            </div>
            <p className="mini-title">AFTER</p>
            <div className="gallery-thumbs">
              {repair.photosAfter.length === 0 && <p className="muted">Added once the work is done.</p>}
              {repair.photosAfter.map(p => (
                <div key={p.id} className="gallery-thumb">
                  <span className="thumb-btn"><GemImage tone={p.tone} size="thumb" label={p.label} /></span>
                  <small className="muted">{p.label}</small>
                </div>
              ))}
              {["Repair Work", "Quality Check", "Ready", "Delivered"].includes(repair.stage) && (
                <button
                  type="button"
                  className="gallery-add"
                  onClick={() => {
                    addRepairPhoto(repair.id, "after", { label: `After ${repair.photosAfter.length + 1}`, tone: repair.tone });
                    toast({ tone: "success", title: "After photo added" });
                  }}
                >
                  <Icon name="plus" /><span>Add</span>
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Repair timeline</h2></div></div>
            <Timeline items={repair.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">NOTES</p><h2>Team notes</h2></div></div>
            <TextAreaField label="Add a note" placeholder="Handling notes, customer preferences..." value={noteText} onChange={e => setNoteText(e.target.value)} />
            <div className="note-actions">
              <Button
                variant="secondary"
                disabled={!noteText.trim()}
                onClick={() => {
                  addRepairNote(repair.id, noteText.trim());
                  setNoteText("");
                  toast({ tone: "success", title: "Note added" });
                }}
              >
                Add note
              </Button>
            </div>
            {repair.notes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              <div className="note-list">
                {repair.notes.map((n, i) => (
                  <div key={i}><p>{n.text}</p><small>{n.author} · {n.time}</small></div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <EstimateModal open={estimateOpen} onClose={() => setEstimateOpen(false)} onConfirm={recordEstimate} />
      <AmountMethodModal
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        title={`Deliver ${repair.id}`}
        message={<>Collect the rework charge and hand the consignment back to {repair.customerName}.</>}
        defaultAmount={repair.estimate ?? 0}
        confirmLabel="Collect & deliver"
        onConfirm={deliver}
      />
      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
