import { useEffect, useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import EmptyState from "@/components/data-display/EmptyState";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useSendComm } from "@/components/dispatch/useSendComm";
import { deviationStatusTone } from "@/data/purchaseData";
import { useAdmin } from "@/hooks/useAdmin";
import { usePurchase } from "@/hooks/usePurchase";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import { formatINR } from "@/utils";
import type { GrnDeviation } from "@/types";

function DecisionModal({
  deviation,
  unitRate,
  onClose,
  onDecide,
}: {
  deviation: GrnDeviation | null;
  unitRate: number;
  onClose: () => void;
  onDecide: (decision: "Approved" | "Rejected" | "Partially Approved", approvedQty: number, remarks: string) => void;
}) {
  const [decision, setDecision] = useState<"Approved" | "Rejected" | "Partially Approved">("Approved");
  const [qty, setQty] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (deviation) {
      setDecision("Approved");
      setQty(String(deviation.acceptedQty));
      setRemarks("");
      setError(undefined);
    }
  }, [deviation?.id]);

  if (!deviation) return null;
  const approvedQty = decision === "Rejected" ? 0 : decision === "Approved" ? deviation.acceptedQty : parseInt(qty || "0", 10);

  return (
    <Modal open onClose={onClose} labelledBy="devdecide-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="shield" /></div>
      <h2 id="devdecide-title">Manager decision — {deviation.id}</h2>
      <p>{deviation.item} · PO {deviation.poQty} / received {deviation.receivedQty} / accepted {deviation.acceptedQty} / rejected {deviation.rejectedQty}{deviation.weightVariance ? ` · ${deviation.weightVariance}` : ""}.</p>
      <SelectField label="Decision" value={decision} onChange={e => setDecision(e.target.value as typeof decision)}>
        <option>Approved</option>
        <option>Partially Approved</option>
        <option>Rejected</option>
      </SelectField>
      {decision === "Partially Approved" && (
        <TextField
          label={`Quantity to approve (max ${deviation.acceptedQty})`} required inputMode="numeric"
          value={qty} onChange={e => { setQty(e.target.value.replace(/\D/g, "")); setError(undefined); }} error={error}
        />
      )}
      <div className="quote-totals">
        <div><span>Posts to usable stock</span><strong className={approvedQty > 0 ? "up-text" : "warning-text"}>{approvedQty} pcs</strong></div>
        <div><span>Stays out of stock</span><strong>{deviation.receivedQty - approvedQty} pcs (rejected / pending)</strong></div>
        {unitRate > 0 && (
          <>
            <div><span>PO value at {formatINR(unitRate)}/unit</span><strong>{formatINR(unitRate * deviation.poQty)}</strong></div>
            <div><span>Payable after this decision</span><strong>{formatINR(unitRate * approvedQty)}</strong></div>
            <div>
              <span>Withheld from the supplier</span>
              <strong className={unitRate * (deviation.poQty - approvedQty) > 0 ? "warning-text" : undefined}>
                {formatINR(unitRate * (deviation.poQty - approvedQty))}
              </strong>
            </div>
            <div>
              <span>Debit note to raise</span>
              <strong>
                {deviation.poQty - approvedQty > 0
                  ? `${formatINR(unitRate * (deviation.poQty - approvedQty))} against ${deviation.poId}`
                  : "None — full quantity accepted"}
              </strong>
            </div>
          </>
        )}
      </div>
      <TextAreaField
        label="Manager remarks" required placeholder="Decision rationale — recorded on the deviation and audit trail…"
        value={remarks} onChange={e => { setRemarks(e.target.value); setError(undefined); }} error={error}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={decision === "Rejected" ? "danger" : "primary"}
          onClick={() => {
            if (!remarks.trim()) return setError("Remarks are required for a deviation decision");
            if (decision === "Partially Approved" && (approvedQty <= 0 || approvedQty > deviation.acceptedQty)) return setError(`Enter 1–${deviation.acceptedQty}`);
            onDecide(decision, approvedQty, remarks.trim());
          }}
        >
          Record decision
        </Button>
      </div>
    </Modal>
  );
}

export default function DeviationHub({
  onOpenGrn,
  onOpenPo,
  onOpenSupplier,
}: {
  onOpenGrn: (grnId: string) => void;
  onOpenPo: (poId: string) => void;
  onOpenSupplier: (supplierId: string) => void;
}) {
  const { deviations, updateDeviation, pos: purchaseOrders } = usePurchase();
  const { can, activeRole, currentUser } = useAdmin();
  const { logAudit, addNotification } = useTeam();
  const sendComm = useSendComm();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(deviations[0]?.id ?? null);
  const [responseText, setResponseText] = useState("");
  const [decideTarget, setDecideTarget] = useState<GrnDeviation | null>(null);

  const deviation = deviations.find(d => d.id === openId) ?? deviations[0];
  const canDecide = can("GRN", "Approve");

  /* The money effect of a deviation comes from the purchase order it was raised
     against, so the rate is read from the matching PO line rather than stored
     twice. A missing line simply hides the money preview. */
  const linkedPo = purchaseOrders.find(p => p.id === deviation.poId);
  const poLine =
    linkedPo?.lines.find(l => l.description === deviation.item) ??
    linkedPo?.lines.find(l => deviation.item.includes(l.description) || l.description.includes(deviation.item));
  const unitRate = poLine?.unitPrice ?? 0;
  const decidedQty = deviation.approvedQty ?? 0;

  if (!deviation) {
    return <EmptyState icon="check" title="No deviations" description="GRNs with shortfalls, rejections or weight variance raise deviations here." mini />;
  }

  const notifySupplier = () => {
    sendComm({
      channel: "Email",
      templateName: "Deviation notice",
      body: `Dear {name}, a deviation has been recorded on {reference}: ${deviation.reason} Kindly respond with your resolution.`,
      partyKind: "Supplier",
      partyId: deviation.supplierId,
      partyName: deviation.supplierName,
      reference: deviation.poId,
    });
    updateDeviation(deviation.id, { status: "Supplier Contacted" }, `Deviation communicated to ${deviation.supplierName}`);
    toast({ tone: "info", title: "Supplier notified", message: `${deviation.supplierName} · ${deviation.poId} (demo delivery).` });
  };

  const recordResponse = () => {
    if (!responseText.trim()) return;
    updateDeviation(deviation.id, { supplierResponse: responseText.trim() }, "Supplier response recorded");
    setResponseText("");
    toast({ tone: "success", title: "Response recorded", message: deviation.id });
  };

  const submitToManager = () => {
    updateDeviation(deviation.id, { status: "Pending Manager Approval" }, "Submitted to manager for decision");
    addNotification({
      type: "New Approval", priority: "High",
      title: `Deviation ${deviation.id} needs a decision`,
      message: `${deviation.item} — ${deviation.reason}`,
      reference: deviation.id,
      recordRef: { kind: "deviation", id: deviation.id },
    });
    toast({ tone: "info", title: "Sent for manager approval", message: deviation.id });
  };

  const decide = (decision: "Approved" | "Rejected" | "Partially Approved", approvedQty: number, remarks: string) => {
    updateDeviation(
      deviation.id,
      { status: decision, approvedQty, managerRemarks: remarks, decidedBy: currentUser, decidedAt: "Just now" },
      `${decision} by ${currentUser} — ${approvedQty} pcs cleared for stock · “${remarks}”`,
    );
    logAudit({
      user: currentUser, action: `Deviation ${decision.toLowerCase()}`, module: "Purchase",
      record: `${deviation.id} · ${deviation.grnId}`,
      oldValue: `Accepted ${deviation.acceptedQty} / rejected ${deviation.rejectedQty}`,
      newValue: `${approvedQty} pcs approved for stock — ${remarks}`,
    });
    setDecideTarget(null);
    toast({
      tone: decision === "Rejected" ? "warning" : "success",
      title: `Deviation ${decision.toLowerCase()}`,
      message: `${deviation.id} · ${approvedQty} pcs will post to stock via ${deviation.grnId}.`,
    });
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">GRN DEVIATIONS</p><h2>{deviations.length} on record</h2></div>
          <select aria-label="Deviation" value={deviation.id} onChange={e => setOpenId(e.target.value)}>
            {deviations.map(d => <option key={d.id} value={d.id}>{d.id} · {d.supplierName}</option>)}
          </select>
        </div>

        <div className="detail-title">
          <h2>{deviation.id}</h2>
          <Badge tone={deviationStatusTone[deviation.status]}>{deviation.status}</Badge>
          <Badge tone={deviation.deviationPct > 5 ? "danger" : "amber"}>{deviation.deviationPct}% deviation</Badge>
        </div>
        <p className="muted-line">
          <button type="button" className="link-btn" onClick={() => onOpenGrn(deviation.grnId)}>{deviation.grnId}</button>
          {" · "}
          <button type="button" className="link-btn" onClick={() => onOpenPo(deviation.poId)}>{deviation.poId}</button>
          {" · "}
          <button type="button" className="link-btn" onClick={() => onOpenSupplier(deviation.supplierId)}>{deviation.supplierName}</button>
          {" · raised "}{deviation.created}
        </p>

        <div className="two-col">
          <div className="page-stack">
            <div className="detail-list">
              <div><span>Item</span><strong>{deviation.item}</strong></div>
              <div><span>PO quantity</span><strong>{deviation.poQty}</strong></div>
              <div><span>Received</span><strong>{deviation.receivedQty}</strong></div>
              <div><span>Accepted</span><strong>{deviation.acceptedQty}</strong></div>
              <div><span>Rejected</span><strong className="warning-text">{deviation.rejectedQty}</strong></div>
              {deviation.weightVariance && <div><span>Weight variance</span><strong className="warning-text">{deviation.weightVariance}</strong></div>}
              {deviation.priceDeviation && <div><span>Price / term deviation</span><strong>{deviation.priceDeviation}</strong></div>}
              <div><span>Reason</span><strong>{deviation.reason}</strong></div>
              {deviation.supplierResponse && <div><span>Supplier response</span><strong>{deviation.supplierResponse}</strong></div>}
              {deviation.resolution && <div><span>Resolution</span><strong>{deviation.resolution}</strong></div>}
              {deviation.managerRemarks && <div><span>Manager remarks</span><strong>“{deviation.managerRemarks}”</strong></div>}
              {deviation.decidedBy && <div><span>Decided by</span><strong>{deviation.decidedBy} · {deviation.decidedAt}</strong></div>}
            </div>

            {["Approved", "Partially Approved"].includes(deviation.status) && (
              <Alert tone="success" title={`${deviation.approvedQty} pcs cleared for stock posting`}>
                Open {deviation.grnId} to post — only the approved quantity enters usable stock; the rest stays excluded.
                {unitRate > 0 && (
                  <>
                    {" "}Payable to {deviation.supplierName} is {formatINR(unitRate * decidedQty)} against a PO value of{" "}
                    {formatINR(unitRate * deviation.poQty)}
                    {deviation.poQty - decidedQty > 0
                      ? `, so ${formatINR(unitRate * (deviation.poQty - decidedQty))} is recoverable through a debit note.`
                      : "."}
                  </>
                )}
              </Alert>
            )}
            {deviation.status === "Rejected" && (
              <Alert tone="danger" title="Deviation rejected — nothing posts to stock">
                The lot returns to {deviation.supplierName}. Recovery continues through the debit note.
              </Alert>
            )}

            <div className="detail-actions">
              {["Open", "Supplier Contacted"].includes(deviation.status) && (
                <Button variant="secondary" onClick={notifySupplier}><Icon name="send" /> Notify supplier</Button>
              )}
              {deviation.status === "Supplier Contacted" && (
                <Button onClick={submitToManager}><Icon name="shield" /> Submit to manager</Button>
              )}
              {deviation.status === "Pending Manager Approval" && canDecide && (
                <Button onClick={() => setDecideTarget(deviation)}><Icon name="check" /> Manager decision</Button>
              )}
              {deviation.status === "Pending Manager Approval" && !canDecide && (
                <Button variant="secondary" disabled>Awaiting manager — {activeRole} cannot decide</Button>
              )}
            </div>

            {["Open", "Supplier Contacted"].includes(deviation.status) && (
              <>
                <TextAreaField
                  label="Record supplier response / resolution"
                  placeholder="What did the supplier say, and how is it being resolved?"
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                />
                <div className="note-actions">
                  <Button variant="secondary" onClick={recordResponse} disabled={!responseText.trim()}>Save response</Button>
                </div>
              </>
            )}
          </div>

          <section className="panel">
            <div className="section-head"><div><p className="kicker">RESOLUTION HISTORY</p><h2>Deviation timeline</h2></div></div>
            <Timeline items={deviation.timeline.slice(0, 9).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
          </section>
        </div>
      </section>

      <DecisionModal deviation={decideTarget} unitRate={unitRate} onClose={() => setDecideTarget(null)} onDecide={decide} />
    </div>
  );
}
