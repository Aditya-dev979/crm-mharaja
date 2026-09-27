import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import { AmountMethodModal, ProgressModal, SendQuoteModal } from "@/components/workshop/WorkshopModals";
import { SelectField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { inspectionStatusTone } from "@/data/qualityData";
import { customStages, customStageTone, workers } from "@/data/workshopData";
import { useQuality } from "@/hooks/useQuality";
import { useToast } from "@/hooks/useToast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { CustomOrder } from "@/types";
import { formatINR } from "@/utils";

export default function CustomOrderDetail({
  order,
  onBack,
  onOpenCustomer,
  onOpenInspection,
}: {
  order: CustomOrder;
  onBack: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenInspection: (inspectionId: string) => void;
}) {
  const { updateCustomOrder, addCustomPayment, addCustomAttachment } = useWorkshop();
  const { inspections, addInspection } = useQuality();
  const toast = useToast();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [worker, setWorker] = useState(order.worker ?? workers[0]);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const inspection = order.inspectionId ? inspections.find(i => i.id === order.inspectionId) : undefined;
  const stageIndex = order.stage === "Cancelled" ? 0 : customStages.indexOf(order.stage);
  const paid = order.payments.reduce((s, p) => s + p.amount, 0);
  const billable = order.quotedAmount ?? order.estimatedCost;
  const balance = billable - paid;
  const tone = order.attachments[0]?.tone ?? "gold";

  const sendQuote = (amount: number) => {
    updateCustomOrder(order.id, { stage: "Quotation", quotedAmount: amount }, `Quotation ${formatINR(amount)} shared with ${order.customerName}`);
    setQuoteOpen(false);
    toast({ tone: "success", title: "Quotation sent", message: `${order.id} · ${formatINR(amount)}` });
  };

  const markApproved = () => {
    updateCustomOrder(order.id, { stage: "Customer Approval" }, "Design and quotation approved by customer");
    toast({ tone: "success", title: "Customer approved", message: "Collect the advance to start production." });
  };

  const recordAdvance = (amount: number, method: string) => {
    const payment = addCustomPayment(order.id, { amount, method });
    updateCustomOrder(order.id, { stage: "Advance" }, `${payment.id} · advance ${formatINR(amount)} received — ${method.toLowerCase()}`);
    setAdvanceOpen(false);
    toast({ tone: "success", title: "Advance received", message: `${formatINR(amount)} · assign a line operator to start production.` });
  };

  const startProduction = () => {
    updateCustomOrder(order.id, { stage: "Work in Progress", worker }, `Production started — ${worker}`);
    toast({ tone: "success", title: "Production started", message: `${order.id} with ${worker}.` });
  };

  const updateProgress = (progress: number, note: string) => {
    updateCustomOrder(order.id, { progress }, note ? `Progress ${progress}% — ${note}` : `Progress updated to ${progress}%`);
    setProgressOpen(false);
    toast({ tone: "success", title: `Progress ${progress}%`, message: progress >= 100 ? "Ready for quality check." : order.id });
  };

  const sendToQc = () => {
    const created = addInspection(
      {
        sku: order.id,
        product: `${order.productType} · ${order.customerName}`,
        tone,
        source: "Custom order QC",
        reference: order.id,
        date: "Just now",
        status: "Pending",
        weight: order.weightGrams ? `${order.weightGrams} g` : undefined,
        photos: [{ id: `qc-${order.id}`, label: "Finished batch", tone }],
      },
      `Queued from custom order ${order.id}`,
    );
    updateCustomOrder(order.id, { stage: "Quality Check", inspectionId: created.id }, `Sent to quality check — ${created.id}`);
    toast({ tone: "info", title: "In quality check", message: `${created.id} created.` });
    onOpenInspection(created.id);
  };

  const finalBilling = (amount: number, method: string) => {
    const payment = addCustomPayment(order.id, { amount, method });
    const invoiceId = `INV-C${order.id.slice(3)}`;
    updateCustomOrder(order.id, { stage: "Final Billing", finalInvoiceId: invoiceId }, `${payment.id} · balance ${formatINR(amount)} received · ${invoiceId} issued`);
    setBillingOpen(false);
    toast({ tone: "success", title: "Final bill settled", message: `${invoiceId} — hand over when ready.` });
  };

  const markDelivered = () =>
    setConfirm({
      title: `Deliver ${order.id}?`,
      message: <>Confirms {order.customerName} received the finished {order.productType.toLowerCase()}. Aftercare and repairs stay available in the Workshop.</>,
      confirmLabel: "Confirm delivered",
      action: () => {
        updateCustomOrder(order.id, { stage: "Delivered" }, "Delivered to customer");
        toast({ tone: "success", title: "Delivered", message: order.id });
        setConfirm(null);
      },
    });

  const cancel = () =>
    setConfirm({
      title: `Cancel ${order.id}?`,
      danger: true,
      message: "Any advance received must be refunded or converted to a credit note via Returns.",
      confirmLabel: "Cancel custom order",
      action: () => {
        updateCustomOrder(order.id, { stage: "Cancelled" }, "Custom order cancelled");
        toast({ tone: "warning", title: "Custom order cancelled", message: order.id });
        setConfirm(null);
      },
    });

  const specs: Array<[string, string | undefined]> = [
    ["Product type", order.productType],
    ["Base material", order.metal],
    ["Base / key ingredient", order.gemstone],
    ["Weight", order.weightGrams ? `${order.weightGrams} g` : undefined],
    ["Size", order.size],
    ["Dimensions", order.dimensions],
    ["Estimated cost", formatINR(order.estimatedCost)],
    ["Quoted amount", order.quotedAmount ? formatINR(order.quotedAmount) : undefined],
    ["Line operator", order.worker],
    ["Target delivery", order.deliveryDate],
    ["Final invoice", order.finalInvoiceId],
  ];

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All custom orders</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{order.id}</h1>
            <Badge tone={customStageTone[order.stage]}>{order.stage}</Badge>
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenCustomer(order.customerId)}>{order.customerName}</button>
            {" "}· {order.productType} · created {order.created} · delivery {order.deliveryDate}
          </p>
        </div>
        <div className="detail-actions">
          {order.stage === "Artwork Requirement" && <Button onClick={() => setQuoteOpen(true)}><Icon name="component" /> Send quotation</Button>}
          {order.stage === "Quotation" && (
            <>
              <Button variant="secondary" onClick={() => setQuoteOpen(true)}>Revise quotation</Button>
              <Button onClick={markApproved}><Icon name="check" /> Customer approved</Button>
            </>
          )}
          {order.stage === "Customer Approval" && (
            <Button onClick={() => setAdvanceOpen(true)}><Icon name="check" /> Record advance</Button>
          )}
          {order.stage === "Advance" && (
            <Button onClick={startProduction}><Icon name="settings" /> Start production</Button>
          )}
          {order.stage === "Work in Progress" && (
            <>
              <Button variant="secondary" onClick={() => setProgressOpen(true)}><Icon name="sort" /> Update progress</Button>
              <Button onClick={sendToQc} disabled={order.progress < 100}><Icon name="shield" /> Send to quality check</Button>
            </>
          )}
          {order.stage === "Quality Check" && (
            <>
              {inspection && <Button variant="secondary" onClick={() => onOpenInspection(inspection.id)}><Icon name="eye" /> Open {inspection.id}</Button>}
              <Button onClick={() => setBillingOpen(true)} disabled={inspection?.status !== "Approved"}>
                <Icon name="component" /> Final billing
              </Button>
            </>
          )}
          {order.stage === "Final Billing" && <Button onClick={markDelivered}><Icon name="check" /> Mark delivered</Button>}
          {!["Delivered", "Cancelled"].includes(order.stage) && (
            <Button variant="danger" onClick={cancel}>Cancel</Button>
          )}
        </div>
      </div>

      {order.stage === "Cancelled" ? (
        <Alert tone="danger" title="This custom order was cancelled">{paid > 0 ? `Advance of ${formatINR(paid)} to be settled via Returns.` : "No payments were taken."}</Alert>
      ) : (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">ORDER JOURNEY</p><h2>Design → Delivery</h2></div></div>
          <Stepper steps={customStages} current={order.stage === "Delivered" ? customStages.length : stageIndex} />
        </section>
      )}

      {order.stage === "Quality Check" && inspection && inspection.status !== "Approved" && (
        <Alert tone="info" title={`Waiting on quality check ${inspection.id}`}>
          Current status: <Badge tone={inspectionStatusTone[inspection.status]}>{inspection.status}</Badge>. Final billing unlocks once it passes.
        </Alert>
      )}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">DESIGN & SPECIFICATION</p><h2>{order.productType}</h2></div></div>
            <p className="requirement-quote">“{order.designReference}”</p>
            <div className="detail-list">
              {specs.filter(([, v]) => v).map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            <p className="mini-title">DESIGN ATTACHMENTS</p>
            <div className="gallery-thumbs">
              {order.attachments.map(att => (
                <div key={att.id} className="gallery-thumb">
                  <span className="thumb-btn"><GemImage tone={att.tone} size="thumb" label={att.label} /></span>
                  <small className="muted">{att.label}</small>
                </div>
              ))}
              <button
                type="button"
                className="gallery-add"
                onClick={() => {
                  addCustomAttachment(order.id, { label: `Reference ${order.attachments.length + 1}`, tone });
                  toast({ tone: "success", title: "Attachment added" });
                }}
              >
                <Icon name="plus" />
                <span>Add file</span>
              </button>
            </div>
          </section>

          {order.stage === "Advance" && (
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ASSIGN PRODUCTION UNIT</p><h2>Who makes it?</h2></div></div>
              <div className="status-change">
                <SelectField label="Line operator / workshop" value={worker} onChange={e => setWorker(e.target.value)}>
                  {workers.map(w => <option key={w}>{w}</option>)}
                </SelectField>
              </div>
            </section>
          )}

          {(order.stage === "Work in Progress" || order.stage === "Quality Check" || order.progress > 0) && order.stage !== "Cancelled" && (
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">WORK PROGRESS</p><h2>{order.progress}% complete</h2></div>
                {order.worker && <span>{order.worker}</span>}
              </div>
              <div className="progress-line progress-wide"><i style={{ width: `${order.progress}%` }} /></div>
              {order.stage === "Work in Progress" && order.progress < 100 && (
                <div className="note-actions">
                  <Button variant="secondary" onClick={() => setProgressOpen(true)}><Icon name="sort" /> Update progress</Button>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">PAYMENTS</p><h2>{formatINR(paid)} received</h2></div>
              <Badge tone={balance <= 0 && paid > 0 ? "emerald" : paid > 0 ? "amber" : "neutral"}>
                {balance <= 0 && paid > 0 ? "Settled" : `${formatINR(Math.max(balance, 0))} pending`}
              </Badge>
            </div>
            {order.payments.length === 0 ? (
              <p className="muted">No payments yet — advance is collected after customer approval.</p>
            ) : (
              <div className="detail-list">
                {order.payments.map(p => (
                  <div key={p.id}><span>{p.id} · {p.method} · {p.date}</span><strong>{formatINR(p.amount)}</strong></div>
                ))}
              </div>
            )}
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Order timeline</h2></div></div>
            <Timeline items={order.timeline.slice(0, 9).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
          </section>
        </div>
      </div>

      <SendQuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} estimatedCost={order.quotedAmount ?? order.estimatedCost} onConfirm={sendQuote} />
      <AmountMethodModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title={`Record advance — ${order.id}`}
        message={<>Quoted {formatINR(billable)}. Standard advance is 40% before production starts.</>}
        defaultAmount={Math.round(billable * 0.4)}
        max={billable}
        confirmLabel="Record advance"
        onConfirm={recordAdvance}
      />
      <ProgressModal open={progressOpen} onClose={() => setProgressOpen(false)} current={order.progress} onConfirm={updateProgress} />
      <AmountMethodModal
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        icon="component"
        title={`Final billing — ${order.id}`}
        message={<>Quoted {formatINR(billable)} · received {formatINR(paid)}. Collect the balance and issue the final bill.</>}
        defaultAmount={Math.max(balance, 0)}
        max={Math.max(balance, 0)}
        confirmLabel="Collect & issue bill"
        onConfirm={finalBilling}
      />
      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
