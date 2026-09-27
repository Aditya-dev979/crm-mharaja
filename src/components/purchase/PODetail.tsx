import { useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { ReceiveMaterialModal, RevisePOModal, SupplierPaymentModal } from "@/components/purchase/PurchaseModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useSendComm } from "@/components/dispatch/useSendComm";
import { commTemplates } from "@/data/dispatchData";
import { grnStatusTone, poPaid, poStatusTone, poTotals } from "@/data/purchaseData";
import { useAdmin } from "@/hooks/useAdmin";
import { usePurchase } from "@/hooks/usePurchase";
import { useProducts } from "@/hooks/useProducts";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { PurchaseOrder } from "@/types";
import { formatINR } from "@/utils";

export default function PODetail({
  po,
  onBack,
  onOpenSupplier,
  onOpenGrn,
}: {
  po: PurchaseOrder;
  onBack: () => void;
  onOpenSupplier: (supplierId: string) => void;
  onOpenGrn: (grnId: string) => void;
}) {
  const { updatePO, revisePO, addPOPayment, addGrn, grns } = usePurchase();
  const { logMovement } = useProducts();
  const { can, currentUser } = useAdmin();
  const { logAudit, addNotification } = useTeam();
  const sendComm = useSendComm();
  const toast = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const totals = poTotals(po);
  const paid = poPaid(po);
  const balance = totals.total - paid;
  const poGrns = grns.filter(g => g.poId === po.id);
  const receivable = po.status === "Sent" || po.status === "Partially Received";

  const canApprove = can("Purchase", "Approve");
  const canEdit = can("Purchase", "Edit");
  const approved = Boolean(po.approvedBy);
  /* Terms may only be revised while nothing has been received against the PO. */
  const revisable =
    canEdit && poGrns.length === 0 && po.status !== "Cancelled" && po.status !== "Closed" && (approved || po.status === "Sent");

  const applyRevision = (next: Parameters<typeof revisePO>[1], reason: string) => {
    const before = totals.total;
    revisePO(po.id, next, reason, "Arjun Sharma");
    logAudit({
      user: currentUser,
      action: `Purchase order revised to version ${(po.version ?? 1) + 1}`,
      module: "Purchase",
      record: po.id,
      oldValue: `v${po.version ?? 1} · ${formatINR(before)}`,
      newValue: `v${(po.version ?? 1) + 1} · ${reason}`,
    });
    setReviseOpen(false);
    toast({
      tone: "success",
      title: `Version ${(po.version ?? 1) + 1} created`,
      message: `${po.id} is back in Draft and needs re-approval before it goes to ${po.supplierName}.`,
    });
  };

  const approvePO = () =>
    setConfirm({
      title: `Approve ${po.id}?`,
      message: (
        <>
          Approving locks the commercial terms at {formatINR(totals.total)} — {po.paymentTerms}
          {po.creditDays ? `, ${po.creditDays} days credit` : ""}
          {po.transporter ? `, transport by ${po.transporter}` : ""}. The PO can then be sent to {po.supplierName}.
        </>
      ),
      confirmLabel: "Approve purchase order",
      action: () => {
        updatePO(
          po.id,
          { approvedBy: "Rajesh Sharma", approvedAt: "08 Mar 2026", version: po.version ?? 1 },
          `PO approved by Rajesh Sharma · ${formatINR(totals.total)}`,
        );
        logAudit({
          user: currentUser, action: "Purchase order approved", module: "Purchase",
          record: po.id, newValue: `${formatINR(totals.total)} · ${po.paymentTerms}`,
        });
        addNotification({
          type: "Purchase Update", priority: "Normal",
          title: `${po.id} approved`,
          message: `${po.supplierName} · ${formatINR(totals.total)} · ready to send.`,
          reference: po.id,
          recordRef: { kind: "po", id: po.id },
        });
        toast({ tone: "success", title: "PO approved", message: `${po.id} is ready to send to ${po.supplierName}.` });
        setConfirm(null);
      },
    });

  const sendPO = () => {
    const template = commTemplates.find(t => t.id === "tpl-po");
    updatePO(po.id, { status: "Sent" }, `PO sent to ${po.supplierName}`);
    if (template) {
      sendComm({
        channel: "Email",
        templateName: template.name,
        body: template.body,
        partyKind: "Supplier",
        partyId: po.supplierId,
        partyName: po.supplierName,
        reference: po.id,
      });
    }
    toast({ tone: "success", title: "PO sent", message: `${po.id} emailed to ${po.supplierName} — logged in communication history.` });
  };

  const sendTerms = () => {
    const template = commTemplates.find(t => t.id === "tpl-approval");
    if (!template) return;
    sendComm({
      channel: "Email",
      templateName: "Transport & terms confirmation",
      body: template.body,
      partyKind: "Supplier",
      partyId: po.supplierId,
      partyName: po.supplierName,
      reference: po.id,
    });
    toast({ tone: "success", title: "Coordination note sent", message: `Transport and credit terms confirmed to ${po.supplierName}.` });
  };

  const receive = (note: string) => {
    const grn = addGrn(
      {
        poId: po.id,
        supplierName: po.supplierName,
        receivedDate: "Just now",
        status: "Material Received",
        lines: po.lines.map(l => ({
          description: l.description,
          expectedQty: l.qty,
          receivedQty: l.qty,
          acceptedQty: 0,
          rejectedQty: 0,
          remarks: note || undefined,
        })),
      },
      `Material received against ${po.id}`,
    );
    updatePO(po.id, { status: "Partially Received", grnIds: [...po.grnIds, grn.id] }, `${grn.id} raised — material received`);
    logMovement({ sku: grn.id, product: po.lines[0]?.description ?? "Material", type: "GRN", qty: po.lines.reduce((s, l) => s + l.qty, 0), location: "Vapi Plant · Bonded Store", note: `Material received against ${po.id}` });
    setReceiveOpen(false);
    toast({ tone: "success", title: "GRN created", message: `${grn.id} — verify and inspect before stock posting.` });
    onOpenGrn(grn.id);
  };

  const pay = (amount: number, method: string) => {
    const payment = addPOPayment(po.id, { amount, method });
    updatePO(po.id, {}, `${payment.id} · ${formatINR(amount)} paid — ${method.toLowerCase()}`);
    setPayOpen(false);
    toast({
      tone: "success",
      title: "Supplier payment recorded",
      message: balance - amount <= 0 ? `${po.id} is fully paid.` : `${formatINR(balance - amount)} still payable on ${po.id}.`,
    });
  };

  const cancelPO = () =>
    setConfirm({
      title: `Cancel ${po.id}?`,
      danger: true,
      message: "The supplier will be informed. Any advance paid must be recovered or adjusted manually.",
      confirmLabel: "Cancel purchase order",
      action: () => {
        updatePO(po.id, { status: "Cancelled" }, "Purchase order cancelled");
        toast({ tone: "warning", title: "PO cancelled", message: po.id });
        setConfirm(null);
      },
    });

  const closePO = () =>
    setConfirm({
      title: `Close ${po.id}?`,
      message: balance > 0 ? `There is still ${formatINR(balance)} payable. Closing keeps it in the payables ledger.` : "All material received and paid. The PO moves to history.",
      confirmLabel: "Close PO",
      action: () => {
        updatePO(po.id, { status: "Closed" }, "PO closed");
        toast({ tone: "success", title: "PO closed", message: po.id });
        setConfirm(null);
      },
    });

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All purchase orders</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{po.id}</h1>
            <Badge tone={poStatusTone[po.status]}>{po.status}</Badge>
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenSupplier(po.supplierId)}>{po.supplierName}</button>
            {" "}· created {po.created} · delivery by {po.deliveryDate}
            {po.prId && <> · from request {po.prId}</>}
            {po.version && po.version > 1 && <> · version {po.version}</>}
          </p>
        </div>
        <div className="detail-actions">
          {po.status === "Draft" && !approved && canApprove && <Button onClick={approvePO}><Icon name="check" /> Approve PO</Button>}
          {po.status === "Draft" && approved && <Button onClick={sendPO}><Icon name="mail" /> Send to supplier</Button>}
          {po.status !== "Draft" && po.status !== "Cancelled" && (
            <Button variant="ghost" onClick={sendTerms}><Icon name="mail" /> Confirm terms</Button>
          )}
          {revisable && <Button variant="ghost" onClick={() => setReviseOpen(true)}><Icon name="edit" /> Revise PO</Button>}
          {receivable && <Button variant="secondary" onClick={() => setReceiveOpen(true)}><Icon name="layers" /> Receive material</Button>}
          {balance > 0 && po.status !== "Draft" && po.status !== "Cancelled" && (
            <Button variant="secondary" onClick={() => setPayOpen(true)}><Icon name="check" /> Pay supplier</Button>
          )}
          {(po.status === "Received" || po.status === "Partially Received") && (
            <Button variant="secondary" onClick={closePO}>Close PO</Button>
          )}
          {(po.status === "Draft" || po.status === "Sent") && (
            <Button variant="danger" onClick={cancelPO}>Cancel</Button>
          )}
        </div>
      </div>

      {po.status === "Cancelled" && <Alert tone="danger" title="This purchase order was cancelled">It stays in history for the audit trail.</Alert>}
      {po.status === "Draft" && !approved && (
        <Alert tone={canApprove ? "warning" : "info"} title="Awaiting purchase approval">
          {canApprove
            ? "Confirm the transport and credit terms below, then approve the PO. It can only be sent to the supplier once approved."
            : "Only the Purchase Manager or an approving manager can approve this PO. Terms are open for editing until then."}
        </Alert>
      )}
      {approved && (
        <Alert tone="success" title={`Approved by ${po.approvedBy} on ${po.approvedAt}`}>
          Commercial terms are locked at {formatINR(totals.total)}. Any change needs a fresh PO version.
        </Alert>
      )}
      {po.notes && <Alert tone="info" title="Note">{po.notes}</Alert>}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">LINE ITEMS</p><h2>{po.lines.length} line{po.lines.length > 1 ? "s" : ""}</h2></div></div>
            <div className="table-wrap op-table">
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
                <tbody>
                  {po.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="note-cell">{line.description}</td>
                      <td>{line.qty}</td>
                      <td>{formatINR(line.unitPrice)}</td>
                      <td><strong>{formatINR(line.qty * line.unitPrice)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="quote-totals">
              <div><span>Subtotal</span><strong>{formatINR(totals.subtotal)}</strong></div>
              <div><span>Transport & insurance</span><strong>{formatINR(po.transport)}</strong></div>
              <div><span>GST ({po.taxPct}%)</span><strong>{formatINR(totals.tax)}</strong></div>
              <div className="quote-grand"><span>PO total</span><strong>{formatINR(totals.total)}</strong></div>
            </div>
            <div className="detail-list">
              <div><span>Payment terms</span><strong>{po.paymentTerms}</strong></div>
              <div><span>Expected delivery</span><strong>{po.deliveryDate}</strong></div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">TRANSPORT & CREDIT</p><h2>Logistics and payment terms</h2></div>
              {approved && <Badge tone="emerald">Locked on approval</Badge>}
            </div>
            {po.status === "Draft" && !approved ? (
              <div className="grn-line-extra">
                <label className="field">
                  <span className="field-label">Transporter</span>
                  <input
                    placeholder="e.g. Gati Secure Logistics"
                    value={po.transporter ?? ""}
                    onChange={e => updatePO(po.id, { transporter: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Credit period (days)</span>
                  <input
                    className="count-input"
                    inputMode="numeric"
                    placeholder="e.g. 30"
                    value={po.creditDays ?? ""}
                    onChange={e => updatePO(po.id, { creditDays: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                  />
                </label>
              </div>
            ) : (
              <div className="detail-list">
                <div><span>Transporter</span><strong>{po.transporter ?? "Supplier arranged"}</strong></div>
                <div><span>Credit period</span><strong>{po.creditDays ? `${po.creditDays} days` : "As per payment terms"}</strong></div>
              </div>
            )}
            <div className="detail-list">
              <div><span>Transport & insurance charged</span><strong>{formatINR(po.transport)}</strong></div>
              <div><span>Payment terms</span><strong>{po.paymentTerms}</strong></div>
              <div>
                <span>Credit due</span>
                <strong>{po.creditDays ? `${po.creditDays} days from GRN` : "On delivery"}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">SUPPLIER PAYMENTS</p><h2>{formatINR(paid)} paid</h2></div>
              <Badge tone={balance <= 0 ? "emerald" : paid > 0 ? "amber" : "danger"}>
                {balance <= 0 ? "Paid in full" : `${formatINR(balance)} payable`}
              </Badge>
            </div>
            {po.payments.length === 0 ? (
              <p className="muted">No payments yet.</p>
            ) : (
              <div className="detail-list">
                {po.payments.map(p => (
                  <div key={p.id}><span>{p.id} · {p.method} · {p.date}</span><strong>{formatINR(p.amount)}</strong></div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">GOODS RECEIVED</p><h2>{poGrns.length} GRN{poGrns.length === 1 ? "" : "s"}</h2></div></div>
            {poGrns.length === 0 ? (
              <p className="muted">No material received yet.</p>
            ) : (
              <div className="related-list">
                {poGrns.map(g => (
                  <button key={g.id} type="button" onClick={() => onOpenGrn(g.id)}>
                    <span className="doc-icon"><Icon name="layers" /></span>
                    <span>
                      <strong>{g.id}</strong>
                      <small>Received {g.receivedDate}{g.inspector ? ` · ${g.inspector}` : ""}</small>
                    </span>
                    <Badge tone={grnStatusTone[g.status]}>{g.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </section>
          {po.revisions && po.revisions.length > 0 && (
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">REVISION HISTORY</p><h2>{po.revisions.length} superseded version{po.revisions.length === 1 ? "" : "s"}</h2></div>
                <Badge tone="gold">Now at v{po.version ?? 1}</Badge>
              </div>
              <div className="revision-list">
                {po.revisions.map(rev => {
                  const delta = rev.newTotal - rev.previousTotal;
                  return (
                    <article key={rev.version}>
                      <header>
                        <strong>Version {rev.version} → {rev.version + 1}</strong>
                        <Badge tone={delta > 0 ? "danger" : delta < 0 ? "emerald" : "neutral"}>
                          {delta === 0 ? "No value change" : `${delta > 0 ? "+" : "−"}${formatINR(Math.abs(delta))}`}
                        </Badge>
                      </header>
                      <p className="note-cell">{rev.reason}</p>
                      <ul>
                        {rev.changes.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                      <small>
                        {formatINR(rev.previousTotal)} → {formatINR(rev.newTotal)} · revised by {rev.revisedBy} · {rev.revisedOn}
                      </small>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          <section className="panel">
            <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>PO timeline</h2></div></div>
            <Timeline items={po.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
          </section>
        </div>
      </div>

      <SupplierPaymentModal open={payOpen} onClose={() => setPayOpen(false)} poId={po.id} supplierName={po.supplierName} balance={balance} onConfirm={pay} />
      <ReceiveMaterialModal open={receiveOpen} onClose={() => setReceiveOpen(false)} poId={po.id} supplierName={po.supplierName} onConfirm={receive} />
      <RevisePOModal open={reviseOpen} onClose={() => setReviseOpen(false)} po={po} onConfirm={applyRevision} />
      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
