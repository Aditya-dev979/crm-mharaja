import { useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { TextAreaField, TextField } from "@/components/forms/Field";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { cmStatusTone } from "@/data/productionData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProduction } from "@/hooks/useProduction";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { CmAssignment } from "@/types";

export default function CmAssignmentDetail({
  assignment,
  onBack,
  onOpenOrder,
  onOpenDispatch,
}: {
  assignment: CmAssignment;
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenDispatch?: () => void;
}) {
  const { manufacturers, updateAssignment } = useProduction();
  const { orders: salesOrders, updateOrder } = useSales();
  const { can, currentUser } = useAdmin();
  const { addNotification, logAudit } = useTeam();
  const toast = useToast();
  const [update, setUpdate] = useState("");
  const [ready, setReady] = useState(String(assignment.readyQty));
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; action: () => void } | null>(null);

  const manufacturer = manufacturers.find(m => m.id === assignment.manufacturerId);
  const canEdit = can("Production", "Edit");
  const pending = assignment.qty - assignment.readyQty;

  const recordUpdate = () => {
    if (!update.trim()) return;
    updateAssignment(
      assignment.id,
      { status: assignment.status === "Sent" ? "Accepted" : assignment.status },
      update.trim(),
    );
    setUpdate("");
    toast({ tone: "success", title: "Update recorded", message: `${assignment.id} · ${assignment.manufacturerName}.` });
  };

  const saveReady = () => {
    const qty = parseInt(ready || "0", 10);
    if (qty < 0 || qty > assignment.qty) {
      toast({ tone: "error", title: "Quantity out of range", message: `Ready quantity must be between 0 and ${assignment.qty}.` });
      return;
    }
    const status = qty === 0 ? "In Production" : qty < assignment.qty ? "Partially Ready" : "Ready to Dispatch";
    updateAssignment(assignment.id, { readyQty: qty, status }, `Ready-to-dispatch quantity updated to ${qty} of ${assignment.qty}`);
    if (qty === assignment.qty) {
      addNotification({
        type: "Production Update", priority: "Normal",
        title: `${assignment.id} ready to dispatch`,
        message: `${assignment.manufacturerName} has all ${assignment.qty} × ${assignment.product} ready.`,
        reference: assignment.id,
        recordRef: { kind: "assignment", id: assignment.id },
      });
      if (assignment.orderId && salesOrders.some(o => o.id === assignment.orderId)) {
        updateOrder(assignment.orderId, { status: "Ready" }, `${assignment.id} — contract manufacturer ready to dispatch`);
      }
    }
    logAudit({
      user: currentUser, action: "Contract manufacturing update", module: "Production",
      record: assignment.id, newValue: `${qty} of ${assignment.qty} ready`,
    });
    toast({ tone: "success", title: "Ready quantity updated", message: `${qty} of ${assignment.qty} ready at ${assignment.manufacturerName}.` });
  };

  const close = () =>
    setConfirm({
      title: `Close ${assignment.id}?`,
      message: <>All {assignment.qty} units are accounted for. The assignment moves to history and stays linked to {assignment.orderId ?? "the product record"}.</>,
      confirmLabel: "Close assignment",
      action: () => {
        updateAssignment(assignment.id, { status: "Closed" }, "Assignment closed");
        toast({ tone: "success", title: "Assignment closed", message: assignment.id });
        setConfirm(null);
      },
    });

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All assignments</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{assignment.id}</h1>
            <Badge tone={cmStatusTone[assignment.status]}>{assignment.status}</Badge>
            <Badge tone="neutral">External manufacturer</Badge>
          </div>
          <p className="muted-line">
            {assignment.manufacturerName}{manufacturer ? ` · ${manufacturer.city}` : ""} · {assignment.qty} × {assignment.product}
            {assignment.orderId && <> · <button type="button" className="link-btn" onClick={() => onOpenOrder(assignment.orderId!)}>{assignment.orderId}</button></>}
            {assignment.piId && <> · {assignment.piId}</>}
          </p>
        </div>
        <div className="detail-actions">
          {assignment.status === "Ready to Dispatch" && onOpenDispatch && (
            <Button onClick={onOpenDispatch}><Icon name="send" /> Plan dispatch</Button>
          )}
          {assignment.status === "Ready to Dispatch" && canEdit && <Button variant="secondary" onClick={close}>Close assignment</Button>}
        </div>
      </div>

      <Alert tone="info" title="External inventory is not Maharaja Soap stock">
        Work in progress at {assignment.manufacturerName} stays on their books. Only the ready-to-dispatch quantity is tracked here —
        nothing enters the internal inventory ledger until goods are received back.
      </Alert>

      <div className="stat-chips">
        <div className="stat-chip"><span>Assigned quantity</span><strong>{assignment.qty}</strong><small>Sent {assignment.sentDate}</small></div>
        <div className="stat-chip"><span>Ready to dispatch</span><strong className="up-text">{assignment.readyQty}</strong><small>Confirmed by the manufacturer</small></div>
        <div className="stat-chip"><span>Still in production</span><strong className={pending ? "warning-text" : undefined}>{pending}</strong><small>Expected {assignment.expectedCompletion}</small></div>
        <div className="stat-chip"><span>Documents</span><strong>{assignment.attachments.length}</strong><small>PI, specs and issue notes</small></div>
      </div>

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">APPROVED SPECIFICATIONS</p><h2>What the manufacturer works to</h2></div></div>
            <ul className="pi-list">
              {assignment.specifications.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <div className="detail-list">
              <div><span>Approved PI</span><strong>{assignment.piId ?? "—"}</strong></div>
              <div><span>Sent date</span><strong>{assignment.sentDate}</strong></div>
              <div><span>Expected completion</span><strong>{assignment.expectedCompletion}</strong></div>
            </div>
            <p className="kicker" style={{ marginTop: 12 }}>ATTACHMENTS</p>
            <div className="related-list">
              {assignment.attachments.length === 0 ? (
                <p className="muted">No documents attached.</p>
              ) : (
                assignment.attachments.map(a => (
                  <button key={a} type="button" onClick={() => toast({ tone: "info", title: "Preview only", message: `${a} is a prototype attachment.` })}>
                    <span className="doc-icon"><Icon name="layers" /></span>
                    <span><strong>{a}</strong><small>Shared with {assignment.manufacturerName}</small></span>
                  </button>
                ))
              )}
            </div>
          </section>

          {canEdit && assignment.status !== "Closed" && (
            <section className="panel">
              <div className="section-head"><div><p className="kicker">PROGRESS</p><h2>Record an update</h2></div></div>
              <TextAreaField
                label="Production update from the manufacturer"
                placeholder="What did they report?"
                value={update}
                onChange={e => setUpdate(e.target.value)}
              />
              <div className="note-actions">
                <Button variant="secondary" onClick={recordUpdate} disabled={!update.trim()}>Save update</Button>
              </div>
              <div className="modal-field-row">
                <TextField
                  label="Ready-to-dispatch quantity"
                  inputMode="numeric"
                  helper={`Out of ${assignment.qty} assigned units`}
                  value={ready}
                  onChange={e => setReady(e.target.value.replace(/\D/g, ""))}
                />
                <div className="field" style={{ justifyContent: "flex-end" }}>
                  <Button variant="secondary" onClick={saveReady}>Update ready quantity</Button>
                </div>
              </div>
            </section>
          )}
        </div>

        <section className="panel">
          <div className="section-head"><div><p className="kicker">COMMUNICATION</p><h2>Assignment timeline</h2></div></div>
          <Timeline items={assignment.updates.slice(0, 10).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} />
      )}
    </div>
  );
}
