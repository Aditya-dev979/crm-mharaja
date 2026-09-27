import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { deviationStatusTone, grnSteps, grnStatusTone } from "@/data/purchaseData";
import { useAdmin } from "@/hooks/useAdmin";
import { useSendComm } from "@/components/dispatch/useSendComm";
import { commTemplates } from "@/data/dispatchData";
import { usePurchase } from "@/hooks/usePurchase";
import { useProducts } from "@/hooks/useProducts";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { Grn } from "@/types";

export default function GrnDetail({
  grn,
  onBack,
  onOpenPO,
  onOpenDeviations,
  onCreateProduct,
}: {
  grn: Grn;
  onBack: () => void;
  onOpenPO: (poId: string) => void;
  onOpenDeviations?: () => void;
  onCreateProduct: () => void;
}) {
  const { updateGrn, updateGrnLine, updatePO, pos, deviations, addDeviation } = usePurchase();
  const { logMovement } = useProducts();
  const { getControl, currentUser } = useAdmin();
  const { addNotification, logAudit } = useTeam();
  const sendComm = useSendComm();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const stepIndex = grnSteps.indexOf(grn.status as (typeof grnSteps)[number]);
  const editableQty = grn.status === "Material Received" || grn.status === "Under Verification";
  const editableInspection = grn.status === "Quality Inspection";
  const locked = grn.status === "Approved" || grn.status === "Posted to Stock" || grn.status === "Rejected";

  const grnDeviation = deviations.find(d => d.grnId === grn.id);
  const deviationThreshold = getControl("purchaseDeviation", 5);
  const totals = {
    received: grn.lines.reduce((s, l) => s + l.receivedQty, 0),
    accepted: grn.lines.reduce((s, l) => s + l.acceptedQty, 0),
    rejected: grn.lines.reduce((s, l) => s + l.rejectedQty, 0),
  };
  const hasWeightVariance = grn.lines.some(
    l => l.expectedWeight && l.receivedWeight && l.expectedWeight.trim() !== l.receivedWeight.trim(),
  );
  const deviationPct = totals.received > 0 ? Math.round((totals.rejected / totals.received) * 1000) / 10 : 0;
  const needsDeviation = totals.rejected > 0 || hasWeightVariance || deviationPct > deviationThreshold;
  /* Only the manager-approved quantity may post when a deviation governs this GRN. */
  const postableQty = grnDeviation?.approvedQty ?? totals.accepted;

  /* The supplier hears about the intake from the GRN itself, not from a
     separate screen. */
  const po = pos.find(p => p.id === grn.poId);
  const notifySupplier = () => {
    const template = commTemplates.find(t => t.id === "tpl-grn");
    if (!template) return;
    sendComm({
      channel: "Email",
      templateName: template.name,
      body: template.body,
      partyKind: "Supplier",
      partyId: po?.supplierId,
      partyName: grn.supplierName,
      reference: grn.id,
    });
    toast({ tone: "success", title: "Supplier notified", message: `${grn.supplierName} · ${grn.id} — logged in communication history.` });
  };

  const startVerification = () => {
    updateGrn(grn.id, { status: "Under Verification" }, "Quantity verification started");
    toast({ tone: "info", title: "Verification started", message: `${grn.id} — confirm received quantities against the PO.` });
  };

  const sendToInspection = () => {
    if (grn.lines.some(l => l.receivedQty < 0)) return;
    updateGrn(grn.id, { status: "Quality Inspection", inspector: "Deepak Verma" }, "Sent to quality inspection — Deepak Verma");
    addNotification({
      type: "Inspection required", priority: "High",
      title: `${grn.id} awaiting inspection`,
      message: `${grn.supplierName} · ${totals.received} unit(s) received against ${grn.poId} — Deepak Verma to inspect.`,
      reference: grn.id,
      recordRef: { kind: "grn", id: grn.id },
    });
    toast({ tone: "info", title: "In quality inspection", message: `${grn.id} assigned to Deepak Verma.` });
  };

  const raiseDeviation = () => {
    const line = grn.lines[0];
    setConfirm({
      title: `Raise a deviation on ${grn.id}?`,
      message: (
        <>
          Rejected {totals.rejected} of {totals.received}
          {hasWeightVariance ? " with a weight variance" : ""} — {deviationPct}% against the {deviationThreshold}% threshold.
          The Purchase Manager is notified automatically; stock posting waits for the manager decision.
        </>
      ),
      confirmLabel: "Raise deviation",
      action: () => {
        const created = addDeviation({
          grnId: grn.id, poId: grn.poId,
          supplierId: po?.supplierId ?? "", supplierName: grn.supplierName,
          item: line?.description ?? grn.id,
          poQty: grn.lines.reduce((s, l) => s + l.expectedQty, 0),
          receivedQty: totals.received, acceptedQty: totals.accepted, rejectedQty: totals.rejected,
          weightVariance: hasWeightVariance
            ? grn.lines.map(l => l.expectedWeight && l.receivedWeight ? `${l.receivedWeight} received vs ${l.expectedWeight} expected` : "").filter(Boolean).join("; ")
            : undefined,
          deviationPct,
          reason: line?.remarks?.trim() || "Inspection shortfall against the purchase order.",
        });
        addNotification({
          type: "GRN Deviation Alert", priority: "High",
          title: `${created.id} raised on ${grn.id}`,
          message: `${grn.supplierName} · ${totals.rejected} rejected of ${totals.received}${hasWeightVariance ? " · weight variance" : ""}. Purchase Manager to resolve.`,
          reference: created.id,
          recordRef: { kind: "deviation", id: created.id },
        });
        logAudit({
          user: currentUser, action: "GRN deviation raised", module: "Purchase",
          record: `${created.id} · ${grn.id}`,
          newValue: `${totals.rejected} rejected of ${totals.received} · ${deviationPct}%`,
        });
        setConfirm(null);
        toast({ tone: "warning", title: `${created.id} raised`, message: "Purchase Manager notified. Resolve it on the Deviations tab." });
        onOpenDeviations?.();
      },
    });
  };

  const approve = () => {
    const bad = grn.lines.find(l => l.acceptedQty + l.rejectedQty !== l.receivedQty);
    if (bad) {
      toast({ tone: "error", title: "Quantities don’t reconcile", message: "Accepted + rejected must equal received on every line." });
      return;
    }
    if (needsDeviation && !grnDeviation) {
      raiseDeviation();
      return;
    }
    if (grnDeviation && !["Approved", "Partially Approved", "Rejected"].includes(grnDeviation.status)) {
      toast({ tone: "warning", title: "Deviation pending", message: `${grnDeviation.id} must be decided before this GRN can be approved.` });
      onOpenDeviations?.();
      return;
    }
    if (grnDeviation?.status === "Rejected") {
      toast({ tone: "error", title: "Deviation rejected", message: "Nothing from this GRN may post to stock. Reject the GRN instead." });
      return;
    }
    setConfirm({
      title: `Approve ${grn.id}?`,
      message: (
        <>
          {grnDeviation
            ? <>Deviation {grnDeviation.id} allows <b>{grnDeviation.approvedQty}</b> of {totals.received} received units into stock.</>
            : <>Accepts {totals.accepted} of {totals.received} received units.</>}{" "}
          Rejected units go back to {grn.supplierName}.
        </>
      ),
      confirmLabel: "Approve GRN",
      action: () => {
        updateGrn(grn.id, { status: "Approved" }, grnDeviation ? `GRN approved under deviation ${grnDeviation.id}` : "GRN approved after inspection");
        toast({ tone: "success", title: "GRN approved", message: `${grn.id} is ready for stock posting.` });
        setConfirm(null);
      },
    });
  };

  const reject = () =>
    setConfirm({
      title: `Reject ${grn.id}?`,
      danger: true,
      message: "The entire receipt returns to the supplier. The PO stays open for a replacement delivery.",
      confirmLabel: "Reject GRN",
      action: () => {
        updateGrn(grn.id, { status: "Rejected" }, "GRN rejected — material returned to supplier");
        toast({ tone: "warning", title: "GRN rejected", message: grn.id });
        setConfirm(null);
      },
    });

  /* Deviation-governed receipts post only the manager-approved quantity, spread
     across lines in order; clean receipts post the full accepted quantity. */
  const postingPlan = () => {
    if (!grnDeviation) return grn.lines.map(l => l.acceptedQty);
    let left = grnDeviation.approvedQty ?? 0;
    return grn.lines.map(l => {
      const qty = Math.min(l.acceptedQty, left);
      left -= qty;
      return qty;
    });
  };

  const postToStock = () => {
    if (grnDeviation && !["Approved", "Partially Approved"].includes(grnDeviation.status)) {
      toast({ tone: "warning", title: "Deviation not cleared", message: `${grnDeviation.id} must be approved before stock posting.` });
      onOpenDeviations?.();
      return;
    }
    const plan = postingPlan();
    setConfirm({
      title: `Post ${grn.id} to stock?`,
      message: grnDeviation
        ? <>Deviation {grnDeviation.id} cleared <b>{plan.reduce((s, q) => s + q, 0)}</b> of {totals.received} received units. Only that quantity posts to the inventory ledger.</>
        : <>Accepted quantities post to the inventory ledger and become available for cataloguing. This is the final step of the purchase chain.</>,
      confirmLabel: "Post to stock",
      action: () => {
        grn.lines.forEach((line, i) => {
          if (plan[i] > 0) {
            logMovement({
              sku: grn.id,
              product: line.description,
              type: "Stock In",
              qty: plan[i],
              location: "Vapi Plant · Bonded Store",
              note: `Posted from ${grn.id}${grnDeviation ? ` · under ${grnDeviation.id}` : ""}${line.certificate ? ` · cert ${line.certificate}` : ""}${line.acceptedWeight ? ` · ${line.acceptedWeight}` : ""}`,
            });
          }
        });
        updateGrn(
          grn.id,
          { status: "Posted to Stock" },
          grnDeviation
            ? `${plan.reduce((s, q) => s + q, 0)} units posted to inventory under ${grnDeviation.id}`
            : "Accepted stock posted to inventory",
        );
        if (po) updatePO(po.id, { status: "Received" }, `${grn.id} posted to stock`);
        logAudit({
          user: currentUser, action: "GRN accepted quantity posted to stock", module: "GRN",
          record: `${grn.id} · ${grn.poId}`,
          oldValue: `Received ${totals.received} · accepted ${totals.accepted} · rejected ${totals.rejected}`,
          newValue: grnDeviation
            ? `${postableQty} unit(s) posted under deviation ${grnDeviation.id} (manager-approved quantity only)`
            : `${postableQty} accepted unit(s) posted to the inventory ledger`,
        });
        toast({ tone: "success", title: "Stock posted", message: `${grn.id} — accepted units are in the inventory ledger.` });
        setConfirm(null);
      },
    });
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All GRNs</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{grn.id}</h1>
            <Badge tone={grnStatusTone[grn.status]}>{grn.status}</Badge>
            {grnDeviation && <Badge tone={deviationStatusTone[grnDeviation.status]}>Deviation · {grnDeviation.status}</Badge>}
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenPO(grn.poId)}>{grn.poId}</button>
            {" "}· {grn.supplierName} · received {grn.receivedDate}
            {grn.inspector && <> · inspector {grn.inspector}</>}
          </p>
        </div>
        <div className="detail-actions">
          <Button variant="ghost" onClick={notifySupplier}><Icon name="mail" /> Notify supplier</Button>
          {grn.status === "Material Received" && <Button onClick={startVerification}><Icon name="check" /> Start verification</Button>}
          {grn.status === "Under Verification" && <Button onClick={sendToInspection}><Icon name="shield" /> Send to inspection</Button>}
          {grn.status === "Quality Inspection" && (
            <>
              <Button variant="danger" onClick={reject}>Reject GRN</Button>
              {needsDeviation && !grnDeviation && (
                <Button variant="ghost" onClick={raiseDeviation}><Icon name="warning" /> Raise deviation</Button>
              )}
              <Button onClick={approve}><Icon name="check" /> Approve</Button>
            </>
          )}
          {grn.status === "Approved" && <Button onClick={postToStock}><Icon name="layers" /> Post to stock</Button>}
        </div>
      </div>

      {grn.status === "Rejected" ? (
        <Alert tone="danger" title="This GRN was rejected">The material was returned to {grn.supplierName}. Raise a fresh GRN when a replacement arrives.</Alert>
      ) : (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">GRN WORKFLOW</p><h2>PO → Stock posting</h2></div></div>
          <Stepper steps={grnSteps} current={Math.max(stepIndex, 0) + (grn.status === "Posted to Stock" ? 1 : 0)} />
        </section>
      )}

      {grnDeviation && (
        <Alert
          tone={grnDeviation.status === "Approved" || grnDeviation.status === "Partially Approved" ? "info" : grnDeviation.status === "Rejected" ? "danger" : "warning"}
          title={`Deviation ${grnDeviation.id} · ${grnDeviation.status}`}
        >
          {grnDeviation.rejectedQty} of {grnDeviation.receivedQty} units short of the PO ({grnDeviation.deviationPct}%)
          {grnDeviation.weightVariance && <> · {grnDeviation.weightVariance}</>}.{" "}
          {grnDeviation.approvedQty !== undefined
            ? <>Manager cleared <b>{grnDeviation.approvedQty}</b> units for stock posting.</>
            : <>Stock posting is held until the Purchase Manager decides.</>}{" "}
          {onOpenDeviations && (
            <button type="button" className="link-btn" onClick={onOpenDeviations}>Open the deviation workspace</button>
          )}
        </Alert>
      )}

      {grn.status === "Quality Inspection" && needsDeviation && !grnDeviation && (
        <Alert tone="warning" title="This receipt does not match the purchase order">
          {totals.rejected > 0 && <>{totals.rejected} of {totals.received} units rejected ({deviationPct}% against a {deviationThreshold}% tolerance). </>}
          {hasWeightVariance && <>Received weight differs from the expected weight. </>}
          Raise a deviation so the Purchase Manager can decide what may enter stock.
        </Alert>
      )}

      {grn.status === "Posted to Stock" && (
        <Alert tone="success" title="Stock posted to inventory">
          Accepted units are in the stock ledger.{" "}
          <button type="button" className="link-btn" onClick={onCreateProduct}>Add them to the product catalogue</button> to price and sell them.
        </Alert>
      )}

      <div className="two-col">
        <section className="panel">
          <div className="section-head"><div><p className="kicker">RECEIVED LINES</p><h2>Quantities & inspection</h2></div></div>
          <div className="table-wrap op-table">
            <table>
              <thead>
                <tr><th>Item</th><th>Expected</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Expected wt</th><th>Received wt</th></tr>
              </thead>
              <tbody>
                {grn.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="note-cell">{line.description}</td>
                    <td>{line.expectedQty}</td>
                    <td>
                      {editableQty ? (
                        <input className="count-input" inputMode="numeric" aria-label={`Received quantity line ${i + 1}`} value={line.receivedQty}
                          onChange={e => updateGrnLine(grn.id, i, { receivedQty: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
                      ) : line.receivedQty}
                    </td>
                    <td>
                      {editableInspection ? (
                        <input className="count-input" inputMode="numeric" aria-label={`Accepted quantity line ${i + 1}`} value={line.acceptedQty}
                          onChange={e => updateGrnLine(grn.id, i, { acceptedQty: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
                      ) : line.acceptedQty}
                    </td>
                    <td>
                      {editableInspection ? (
                        <input className="count-input" inputMode="numeric" aria-label={`Rejected quantity line ${i + 1}`} value={line.rejectedQty}
                          onChange={e => updateGrnLine(grn.id, i, { rejectedQty: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
                      ) : line.rejectedQty}
                    </td>
                    <td>
                      {editableQty ? (
                        <input className="count-input wt-input" aria-label={`Expected weight line ${i + 1}`} placeholder="e.g. 312.0 g" value={line.expectedWeight ?? ""}
                          onChange={e => updateGrnLine(grn.id, i, { expectedWeight: e.target.value })} />
                      ) : (line.expectedWeight ?? "—")}
                    </td>
                    <td className={line.expectedWeight && line.receivedWeight && line.expectedWeight.trim() !== line.receivedWeight.trim() ? "wt-variance" : undefined}>
                      {editableQty ? (
                        <input className="count-input wt-input" aria-label={`Received weight line ${i + 1}`} placeholder="Weighbridge / scale" value={line.receivedWeight ?? ""}
                          onChange={e => updateGrnLine(grn.id, i, { receivedWeight: e.target.value })} />
                      ) : (line.receivedWeight ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {grn.lines.map((line, i) => (
            <div key={i} className="grn-line-extra">
              <label className="field">
                <span className="field-label">Certificate · line {i + 1}</span>
                <input
                  placeholder="e.g. NABL-2026-101223"
                  value={line.certificate ?? ""}
                  disabled={locked}
                  onChange={e => updateGrnLine(grn.id, i, { certificate: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Accepted wt · line {i + 1}</span>
                <input
                  placeholder="e.g. 280.4 g"
                  value={line.acceptedWeight ?? ""}
                  disabled={!editableInspection}
                  onChange={e => updateGrnLine(grn.id, i, { acceptedWeight: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Rejected wt · line {i + 1}</span>
                <input
                  placeholder="e.g. 22.2 g"
                  value={line.rejectedWeight ?? ""}
                  disabled={!editableInspection}
                  onChange={e => updateGrnLine(grn.id, i, { rejectedWeight: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Remarks · line {i + 1}</span>
                <input
                  placeholder="Condition, flags, storage notes..."
                  value={line.remarks ?? ""}
                  disabled={locked}
                  onChange={e => updateGrnLine(grn.id, i, { remarks: e.target.value })}
                />
              </label>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>GRN timeline</h2></div></div>
          <Timeline items={grn.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
