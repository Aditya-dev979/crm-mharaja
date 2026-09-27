import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import { CreditNoteModal, RefundModal } from "@/components/quality/QualityModals";
import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { SelectField, TextField } from "@/components/forms/Field";
import { inspectionStatusTone, returnStatusTone, returnSteps } from "@/data/qualityData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProduction } from "@/hooks/useProduction";
import { useProducts } from "@/hooks/useProducts";
import { useTeam } from "@/hooks/useTeam";
import { useQuality } from "@/hooks/useQuality";
import { useSales } from "@/hooks/useSales";
import { useToast } from "@/hooks/useToast";
import type { RefundMethod, ReturnCase, ReturnDisposition } from "@/types";
import { formatINR } from "@/utils";

const stepIndexFor = (ret: ReturnCase) => {
  switch (ret.status) {
    case "Requested": return 0;
    case "Under Inspection": return 1;
    case "Approved": return 2;
    case "Stock Reconciled": return 3;
    case "Refund Processed":
    case "Credit Note Issued": return 5;
    default: return 0;
  }
};

export default function ReturnDetail({
  ret,
  onBack,
  onOpenInspection,
  onOpenCustomer,
  onOpenOrder,
  onOpenProduct,
  onOpenProduction,
}: {
  ret: ReturnCase;
  onBack: () => void;
  onOpenInspection: (inspectionId: string) => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenProduction?: (productionId: string) => void;
}) {
  const { inspections, addInspection, updateReturn, nextCreditNoteId } = useQuality();
  const { products, updateProduct, logMovement } = useProducts();
  const { orders, updateOrder } = useSales();
  const { boms, addProductionOrder } = useProduction();
  const { can, activeRole, currentUser } = useAdmin();
  const { addNotification, logAudit } = useTeam();
  const toast = useToast();
  const [disposition, setDisposition] = useState<ReturnDisposition>(ret.disposition ?? "Usable");
  /* Inspection splits the returned quantity three ways. Kept as strings so the
     fields can be cleared while typing. */
  const [usableInput, setUsableInput] = useState(String(ret.outcome?.usableQty ?? ret.qty));
  const [damagedInput, setDamagedInput] = useState(String(ret.outcome?.damagedQty ?? 0));
  const [rejectedInput, setRejectedInput] = useState(String(ret.outcome?.rejectedQty ?? 0));
  const [refundOpen, setRefundOpen] = useState(false);
  const [cnOpen, setCnOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; withRemarks?: boolean; action: (remarks?: string) => void } | null>(null);
  /* Every movement raised from a return uses the quantity the customer actually
     sent back, never a placeholder. */
  const returnedQty = ret.qty;
  const num = (v: string) => Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10) || 0);
  const usableQty = num(usableInput);
  const damagedQty = num(damagedInput);
  const rejectedQty = num(rejectedInput);
  const splitTotal = usableQty + damagedQty + rejectedQty;
  const splitBalances = splitTotal === returnedQty;
  /* Only units that survived inspection can go back into production. */
  const salvageableQty = ret.outcome ? ret.outcome.usableQty + ret.outcome.damagedQty : returnedQty;
  const [reprocessQtyInput, setReprocessQtyInput] = useState(String(ret.qty));
  const reprocessQty = Math.min(Math.max(Number(reprocessQtyInput.replace(/\D/g, "")) || 0, 0), salvageableQty);

  const inspection = ret.inspectionId ? inspections.find(i => i.id === ret.inspectionId) : undefined;
  const orderInStore = orders.some(o => o.id === ret.orderId);
  const product = ret.productId ? products.find(p => p.id === ret.productId) : undefined;

  const sendToInspection = () => {
    const created = addInspection(
      {
        productId: ret.productId,
        sku: ret.sku,
        product: ret.product,
        tone: ret.tone,
        source: "Sales return",
        reference: ret.id,
        date: "Just now",
        status: "Pending",
        photos: [{ id: `qi-${ret.id}-1`, label: "As received", tone: ret.tone }],
      },
      `Queued from return ${ret.id}`,
    );
    updateReturn(ret.id, { status: "Under Inspection", inspectionId: created.id }, `Sent to quality inspection — ${created.id}`);
    toast({ tone: "info", title: "Sent to inspection", message: `${created.id} created for ${ret.sku}.` });
    onOpenInspection(created.id);
  };

  const approveReturn = () =>
    setConfirm({
      title: `Approve ${ret.id}?`,
      message: <>Inspection {inspection?.id} passed. Approval moves the return to stock reconciliation.</>,
      confirmLabel: "Approve return",
      action: () => {
        updateReturn(ret.id, { status: "Approved" }, "Return approved after inspection");
        toast({ tone: "success", title: "Return approved", message: ret.id });
        setConfirm(null);
      },
    });

  const rejectReturn = () =>
    setConfirm({
      title: `Reject ${ret.id}?`,
      danger: true,
      message: "The item goes back to the customer and no refund or credit is issued. The case stays in history.",
      confirmLabel: "Reject return",
      action: () => {
        updateReturn(ret.id, { status: "Rejected" }, "Return rejected");
        if (orderInStore) updateOrder(ret.orderId, {}, `Return ${ret.id} rejected`);
        toast({ tone: "warning", title: "Return rejected", message: ret.id });
        setConfirm(null);
      },
    });

  const reconcileStock = () =>
    setConfirm({
      title: `Reconcile stock for ${ret.id}?`,
      message: product ? (
        <>Marks {product.sku} as Returned, restores its stock and posts a Return movement to the inventory ledger.</>
      ) : (
        <>Posts a Return movement to the inventory ledger. The item is not in the live catalogue, so no product status changes.</>
      ),
      confirmLabel: "Reconcile stock",
      action: () => {
        if (product) {
          updateProduct(product.id, { status: "Returned", stock: product.stock + returnedQty }, `Returned by customer — ${ret.id} · ${returnedQty} unit${returnedQty === 1 ? "" : "s"}`);
        }
        logMovement({ sku: ret.sku, product: ret.product, type: "Return", qty: returnedQty, location: "Vapi Plant · Bonded Store", note: `Customer return ${ret.id} reconciled · ${returnedQty} unit${returnedQty === 1 ? "" : "s"}` });
        updateReturn(ret.id, { status: "Stock Reconciled" }, "Stock reconciled — item back under shop control");
        if (orderInStore) updateOrder(ret.orderId, {}, `Return ${ret.id} — stock reconciled`);
        toast({ tone: "success", title: "Stock reconciled", message: `${ret.sku} posted to the inventory ledger.` });
        setConfirm(null);
      },
    });

  /* Disposition decides whether returned goods can go back into production as
     raw material. Reprocessing creates a real production order linked to this
     return, so the material stays traceable both ways. */
  /* The headline disposition follows the largest share, so existing badges and
     filters keep working while the real split is stored alongside. */
  const dominantDisposition = (): ReturnDisposition => {
    if (usableQty >= damagedQty && usableQty >= rejectedQty) return "Usable";
    return damagedQty >= rejectedQty ? "Damaged" : "Rejected";
  };

  const saveDisposition = () => {
    if (!splitBalances) {
      toast({
        tone: "error",
        title: "Quantities do not balance",
        message: `Usable + damaged + rejected must equal the ${returnedQty} unit(s) returned — currently ${splitTotal}.`,
      });
      return;
    }
    const headline = dominantDisposition();
    updateReturn(
      ret.id,
      {
        disposition: headline,
        dispositionBy: currentUser,
        outcome: {
          usableQty,
          damagedQty,
          rejectedQty,
          inspectedBy: currentUser,
          inspectedOn: "Just now",
        },
      },
      `Inspection outcome recorded — ${usableQty} usable, ${damagedQty} damaged, ${rejectedQty} rejected`,
    );
    logAudit({
      user: currentUser,
      action: "Return inspection outcome recorded",
      module: "Returns",
      record: `${ret.id} · ${ret.sku}`,
      newValue: `${usableQty} usable / ${damagedQty} damaged / ${rejectedQty} rejected of ${returnedQty}`,
    });
    toast({
      tone: "success",
      title: "Inspection outcome saved",
      message: `${usableQty} usable · ${damagedQty} damaged · ${rejectedQty} rejected of ${returnedQty}.`,
    });
  };

  /* The quantity sent to production defaults to everything returned and can be
     trimmed when only part of the consignment is salvageable. */
  const ReprocessQtyField = () => (
    <>
      <div className="summary-row"><span>Returned by the customer</span><strong>{returnedQty} unit{returnedQty === 1 ? "" : "s"}</strong></div>
      {ret.outcome && (
        <div className="summary-row">
          <span>Cleared by inspection</span>
          <strong>
            {ret.outcome.usableQty} usable + {ret.outcome.damagedQty} damaged = {salvageableQty} salvageable
            {ret.outcome.rejectedQty > 0 ? ` · ${ret.outcome.rejectedQty} written off` : ""}
          </strong>
        </div>
      )}
      <TextField
        label="Quantity to reprocess" required inputMode="numeric"
        helper={`Between 1 and ${salvageableQty}. The production order and the material issue both use this quantity.`}
        value={reprocessQtyInput}
        onChange={e => setReprocessQtyInput(e.target.value.replace(/\D/g, ""))}
      />
      {reprocessQty !== returnedQty && reprocessQty > 0 && (
        <p className="muted">{returnedQty - reprocessQty} unit{returnedQty - reprocessQty === 1 ? "" : "s"} stay in the bonded store under the recorded disposition.</p>
      )}
    </>
  );

  const reprocess = () => {
    const bom = boms.find(b => b.sku === ret.sku) ?? boms[0];
    setReprocessQtyInput(String(returnedQty));
    setConfirm({
      title: `Reprocess ${ret.sku} into production?`,
      message: (
        <>
          <p>
            A production order is created against this return{bom ? ` using ${bom.id}` : ""}.
            Returned stock leaves finished goods and becomes input material — it does not stay counted as sellable stock.
          </p>
          <ReprocessQtyField />
        </>
      ),
      confirmLabel: "Create production order",
      withRemarks: true,
      action: remarks => {
        const created = addProductionOrder(
          {
            product: `${ret.product} · reprocessed`,
            sku: ret.sku,
            sourceReturnId: ret.id,
            bomId: bom?.id,
            plannedQty: reprocessQty,
            plannedStart: "09 Mar 2026",
            plannedComplete: "20 Mar 2026",
            plant: "Vapi Plant · Soap Line",
            responsible: "Vikram Singh",
            consumption: bom
              ? bom.lines.map(l => ({ materialId: l.materialId, materialName: l.materialName, unit: l.unit, planned: l.qtyPerUnit, actual: 0 }))
              : [],
          },
          `Created from return ${ret.id} — “${remarks}”`,
        );
        updateReturn(ret.id, { reprocessOrderId: created.id, reprocessQty }, `Reprocessing approved — ${reprocessQty} of ${returnedQty} unit${returnedQty === 1 ? "" : "s"} to production order ${created.id}`);
        if (product) {
          updateProduct(product.id, { status: "Under Inspection" }, `Sent for reprocessing under ${created.id}`);
        }
        logMovement({
          sku: ret.sku, product: ret.product, type: "Material Issue", qty: reprocessQty,
          location: "Vapi Plant · Soap Line", note: `Returned goods issued to ${created.id} from ${ret.id}`,
        });
        addNotification({
          type: "Production Update", priority: "Normal",
          title: `${created.id} raised from return ${ret.id}`,
          message: `${ret.product} goes back through production. ${remarks ?? ""}`.trim(),
          reference: created.id,
          recordRef: { kind: "production", id: created.id },
        });
        logAudit({
          user: currentUser, action: "Return reprocessing approved", module: "Returns",
          record: `${ret.id} · ${created.id}`, newValue: remarks ?? "",
        });
        toast({ tone: "success", title: "Reprocessing started", message: `${created.id} created from ${ret.id}.` });
        setConfirm(null);
        onOpenProduction?.(created.id);
      },
    });
  };

  const processRefund = (method: RefundMethod, amount: number, reference: string) => {
    updateReturn(
      ret.id,
      {
        status: "Refund Processed",
        refund: { method, amount, reference, approvedBy: "Arjun Sharma", completedAt: "Just now" },
      },
      `Refund of ${formatINR(amount)} completed — ${reference}`,
    );
    if (orderInStore) updateOrder(ret.orderId, {}, `Refund ${formatINR(amount)} processed for ${ret.id}`);
    setRefundOpen(false);
    toast({ tone: "success", title: "Refund completed", message: `${formatINR(amount)} to ${ret.customerName} · ${reference}` });
  };

  const issueCreditNote = (amount: number, validUntil: string) => {
    const id = nextCreditNoteId();
    updateReturn(
      ret.id,
      { status: "Credit Note Issued", creditNote: { id, amount, issuedAt: "Just now", validUntil } },
      `Credit note ${id} issued for ${formatINR(amount)}`,
    );
    if (orderInStore) updateOrder(ret.orderId, {}, `Credit note ${id} issued for ${ret.id}`);
    setCnOpen(false);
    toast({ tone: "success", title: "Credit note issued", message: `${id} · ${formatINR(amount)} · valid until ${validUntil}` });
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All returns</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{ret.id}</h1>
            <Badge tone={returnStatusTone[ret.status]}>{ret.status}</Badge>
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenCustomer(ret.customerId)}>{ret.customerName}</button>
            {" "}· order {orderInStore ? (
              <button type="button" className="link-btn" onClick={() => onOpenOrder(ret.orderId)}>{ret.orderId}</button>
            ) : ret.orderId}
            {" "}· requested {ret.requested} · <strong>{returnedQty} unit{returnedQty === 1 ? "" : "s"}</strong>
            {ret.reprocessQty !== undefined && <> · {ret.reprocessQty} to reprocessing</>}
          </p>
        </div>
        <div className="detail-actions">
          {ret.status === "Requested" && (
            <>
              <Button variant="danger" onClick={rejectReturn}>Reject return</Button>
              <Button onClick={sendToInspection}><Icon name="shield" /> Send to inspection</Button>
            </>
          )}
          {ret.status === "Under Inspection" && (
            <>
              {inspection && (
                <Button variant="secondary" onClick={() => onOpenInspection(inspection.id)}>
                  <Icon name="eye" /> Open {inspection.id}
                </Button>
              )}
              <Button variant="danger" onClick={rejectReturn}>Reject return</Button>
              <Button onClick={approveReturn} disabled={inspection?.status !== "Approved"}>
                <Icon name="check" /> Approve return
              </Button>
            </>
          )}
          {ret.status === "Approved" && (
            <Button onClick={reconcileStock}><Icon name="layers" /> Reconcile stock</Button>
          )}
          {ret.status === "Stock Reconciled" && (
            <>
              <Button variant="secondary" onClick={() => setCnOpen(true)}><Icon name="component" /> Issue credit note</Button>
              <Button onClick={() => setRefundOpen(true)}><Icon name="check" /> Process refund</Button>
            </>
          )}
        </div>
      </div>

      {ret.status === "Under Inspection" && inspection && inspection.status !== "Approved" && (
        <Alert tone="info" title={`Waiting on inspection ${inspection.id}`}>
          Current inspection status: <Badge tone={inspectionStatusTone[inspection.status]}>{inspection.status}</Badge>. Approval unlocks once it passes.
        </Alert>
      )}
      {ret.status === "Rejected" && (
        <Alert tone="danger" title="This return was rejected">The item stays with the customer. A repair was offered where applicable.</Alert>
      )}

      {ret.status !== "Rejected" && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">RETURN JOURNEY</p><h2>Request → Refund / Credit Note</h2></div></div>
          <Stepper steps={returnSteps} current={stepIndexFor(ret)} />
        </section>
      )}

      {["Stock Reconciled", "Refund Processed", "Credit Note Issued"].includes(ret.status) && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">DISPOSITION & REPROCESSING</p><h2>What happens to the returned goods</h2></div>
            {ret.disposition && <Badge tone={ret.disposition === "Usable" ? "emerald" : ret.disposition === "Damaged" ? "amber" : "danger"}>{ret.disposition}</Badge>}
          </div>
          {ret.reprocessOrderId ? (
            <Alert tone="success" title={`Reprocessing under ${ret.reprocessOrderId}`}>
              The returned stock was issued to production as input material and is no longer counted as sellable finished goods.{" "}
              {onOpenProduction && (
                <button type="button" className="link-btn" onClick={() => onOpenProduction(ret.reprocessOrderId!)}>
                  Open {ret.reprocessOrderId}
                </button>
              )}
            </Alert>
          ) : (
            <>
              <p className="muted-line">
                Split the {returnedQty} unit{returnedQty === 1 ? "" : "s"} the customer sent back by the condition each
                one arrived in. Usable stock can be re-sold, damaged stock can be reprocessed, and rejected stock is
                written off — so the three figures must add up to what was returned.
              </p>
              <div className="return-split">
                <TextField
                  label="Usable" inputMode="numeric" value={usableInput}
                  helper="Fit to sell again"
                  onChange={e => setUsableInput(e.target.value.replace(/\D/g, ""))}
                />
                <TextField
                  label="Damaged" inputMode="numeric" value={damagedInput}
                  helper="Salvageable through reprocessing"
                  onChange={e => setDamagedInput(e.target.value.replace(/\D/g, ""))}
                />
                <TextField
                  label="Rejected" inputMode="numeric" value={rejectedInput}
                  helper="Written off, not recoverable"
                  onChange={e => setRejectedInput(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className={splitBalances ? "split-balance ok" : "split-balance off"}>
                <span>
                  {usableQty} + {damagedQty} + {rejectedQty} = <strong>{splitTotal}</strong> of {returnedQty} returned
                </span>
                <strong>
                  {splitBalances
                    ? "Balanced — outcome can be saved"
                    : splitTotal > returnedQty
                      ? `${splitTotal - returnedQty} unit(s) over the returned quantity`
                      : `${returnedQty - splitTotal} unit(s) still unaccounted`}
                </strong>
              </div>
              <div className="modal-field-row">
                <SelectField
                  label="Headline disposition"
                  helper="Follows the largest share above; override it if the exception matters more than the majority."
                  value={disposition}
                  onChange={e => setDisposition(e.target.value as ReturnDisposition)}
                >
                  <option>Usable</option>
                  <option>Damaged</option>
                  <option>Rejected</option>
                </SelectField>
                <div className="field" style={{ justifyContent: "flex-end" }}>
                  <Button variant="secondary" onClick={saveDisposition}>Save disposition</Button>
                </div>
              </div>
              <div className="detail-list">
                <div>
                  <span>Inventory impact if reprocessed</span>
                  <strong>
                    −{returnedQty} {ret.sku} from finished goods · +{returnedQty} input to a new production order
                  </strong>
                </div>
                <div><span>Quantity returned</span><strong>{returnedQty} unit{returnedQty === 1 ? "" : "s"}</strong></div>
                {ret.reprocessQty !== undefined && (
                  <div><span>Approved for reprocessing</span><strong>{ret.reprocessQty} of {returnedQty}</strong></div>
                )}
                <div><span>Decision recorded by</span><strong>{ret.dispositionBy ?? "Meenal Joshi · Quality"}</strong></div>
              </div>
              {disposition !== "Rejected" ? (
                can("Returns", "Approve") ? (
                  <div className="note-actions">
                    <Button onClick={reprocess}><Icon name="layers" /> Reprocess into production</Button>
                  </div>
                ) : (
                  <Alert tone="info" title="Manager approval required">
                    {activeRole} can record the disposition, but reprocessing into production needs an approving manager.
                  </Alert>
                )
              ) : (
                <Alert tone="warning" title="Rejected goods are not reprocessed">
                  Write the item off through an inventory adjustment instead — it must not re-enter usable stock.
                </Alert>
              )}
            </>
          )}
        </section>
      )}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">RETURNED ITEM</p><h2>{ret.sku}</h2></div></div>
            <div className="quote-line">
              {ret.productId ? (
                <button type="button" className="thumb-btn" onClick={() => onOpenProduct(ret.productId!)} aria-label={`View ${ret.sku}`}>
                  <GemImage tone={ret.tone} size="thumb" />
                </button>
              ) : (
                <GemImage tone={ret.tone} size="thumb" />
              )}
              <div className="quote-line-name">
                <strong>{ret.product}</strong>
                <small>{ret.sku}{product ? ` · currently ${product.status}` : " · not in the live catalogue"}</small>
              </div>
              <span className="return-qty"><strong>{returnedQty}</strong><small>unit{returnedQty === 1 ? "" : "s"} returned</small></span>
              <strong className="quote-line-total">{formatINR(ret.amount)}</strong>
            </div>
            <p className="requirement-quote">“{ret.reason}”</p>
            {inspection && (
              <div className="detail-list">
                <div>
                  <span>Inspection</span>
                  <strong>
                    <button type="button" className="link-btn" onClick={() => onOpenInspection(inspection.id)}>{inspection.id}</button>
                    {" "}· <Badge tone={inspectionStatusTone[inspection.status]}>{inspection.status}</Badge>
                  </strong>
                </div>
              </div>
            )}
          </section>

          {ret.refund && (
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">REFUND</p><h2>{formatINR(ret.refund.amount)} refunded</h2></div>
                <Badge tone="emerald">Completed</Badge>
              </div>
              <div className="detail-list">
                <div><span>Method</span><strong>{ret.refund.method}</strong></div>
                <div><span>Transaction reference</span><strong>{ret.refund.reference}</strong></div>
                <div><span>Approved by</span><strong>{ret.refund.approvedBy}</strong></div>
                <div><span>Completed</span><strong>{ret.refund.completedAt}</strong></div>
              </div>
            </section>
          )}

          {ret.creditNote && (
            <section className="panel quote-doc">
              <div className="invoice-head">
                <Brand />
                <div className="invoice-meta">
                  <strong>CREDIT NOTE {ret.creditNote.id}</strong>
                  <small>Issued {ret.creditNote.issuedAt} · valid until {ret.creditNote.validUntil}</small>
                  <small>Against return {ret.id} · order {ret.orderId}</small>
                </div>
              </div>
              <div className="invoice-billto">
                <p className="mini-title">ISSUED TO</p>
                <strong>{ret.customerName}</strong>
                <small>{ret.product} · {ret.sku}</small>
              </div>
              <div className="quote-totals">
                <div className="quote-grand"><span>Credit value</span><strong>{formatINR(ret.creditNote.amount)}</strong></div>
              </div>
              <p className="muted invoice-terms">
                Redeemable against any purchase at Maharaja Soap before the validity date. Not exchangeable for cash. Present this note or quote {ret.creditNote.id} at billing.
              </p>
              <div className="note-actions">
                <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Preparing PDF", message: `${ret.creditNote!.id}.pdf (demo)` })}>
                  <Icon name="upload" /> Download credit note
                </Button>
              </div>
            </section>
          )}
        </div>

        <section className="panel">
          <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Return timeline</h2></div></div>
          <Timeline items={ret.timeline.slice(0, 9).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      <RefundModal open={refundOpen} onClose={() => setRefundOpen(false)} ret={ret} onConfirm={processRefund} />
      <CreditNoteModal open={cnOpen} onClose={() => setCnOpen(false)} ret={ret} onConfirm={issueCreditNote} />
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          withRemarks={confirm.withRemarks}
          remarksLabel="Manager remarks"
          remarksRequired={confirm.withRemarks}
          onConfirm={confirm.action}
        />
      )}
    </div>
  );
}
