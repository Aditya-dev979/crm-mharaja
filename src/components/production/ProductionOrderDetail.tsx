import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { DailyEntryModal, PlanAdjustModal } from "@/components/production/ProductionModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { productionStatusTone, productionSteps } from "@/data/productionData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProducts } from "@/hooks/useProducts";
import { useProduction } from "@/hooks/useProduction";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { ProductionOrder } from "@/types";

export default function ProductionOrderDetail({
  order,
  onBack,
  onOpenOrder,
  onOpenLots,
  onOpenReturn,
}: {
  order: ProductionOrder;
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenLots: () => void;
  onOpenReturn?: (returnId: string) => void;
}) {
  const { boms, updateProductionOrder, issueMaterials, addLot, materials, lots } = useProduction();
  const { products, logMovement, updateProduct } = useProducts();
  const { orders: salesOrders, updateOrder } = useSales();
  const { can, getControl, currentUser } = useAdmin();
  const { addNotification, logAudit } = useTeam();
  const toast = useToast();
  const [entryOpen, setEntryOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; withRemarks?: boolean; action: (remarks?: string) => void } | null>(null);

  const bom = boms.find(b => b.id === order.bomId);
  const canEdit = can("Production", "Edit");
  const canApprove = can("Production", "Approve");
  const stepIndex = productionSteps.indexOf(order.status);
  const balance = Math.max(0, order.plannedQty - order.producedQty);
  const variance = order.consumption.map(c => ({ ...c, delta: c.actual - c.planned }));
  const cap = getControl("plantAdjustment", 125);

  /* Consumption is booked against the plan when the order moves into QC. */
  const startProduction = () => {
    updateProductionOrder(order.id, { status: "In Production" }, `Production started at ${order.plant}`);
    toast({ tone: "info", title: "Production started", message: `${order.id} · ${order.plant}.` });
  };

  const issue = () => {
    issueMaterials(order.id);
    order.consumption.forEach(c => {
      logMovement({
        sku: order.id, product: c.materialName, type: "Material Issue", qty: c.planned,
        location: "Vapi Plant · Soap Line", note: `Issued to ${order.id} against ${order.bomId ?? "formulation"}`,
      });
    });
    toast({ tone: "success", title: "Material issued", message: `${order.consumption.length} lines reserved for ${order.id}.` });
  };

  const sendToQc = () =>
    setConfirm({
      title: `Send ${order.id} to quality check?`,
      message: (
        <>
          {order.producedQty} of {order.plannedQty} units produced{order.rejectedQty ? `, ${order.rejectedQty} rejected` : ""}.
          Actual consumption is booked now, so the planned-versus-actual variance is final.
        </>
      ),
      confirmLabel: "Send to quality check",
      action: () => {
        /* Actual consumption = planned share of what was actually produced. */
        const ratio = order.plannedQty > 0 ? (order.producedQty + order.rejectedQty) / order.plannedQty : 1;
        updateProductionOrder(
          order.id,
          {
            status: "Quality Check",
            consumption: order.consumption.map(c => ({ ...c, actual: Math.round(c.planned * ratio * 10) / 10 })),
          },
          "Sent to quality check — actual consumption booked",
        );
        toast({ tone: "info", title: "In quality check", message: `${order.id} — Meenal Joshi to verify.` });
        setConfirm(null);
      },
    });

  const complete = () =>
    setConfirm({
      title: `Complete ${order.id} and post to finished goods?`,
      message: (
        <>
          {order.producedQty} unit{order.producedQty === 1 ? "" : "s"} of {order.product} post into the finished-goods ledger as a new FIFO lot,
          traceable back to this production order.
        </>
      ),
      confirmLabel: "Complete & post to stock",
      withRemarks: true,
      action: remarks => {
        const product = products.find(p => p.sku === order.sku);
        /* Cost basis: the product's own cost, else the last lot booked for this SKU. */
        const lastLot = [...lots].filter(l => l.sku === order.sku).sort((a, b) => b.dateRank - a.dateRank)[0];
        const lot = addLot({
          sku: order.sku ?? order.id,
          product: order.product,
          qty: order.producedQty,
          rate: product?.purchasePrice ?? lastLot?.rate ?? 0,
          receivedDate: "08 Mar 2026",
          dateRank: 20260308,
          source: order.id,
          location: "Vapi Plant · FG Warehouse",
          batchNo: order.batchNo,
        });
        logMovement({
          sku: order.sku ?? order.id, product: order.product, type: "Production",
          qty: order.producedQty, location: "Vapi Plant · FG Warehouse",
          note: `Completed from ${order.id} · lot ${lot.id}${order.batchNo ? ` · batch ${order.batchNo}` : ""}${remarks ? ` · ${remarks}` : ""}`,
        });
        if (product) updateProduct(product.id, { stock: product.stock + order.producedQty });
        updateProductionOrder(
          order.id,
          { status: "Completed", postedToStock: true },
          `${order.producedQty} units posted to finished goods · lot ${lot.id}${remarks ? ` — “${remarks}”` : ""}`,
        );
        if (order.orderId && salesOrders.some(o => o.id === order.orderId)) {
          updateOrder(order.orderId, { status: "Ready" }, `${order.id} completed — ${order.producedQty} units ready`);
        }
        addNotification({
          type: "Production Update", priority: "Normal",
          title: `${order.id} completed`,
          message: `${order.producedQty} × ${order.product} posted to finished goods as lot ${lot.id}.`,
          reference: order.id,
          recordRef: { kind: "production", id: order.id },
        });
        logAudit({
          user: currentUser, action: "Production completed", module: "Production",
          record: order.id, newValue: `${order.producedQty} units · lot ${lot.id}`,
        });
        toast({ tone: "success", title: "Posted to finished goods", message: `Lot ${lot.id} · ${order.producedQty} units.` });
        setConfirm(null);
      },
    });

  const hold = () =>
    setConfirm({
      title: `Put ${order.id} on hold?`,
      danger: true,
      message: "Production stops until the hold is released. Issued material stays reserved against this order.",
      confirmLabel: "Put on hold",
      withRemarks: true,
      action: remarks => {
        updateProductionOrder(order.id, { status: "On Hold" }, `Production on hold — “${remarks}”`);
        toast({ tone: "warning", title: "On hold", message: order.id });
        setConfirm(null);
      },
    });

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All production orders</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{order.id}</h1>
            <Badge tone={productionStatusTone[order.status]}>{order.status}</Badge>
            {order.adjustmentPct && <Badge tone="amber">Plan {order.adjustmentPct}%</Badge>}
            {order.sourceReturnId && <Badge tone="royal">Reprocessing</Badge>}
          </div>
          <p className="muted-line">
            {order.product} · {order.plant} · {order.responsible}
            {order.orderId && <> · <button type="button" className="link-btn" onClick={() => onOpenOrder(order.orderId!)}>{order.orderId}</button></>}
            {order.sourceReturnId && onOpenReturn && (
              <> · from return <button type="button" className="link-btn" onClick={() => onOpenReturn(order.sourceReturnId!)}>{order.sourceReturnId}</button></>
            )}
            {order.bomId && <> · {order.bomId}</>}
          </p>
        </div>
        <div className="detail-actions">
          {order.status === "Planned" && canEdit && <Button onClick={issue}><Icon name="layers" /> Issue material</Button>}
          {order.status === "Material Issued" && canEdit && <Button onClick={startProduction}><Icon name="check" /> Start production</Button>}
          {(order.status === "Material Issued" || order.status === "In Production") && canEdit && (
            <Button variant="secondary" onClick={() => setEntryOpen(true)}><Icon name="plus" /> Daily entry</Button>
          )}
          {order.status === "In Production" && canEdit && (
            <Button variant="secondary" onClick={sendToQc} disabled={order.producedQty === 0}>Send to QC</Button>
          )}
          {order.status === "Quality Check" && canApprove && <Button onClick={complete}><Icon name="check" /> Complete & post</Button>}
          {canApprove && order.status !== "Completed" && (
            <Button variant="ghost" onClick={() => setAdjustOpen(true)}><Icon name="shield" /> Adjust plan</Button>
          )}
          {order.status !== "Completed" && order.status !== "On Hold" && canEdit && (
            <Button variant="danger" onClick={hold}>Hold</Button>
          )}
          {order.status === "On Hold" && canEdit && (
            <Button onClick={() => updateProductionOrder(order.id, { status: "In Production" }, "Hold released — production resumed")}>Release hold</Button>
          )}
        </div>
      </div>

      {order.status === "On Hold" && (
        <Alert tone="danger" title="Production is on hold">Release the hold to resume. See the timeline for the reason on record.</Alert>
      )}
      {order.status === "Completed" && (
        <Alert tone="success" title="Completed and posted to finished goods">
          {order.producedQty} units are traceable to this production order.{" "}
          <button type="button" className="link-btn" onClick={onOpenLots}>Open the FIFO lot register</button> to see the lot and its age.
        </Alert>
      )}
      {!canEdit && (
        <Alert tone="info" title="Read-only for your role">Production actions belong to the Plant Manager. You can review progress, consumption and variance.</Alert>
      )}

      <section className="panel">
        <div className="section-head"><div><p className="kicker">PRODUCTION WORKFLOW</p><h2>Plan → finished goods</h2></div></div>
        <Stepper steps={productionSteps} current={Math.max(stepIndex, 0) + (order.status === "Completed" ? 1 : 0)} />
      </section>

      <div className="stat-chips">
        <div className="stat-chip"><span>Planned</span><strong>{order.plannedQty}</strong><small>{order.plannedStart} → {order.plannedComplete}</small></div>
        <div className="stat-chip"><span>Produced</span><strong className="up-text">{order.producedQty}</strong><small>{order.entries.length} daily entries</small></div>
        <div className="stat-chip"><span>Rejected / damaged</span><strong className={order.rejectedQty ? "warning-text" : undefined}>{order.rejectedQty}</strong><small>Recovered material returns to store</small></div>
        <div className="stat-chip"><span>Balance</span><strong>{balance}</strong><small>{balance === 0 ? "Plan met" : "Still to produce"}</small></div>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">MATERIAL CONSUMPTION</p><h2>Planned versus actual</h2></div>
            <div className="head-actions">
              {order.batchNo && <Badge tone="royal">Batch {order.batchNo}</Badge>}
              {order.bomId && <Badge tone="neutral">{order.bomId}{bom ? ` · v${bom.version}` : ""}</Badge>}
            </div>
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead><tr><th>Material</th><th>Supplier lot</th><th>Planned</th><th>Actual</th><th>Variance</th></tr></thead>
              <tbody>
                {variance.map(c => (
                  <tr key={c.materialId}>
                    <td className="note-cell">{c.materialName}</td>
                    <td>{c.issuedLot ? <code>{c.issuedLot}</code> : <span className="muted">Not issued</span>}</td>
                    <td>{c.planned} {c.unit}</td>
                    <td>{c.actual} {c.unit}</td>
                    <td className={c.delta > 0 ? "warning-text" : c.delta < 0 ? "up-text" : undefined}>
                      {c.delta === 0 ? "—" : `${c.delta > 0 ? "+" : ""}${Math.round(c.delta * 10) / 10} ${c.unit}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="detail-list">
            <div>
              <span>Material still reserved</span>
              <strong>
                {order.consumption.filter(c => materials.some(m => m.id === c.materialId)).length} of {order.consumption.length} lines tracked in the material register
              </strong>
            </div>
            <div><span>Plant adjustment ceiling</span><strong>{cap}% of the original plan</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Production timeline</h2></div></div>
          <Timeline items={order.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">DAILY PRODUCTION REPORTS</p><h2>{order.entries.length} entr{order.entries.length === 1 ? "y" : "ies"}</h2></div>
          {(order.status === "Material Issued" || order.status === "In Production") && canEdit && (
            <Button variant="secondary" onClick={() => setEntryOpen(true)}><Icon name="plus" /> Add entry</Button>
          )}
        </div>
        {order.entries.length === 0 ? (
          <p className="muted">No daily entries yet. Each entry updates produced, rejected and balance quantities in real time.</p>
        ) : (
          <div className="table-wrap op-table">
            <table>
              <thead><tr><th>Entry</th><th>Date</th><th>Produced</th><th>Rejected</th><th>Material consumed</th><th>Responsible</th><th>Remarks</th></tr></thead>
              <tbody>
                {order.entries.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.id}</strong></td>
                    <td>{e.date}</td>
                    <td>{e.produced}</td>
                    <td className={e.rejected ? "warning-text" : undefined}>{e.rejected}</td>
                    <td className="note-cell">{e.materialNote}</td>
                    <td>{e.responsible}</td>
                    <td className="note-cell">{e.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DailyEntryModal order={order} open={entryOpen} onClose={() => setEntryOpen(false)} />
      <PlanAdjustModal order={order} open={adjustOpen} onClose={() => setAdjustOpen(false)} />
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
