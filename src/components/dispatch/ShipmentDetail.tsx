import { useState } from "react";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Checkbox from "@/components/forms/Checkbox";
import Modal from "@/components/feedback/Modal";
import { GatePassModal } from "@/components/inventory/GatePassHub";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { ConfirmDispatchModal, FailDeliveryModal, PodModal } from "@/components/dispatch/DispatchModals";
import { useSendComm } from "@/components/dispatch/useSendComm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { commTemplates, dispatchJourney, dispatchStatusTone } from "@/data/dispatchData";
import { useAdmin } from "@/hooks/useAdmin";
import { useDispatch } from "@/hooks/useDispatch";
import { useInventory } from "@/hooks/useInventory";
import { useProduction } from "@/hooks/useProduction";
import { usePostSales } from "@/hooks/usePostSales";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { ProofOfDelivery, Shipment, TransportDetails } from "@/types";

const journeyIndex: Record<string, number> = {
  "Ready to Dispatch": 0,
  Packing: 1,
  Dispatched: 2,
  "In Transit": 3,
  Delivered: 5,
};

export default function ShipmentDetail({
  shipment,
  onBack,
  onOpenOrder,
  onOpenCustomer,
}: {
  shipment: Shipment;
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}) {
  const { updateShipment, toggleChecklist } = useDispatch();
  const { orders, updateOrder } = useSales();
  const { consumeFifo, lots } = useProduction();
  const { logMovement } = useProducts();
  const { feedback, addFeedback } = usePostSales();
  const { gatePasses } = useInventory();
  const { logAudit, addNotification } = useTeam();
  const { can, currentUser, activeRole } = useAdmin();
  /* Dispatch actions move stock and close the customer's order, so they follow
     the same permission model as every other operational module. */
  const canDispatch = can("Dispatch", "Edit");
  const canApproveDispatch = can("Dispatch", "Approve");
  const sendComm = useSendComm();
  const toast = useToast();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [podOpen, setPodOpen] = useState(false);
  const [challanOpen, setChallanOpen] = useState(false);
  const [gatePassOpen, setGatePassOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const order = orders.find(o => o.id === shipment.orderId);
  const packed = shipment.checklist.every(item => item.done);
  const packingActive = shipment.status === "Ready to Dispatch" || shipment.status === "Packing";

  const notifyCustomer = (templateId: string, referenceOverride?: string) => {
    const template = commTemplates.find(t => t.id === templateId);
    if (!template) return;
    sendComm({
      channel: "WhatsApp",
      templateName: template.name,
      body: template.body,
      partyKind: "Customer",
      partyId: shipment.customerId,
      partyName: shipment.customerName,
      reference: referenceOverride ?? shipment.orderId,
    });
  };

  const startPacking = () => {
    updateShipment(shipment.id, { status: "Packing" }, "Packing started at the packing bay");
    addNotification({
      type: "Dispatch due", priority: "Normal",
      title: `${shipment.id} is being packed`,
      message: `${shipment.customerName} · ${shipment.orderId} — dispatch is due once packing clears.`,
      reference: shipment.id,
      recordRef: { kind: "shipment", id: shipment.id },
    });
    toast({ tone: "info", title: "Packing started", message: "Work through the checklist, then confirm dispatch." });
  };

  const confirmDispatch = (courier: string, tracking: string, expected: string, notify: boolean, transport: TransportDetails) => {
    updateShipment(
      shipment.id,
      { status: "Dispatched", courier, tracking, dispatchDate: "Just now", expectedDelivery: expected, transport },
      `Dispatched via ${transport.transporter} · LR ${transport.lrNumber}${transport.vehicle ? ` · ${transport.vehicle}` : ""}`,
    );
    if (order) {
      updateOrder(order.id, { status: "Dispatched", courier, tracking, expectedDelivery: expected }, `Dispatched via ${courier} · LR ${transport.lrNumber}`);
      /* Dispatch from controlled inventory reduces stock, FIFO-first. */
      order.lines.forEach(line => {
        const taken = consumeFifo(line.sku, line.qty);
        logMovement({
          sku: line.sku, product: line.name, type: "Dispatch", qty: -line.qty,
          location: "Vapi Plant · FG Warehouse",
          note: taken.length
            ? `${order.id} · LR ${transport.lrNumber} · FIFO ${taken.map(t => `${t.qty} from ${t.lotId}`).join(", ")}`
            : `${order.id} · LR ${transport.lrNumber}`,
        });
      });
      logAudit({
        user: currentUser, action: "Stock reduced on dispatch", module: "Dispatch",
        record: `${order.id} · ${shipment.id}`, newValue: `LR ${transport.lrNumber} · ${transport.transporter}`,
      });
      addNotification({
        type: "Stock Status Update", priority: "Normal",
        title: `Stock reduced against ${order.id}`,
        message: `${order.lines.reduce((n, l) => n + l.qty, 0)} unit(s) issued FIFO on ${shipment.id}.`,
        reference: order.id,
        recordRef: { kind: "order", id: order.id },
      });
    }
    addNotification({
      type: "Dispatch Update", priority: "Normal",
      title: `${shipment.id} dispatched`,
      message: `${shipment.customerName} · ${transport.transporter} · LR ${transport.lrNumber} · expected ${expected}.`,
      reference: shipment.id,
      recordRef: { kind: "shipment", id: shipment.id },
    });
    /* Reference rule: a dispatched consignment tells the buyer its LR number. */
    if (notify) notifyCustomer("tpl-dispatch", `${shipment.orderId} · LR ${transport.lrNumber} · ${transport.transporter}`);
    setDispatchOpen(false);
    toast({ tone: "success", title: "Package dispatched", message: `${shipment.id} · ${transport.transporter} · LR ${transport.lrNumber}${notify ? " · customer notified" : ""}` });
  };

  const issueChallan = () => {
    if (!order) return;
    const challan = {
      id: `DC-${2600 + parseInt(shipment.id.replace(/\D/g, "").slice(-2) || "1", 10)}`,
      orderId: order.id,
      invoiceId: order.invoiceId,
      issuedOn: "08 Mar 2026",
      issuedBy: shipment.coordinator ?? "Suresh Yadav",
      lines: order.lines.map(l => ({ description: `${l.name} (${l.sku})`, qty: l.qty })),
      status: "Issued" as const,
    };
    updateShipment(shipment.id, { challan }, `Delivery challan ${challan.id} issued against ${order.id}`);
    logAudit({
      user: challan.issuedBy, action: "Delivery challan issued", module: "Dispatch",
      record: `${challan.id} · ${order.id}`, newValue: `${challan.lines.length} line(s)`,
    });
    toast({ tone: "success", title: `${challan.id} issued`, message: `Linked to ${order.id}${order.invoiceId ? ` and ${order.invoiceId}` : ""}.` });
  };

  const markInTransit = () => {
    updateShipment(shipment.id, { status: "In Transit" }, "Courier hub scan — in transit");
    toast({ tone: "info", title: "In transit", message: shipment.id });
  };

  /* A delivery is only proved by a named receiver, so the status change is
     driven by the proof of delivery rather than a bare confirmation. The
     challan is acknowledged in the same step, which is what the signed copy
     coming back from site actually means. */
  const recordPod = (pod: ProofOfDelivery) => {
    const short = pod.condition === "Short received" || pod.condition === "Damaged on arrival";
    updateShipment(
      shipment.id,
      {
        status: "Delivered",
        pod,
        challan: shipment.challan ? { ...shipment.challan, status: "Acknowledged" } : shipment.challan,
      },
      `Delivered — received by ${pod.receivedBy} on ${pod.receivedOn} · ${pod.condition}`,
    );
    if (order) updateOrder(order.id, { status: "Delivered" }, `Delivered — POD signed by ${pod.receivedBy}`);
    logAudit({
      user: currentUser,
      action: "Proof of delivery recorded",
      module: "Dispatch",
      record: `${shipment.id} · ${shipment.orderId}`,
      newValue: `${pod.receivedBy} · ${pod.condition}${pod.shortQty ? ` · ${pod.shortQty} unit(s) short` : ""}`,
    });
    addNotification({
      type: short ? "Sales Return Update" : "Dispatch Update",
      priority: short ? "High" : "Normal",
      title: short ? `${shipment.id} delivered with a discrepancy` : `${shipment.id} delivered`,
      message: `${shipment.customerName} · received by ${pod.receivedBy} · ${pod.condition}${short ? " — raise a return or credit note." : ""}`,
      reference: shipment.id,
      recordRef: { kind: "shipment", id: shipment.id },
    });
    notifyCustomer("tpl-delivery");
    setPodOpen(false);
    toast({
      tone: short ? "warning" : "success",
      title: short ? "Delivered with a discrepancy" : "Delivered",
      message: `${shipment.id} · POD by ${pod.receivedBy}. Delivery message queued on WhatsApp.`,
    });
  };

  const markDelivered = () => setPodOpen(true);

  const failDelivery = (reason: string) => {
    updateShipment(shipment.id, { status: "Failed", failReason: reason }, `Delivery failed — ${reason}`);
    setFailOpen(false);
    toast({ tone: "warning", title: "Delivery failed", message: shipment.id });
  };

  const retryDispatch = () => {
    updateShipment(shipment.id, { status: "Dispatched", failReason: undefined }, "Redelivery scheduled with the courier");
    toast({ tone: "info", title: "Redelivery scheduled", message: `${shipment.id} is back with ${shipment.courier ?? "the courier"}.` });
  };

  const returnToStore = () =>
    setConfirm({
      title: `Return ${shipment.id} to store?`,
      danger: true,
      message: <>The package comes back to the warehouse. Handle any customer return through Quality &amp; Returns.</>,
      confirmLabel: "Return to store",
      action: () => {
        updateShipment(shipment.id, { status: "Returned" }, "Package returned to store");
        setConfirm(null);
        toast({ tone: "warning", title: "Returned to store", message: shipment.id });
      },
    });

  const existingFeedback = feedback.find(f => f.shipmentId === shipment.id || f.orderId === shipment.orderId);

  /* Requesting feedback opens the post-sales record, so the ask is tracked
     rather than being a one-off message. */
  const requestFeedback = () => {
    notifyCustomer("tpl-feedback");
    if (existingFeedback) {
      updateShipment(shipment.id, {}, `Feedback reminder sent on WhatsApp · ${existingFeedback.id}`);
      toast({ tone: "info", title: "Reminder sent", message: `${existingFeedback.id} is already open for ${shipment.customerName}.` });
      return;
    }
    const created = addFeedback({
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      orderId: shipment.orderId,
      shipmentId: shipment.id,
      awaitingResponse: true,
      rating: 0,
      channel: "WhatsApp",
      comment: "Feedback requested after delivery — awaiting the customer's response.",
    });
    updateShipment(shipment.id, {}, `Feedback request sent on WhatsApp · ${created.id} opened`);
    addNotification({
      type: "Customer Feedback", priority: "Normal",
      title: `${created.id} awaiting response`,
      message: `${shipment.customerName} was asked for feedback on ${shipment.orderId}.`,
      reference: created.id,
      recordRef: { kind: "feedback", id: created.id },
    });
    logAudit({
      user: currentUser, action: "Feedback requested", module: "Post-Sales",
      record: created.id, newValue: `${shipment.id} · ${shipment.customerName}`,
    });
    toast({ tone: "success", title: "Feedback requested", message: `${created.id} opened in Post-Sales for ${shipment.customerName}.` });
  };

  /* Anything that leaves the plant alongside the consignment without being
     billed — sample cartons, display stock — needs its own gate pass. */
  const linkedPasses = gatePasses.filter(g => g.reference === shipment.id);
  const gatePassPrefill = {
    kind: "Finished Goods" as const,
    item: order?.lines[0]?.name ?? shipment.packageType,
    sku: order?.lines[0]?.sku,
    qty: "1",
    unit: "carton",
    issuedTo: `${shipment.customerName} (with consignment ${shipment.id})`,
    purpose: "Sample carton with dispatch",
    requestedBy: shipment.coordinator ?? "Suresh Yadav",
    remarks: `Travels with ${shipment.id} against ${shipment.orderId}. Not billed — returnable if unsold.`,
    reference: shipment.id,
  };

  /* Dispatch plan: what is going out, how much, and which FIFO lots it will be
     drawn from. Reads the order lines and the existing FIFO lot store — the
     allocation shown here is the same oldest-first rule confirm-dispatch uses. */
  const dispatchPlan = (order?.lines ?? []).map(line => {
    const eligible = lots
      .filter(l => l.sku === line.sku && l.remaining > 0)
      .sort((a, b) => a.dateRank - b.dateRank);
    let left = line.qty;
    const allocation: Array<{ lot: typeof eligible[number]; take: number }> = [];
    for (const lot of eligible) {
      if (left <= 0) break;
      const take = Math.min(lot.remaining, left);
      left -= take;
      allocation.push({ lot, take });
    }
    const available = eligible.reduce((sum, l) => sum + l.remaining, 0);
    return { line, allocation, available, shortfall: Math.max(0, left) };
  });
  const totalShortfall = dispatchPlan.reduce((n, r) => n + r.shortfall, 0);

  /* One row per step of the canonical journey, each with its owner, date and
     the document it produced. */
  const gatePass = linkedPasses[0];
  const feedbackRecord = feedback.find(f => f.shipmentId === shipment.id || f.orderId === shipment.orderId);
  const packedCount = shipment.checklist.filter(i => i.done).length;
  const idx = journeyIndex[shipment.status] ?? 0;
  const journeySteps: Array<{
    label: string; owner: string; date: string; reference: string;
    done: boolean; current: boolean; state: string; onOpen?: () => void;
  }> = [
    {
      label: "Sales order", owner: order?.executive ?? "Sales", date: order?.created ?? shipment.created,
      reference: shipment.orderId, done: true, current: false, state: "Confirmed",
      onOpen: () => onOpenOrder(shipment.orderId),
    },
    {
      label: "Shipment raised", owner: shipment.coordinator ?? "Suresh Yadav", date: shipment.created,
      reference: shipment.id, done: true, current: false, state: "Created",
    },
    {
      label: "Packing", owner: shipment.coordinator ?? "Suresh Yadav",
      date: shipment.status === "Ready to Dispatch" ? "—" : shipment.created,
      reference: `${packedCount} of ${shipment.checklist.length} checks`,
      done: packed, current: shipment.status === "Packing",
      state: packed ? "Complete" : shipment.status === "Packing" ? "In progress" : "Not started",
    },
    {
      label: "Delivery challan", owner: shipment.challan?.issuedBy ?? "Dispatch",
      date: shipment.challan?.issuedOn ?? "—", reference: shipment.challan?.id ?? "Not issued",
      done: Boolean(shipment.challan), current: !shipment.challan && packed,
      state: shipment.challan ? "Issued" : "Pending",
      onOpen: shipment.challan ? () => setChallanOpen(true) : undefined,
    },
    {
      label: "GST invoice", owner: "Accounts", date: order?.invoiceId ? shipment.created : "—",
      reference: order?.invoiceId ?? "Not raised", done: Boolean(order?.invoiceId),
      current: !order?.invoiceId && packed, state: order?.invoiceId ? "Raised" : "Pending",
    },
    {
      label: "LR & transport", owner: shipment.transport?.transporter ?? shipment.courier ?? "Not assigned",
      date: shipment.transport?.lrDate ?? shipment.dispatchDate ?? "—",
      reference: shipment.transport?.lrNumber ? `LR ${shipment.transport.lrNumber}${shipment.transport.vehicle ? ` · ${shipment.transport.vehicle}` : ""}` : "Not issued",
      done: Boolean(shipment.transport?.lrNumber), current: idx === 1 && packed,
      state: shipment.transport?.lrNumber ? "Issued" : "Pending",
    },
    {
      label: "Gate pass", owner: gatePass?.requestedBy ?? "Security", date: gatePass?.issuedAt ?? "—",
      reference: gatePass?.id ?? "Not raised", done: Boolean(gatePass), current: false,
      state: gatePass ? gatePass.status : "Optional",
    },
    {
      label: "Stock reduction (FIFO)", owner: "Plant store",
      date: shipment.dispatchDate ?? "—",
      reference: idx >= 2 ? "Posted to the inventory ledger" : "On dispatch",
      done: idx >= 2, current: false, state: idx >= 2 ? "Posted" : "Pending",
    },
    {
      label: "Delivery", owner: shipment.transport?.transporter ?? shipment.courier ?? "Transporter",
      date: shipment.pod?.receivedOn ?? shipment.expectedDelivery ?? "—",
      reference: shipment.pod ? `POD · ${shipment.pod.receivedBy}` : shipment.tracking ?? "—",
      done: shipment.status === "Delivered", current: shipment.status === "In Transit",
      state: shipment.pod
        ? shipment.pod.condition
        : shipment.status === "Delivered"
          ? "Delivered"
          : shipment.status === "In Transit"
            ? "In transit"
            : "Pending",
    },
    {
      label: "Feedback", owner: "Post-sales", date: feedbackRecord ? shipment.expectedDelivery ?? "—" : "—",
      reference: feedbackRecord?.id ?? "Not requested",
      done: Boolean(feedbackRecord && !feedbackRecord.awaitingResponse),
      current: Boolean(feedbackRecord?.awaitingResponse),
      state: feedbackRecord ? (feedbackRecord.awaitingResponse ? "Awaiting reply" : "Received") : "Pending",
    },
  ];

  const specs: Array<[string, React.ReactNode | undefined]> = [
    ["Order", <button key="o" type="button" className="link-btn" onClick={() => onOpenOrder(shipment.orderId)}>{shipment.orderId}</button>],
    ["Customer", <button key="c" type="button" className="link-btn" onClick={() => onOpenCustomer(shipment.customerId)}>{shipment.customerName}</button>],
    ["Package", shipment.packageType],
    ["Weight", shipment.weight],
    ["Insurance", shipment.insured ? "Insured freight · declared value" : "Not insured"],
    ["Courier", shipment.courier],
    ["Tracking", shipment.tracking],
    ["Dispatch date", shipment.dispatchDate],
    ["Expected delivery", shipment.expectedDelivery],
  ];

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All shipments</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{shipment.id}</h1>
            <Badge tone={dispatchStatusTone[shipment.status]}>{shipment.status}</Badge>
          </div>
          <p className="muted-line">{shipment.customerName} · {shipment.orderId} · created {shipment.created}</p>
        </div>
        <div className="detail-actions">
          {shipment.status === "Ready to Dispatch" && (
            <Button onClick={startPacking} disabled={!canDispatch}><Icon name="layers" /> Start packing</Button>
          )}
          {shipment.status === "Packing" && (
            <Button onClick={() => setDispatchOpen(true)} disabled={!packed || !canApproveDispatch}><Icon name="send" /> Confirm dispatch</Button>
          )}
          {shipment.status === "Dispatched" && (
            <>
              <Button onClick={markInTransit} disabled={!canDispatch}><Icon name="arrow" /> Mark in transit</Button>
              <Button variant="danger" onClick={() => setFailOpen(true)}>Delivery failed</Button>
            </>
          )}
          {shipment.status === "In Transit" && (
            <>
              <Button onClick={markDelivered} disabled={!canDispatch}><Icon name="check" /> Mark delivered</Button>
              <Button variant="danger" onClick={() => setFailOpen(true)}>Delivery failed</Button>
            </>
          )}
          {shipment.status === "Failed" && (
            <>
              <Button onClick={retryDispatch} disabled={!canDispatch}><Icon name="send" /> Retry dispatch</Button>
              <Button variant="danger" onClick={returnToStore} disabled={!canDispatch}>Return to store</Button>
            </>
          )}
          {shipment.status === "Delivered" && (
            <Button variant="secondary" onClick={requestFeedback}><Icon name="mail" /> Request feedback</Button>
          )}
          {!["Delivered", "Returned"].includes(shipment.status) && (
            <Button variant="ghost" onClick={() => setGatePassOpen(true)} disabled={!canDispatch}><Icon name="shield" /> Issue gate pass</Button>
          )}
          {!shipment.challan && order && (
            <Button variant="secondary" onClick={issueChallan} disabled={!canDispatch}><Icon name="component" /> Issue delivery challan</Button>
          )}
          {shipment.challan && (
            <Button variant="secondary" onClick={() => setChallanOpen(true)}><Icon name="eye" /> View {shipment.challan.id}</Button>
          )}
        </div>
      </div>

      {!canDispatch && (
        <Alert tone="info" title={`${activeRole} has view-only access to dispatch`}>
          Packing, dispatch confirmation, gate passes and delivery updates are carried out by the Dispatch
          Coordinator. You can still open the consignment, its documents and its timeline.
        </Alert>
      )}
      {shipment.status === "Failed" && (
        <Alert tone="danger" title="Delivery failed">{shipment.failReason}</Alert>
      )}
      {shipment.status === "Returned" && (
        <Alert tone="warning" title="Returned to store">{shipment.failReason ?? "The package is back in the warehouse."}</Alert>
      )}
      {dispatchPlan.length > 0 && (
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">DISPATCH PLAN</p>
              <h2>{dispatchPlan.length} line{dispatchPlan.length === 1 ? "" : "s"} · {dispatchPlan.reduce((n, r) => n + r.line.qty, 0)} unit{dispatchPlan.reduce((n, r) => n + r.line.qty, 0) === 1 ? "" : "s"}</h2>
              <p className="muted-line">
                <button type="button" className="link-btn" onClick={() => onOpenOrder(shipment.orderId)}>{shipment.orderId}</button>
                {" "}· {shipment.customerName} · issued oldest-lot-first on dispatch
              </p>
            </div>
            <Badge tone={totalShortfall > 0 ? "danger" : "emerald"}>
              {totalShortfall > 0 ? `${totalShortfall} unit(s) short` : "Fully available"}
            </Badge>
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead>
                <tr><th>SKU</th><th>Item</th><th>Ordered</th><th>To dispatch</th><th>Available</th><th>FIFO lot allocation</th><th>Status</th></tr>
              </thead>
              <tbody>
                {dispatchPlan.map(row => (
                  <tr key={row.line.sku}>
                    <td><strong>{row.line.sku}</strong></td>
                    <td className="note-cell">{row.line.name}</td>
                    <td>{row.line.qty}</td>
                    <td><strong>{row.line.qty - row.shortfall}</strong></td>
                    <td className={row.available < row.line.qty ? "warning-text" : undefined}>{row.available}</td>
                    <td className="note-cell">
                      {row.allocation.length === 0 ? (
                        <span className="muted">No open lot</span>
                      ) : (
                        row.allocation.map((a, i) => (
                          <div key={a.lot.id}>
                            {i === 0 && <Badge tone="royal">Oldest</Badge>}{" "}
                            {a.take} from {a.lot.id} · {a.lot.receivedDate}
                          </div>
                        ))
                      )}
                    </td>
                    <td>
                      <Badge tone={row.shortfall > 0 ? "danger" : "emerald"}>
                        {row.shortfall > 0 ? `Short ${row.shortfall}` : "Ready"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalShortfall > 0 && (
            <Alert tone="warning" title="Not enough finished stock for this consignment">
              {totalShortfall} unit(s) have no open FIFO lot. Post a production batch to finished goods, or reduce the
              dispatch quantity before confirming.
            </Alert>
          )}
        </section>
      )}

      {shipment.pod && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">PROOF OF DELIVERY</p><h2>Received at the customer's end</h2></div>
            <Badge tone={shipment.pod.condition === "Accepted in full" ? "emerald" : "amber"}>{shipment.pod.condition}</Badge>
          </div>
          <div className="kv-grid">
            <div><span>Received by</span><strong>{shipment.pod.receivedBy}</strong></div>
            <div><span>Received on</span><strong>{shipment.pod.receivedOn}</strong></div>
            <div><span>Against challan</span><strong>{shipment.challan ? `${shipment.challan.id} · ${shipment.challan.status}` : "No challan raised"}</strong></div>
            <div><span>Recorded by</span><strong>{shipment.pod.recordedBy}</strong></div>
            {shipment.pod.shortQty ? <div><span>Units affected</span><strong className="warning-text">{shipment.pod.shortQty}</strong></div> : null}
            {shipment.pod.remarks ? <div><span>Receiver remarks</span><strong>“{shipment.pod.remarks}”</strong></div> : null}
          </div>
          {shipment.pod.condition !== "Accepted in full" && (
            <Alert tone="warning" title="Settle the discrepancy">
              Raise a sales return or a credit note against {shipment.orderId} so the customer account matches what was
              actually received.
            </Alert>
          )}
        </section>
      )}

      {!["Failed", "Returned"].includes(shipment.status) && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">DISPATCH JOURNEY</p><h2>Order → Delivery</h2></div>
            <Badge tone="royal">{shipment.orderId}</Badge>
          </div>
          <Stepper steps={dispatchJourney} current={journeyIndex[shipment.status] ?? 0} />
          <div className="table-wrap op-table journey-table">
            <table>
              <thead><tr><th>Step</th><th>Owner</th><th>Date</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {journeySteps.map(step => (
                  <tr key={step.label}>
                    <td>
                      {step.onOpen ? (
                        <button type="button" className="link-btn" onClick={step.onOpen}>{step.label}</button>
                      ) : (
                        <strong>{step.label}</strong>
                      )}
                    </td>
                    <td>{step.owner}</td>
                    <td>{step.date}</td>
                    <td className="note-cell">{step.reference}</td>
                    <td><Badge tone={step.done ? "emerald" : step.current ? "amber" : "neutral"}>{step.state}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {shipment.status === "Packing" && !packed && (
        <Alert tone="info" title="Packing checklist in progress">
          Dispatch unlocks when every item is checked — {shipment.checklist.filter(i => i.done).length} of {shipment.checklist.length} done.
        </Alert>
      )}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">DOCUMENTS & TRANSPORT</p><h2>Challan, LR and transport papers</h2></div>
              {shipment.challan && <Badge tone="emerald">{shipment.challan.status}</Badge>}
            </div>
            <div className="detail-list">
              <div><span>Dispatch coordinator</span><strong>{shipment.coordinator ?? "Suresh Yadav"}</strong></div>
              <div><span>Delivery challan</span><strong>{shipment.challan ? `${shipment.challan.id} · ${shipment.challan.issuedOn}` : "Not issued"}</strong></div>
              <div><span>Linked invoice</span><strong>{order?.invoiceId ?? "—"}</strong></div>
              <div><span>Transporter</span><strong>{shipment.transport?.transporter ?? shipment.courier ?? "Not assigned"}</strong></div>
              <div><span>LR number</span><strong>{shipment.transport?.lrNumber ?? "—"}</strong></div>
              <div><span>Vehicle / reference</span><strong>{shipment.transport?.vehicle ?? "—"}</strong></div>
              <div><span>LR date</span><strong>{shipment.transport?.lrDate ?? "—"}</strong></div>
            </div>
            {shipment.transport && (
              <>
                <p className="kicker" style={{ marginTop: 12 }}>TRANSPORT DOCUMENTS</p>
                <div className="chip-row">
                  {shipment.transport.documents.map(d => <span className="pref-chip" key={d}><Icon name="shield" size={13} /> {d}</span>)}
                </div>
              </>
            )}
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">THE PACKAGE</p><h2>Shipment details</h2></div></div>
            <p className="requirement-quote">“{shipment.address}”</p>
            <div className="detail-list">
              {specs.filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">PACKING CHECKLIST</p><h2>{shipment.checklist.filter(i => i.done).length} / {shipment.checklist.length} complete</h2></div>
              {packed && <Badge tone="emerald">Sealed & ready</Badge>}
            </div>
            <div className="check-stack">
              {shipment.checklist.map((item, i) => (
                <Checkbox
                  key={item.label}
                  checked={item.done}
                  disabled={!packingActive}
                  onChange={() => toggleChecklist(shipment.id, i)}
                  label={item.label}
                />
              ))}
            </div>
          </section>
        </div>
        {linkedPasses.length > 0 && (
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">GATE PASSES ON THIS CONSIGNMENT</p><h2>{linkedPasses.length} raised</h2></div>
              <Badge tone="gold">No billing</Badge>
            </div>
            <div className="detail-list">
              {linkedPasses.map(g => (
                <div key={g.id}>
                  <span>{g.id} · {g.item} · {g.qty} {g.unit}</span>
                  <strong>{g.status}{g.returnable && g.expectedReturn ? ` · return by ${g.expectedReturn}` : ""}</strong>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="panel">
          <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Shipment timeline</h2></div></div>
          <Timeline items={shipment.timeline.slice(0, 9).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      {shipment.challan && (
        <Modal open={challanOpen} onClose={() => setChallanOpen(false)} labelledBy="dc-title" className="wide-modal">
          <h2 id="dc-title">Delivery challan {shipment.challan.id}</h2>
          <div className="doc-print">
            <div className="doc-print-head">
              <div>
                <strong>MAHARAJA SOAP</strong>
                <small>Vapi Plant · GSTIN 08AACCM1234F1Z5</small>
              </div>
              <div className="doc-print-meta">
                <strong>DELIVERY CHALLAN</strong>
                <small>{shipment.challan.id} · {shipment.challan.issuedOn}</small>
              </div>
            </div>
            <div className="detail-list">
              <div><span>Consignee</span><strong>{shipment.customerName}</strong></div>
              <div><span>Delivery address</span><strong>{shipment.address}</strong></div>
              <div><span>Against order</span><strong>{shipment.challan.orderId}</strong></div>
              <div><span>Invoice</span><strong>{shipment.challan.invoiceId ?? "To follow"}</strong></div>
              <div><span>Transporter · LR</span><strong>{shipment.transport ? `${shipment.transport.transporter} · ${shipment.transport.lrNumber}` : "To be assigned"}</strong></div>
              <div><span>Issued by</span><strong>{shipment.challan.issuedBy}</strong></div>
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead><tr><th>#</th><th>Description</th><th>Qty</th></tr></thead>
                <tbody>
                  {shipment.challan.lines.map((l, i) => (
                    <tr key={i}><td>{i + 1}</td><td className="note-cell">{l.description}</td><td>{l.qty}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">Goods described above are delivered in good condition. Not a tax invoice.</p>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setChallanOpen(false)}>Close</Button>
            <Button onClick={() => toast({ tone: "info", title: "Print preview", message: "A real deployment would print or email the challan." })}>Print</Button>
          </div>
        </Modal>
      )}

      <GatePassModal
        open={gatePassOpen}
        onClose={() => setGatePassOpen(false)}
        prefill={gatePassPrefill}
        onCreated={id => updateShipment(shipment.id, {}, `Gate pass ${id} raised against this consignment`)}
      />
      <ConfirmDispatchModal open={dispatchOpen} onClose={() => setDispatchOpen(false)} shipmentId={shipment.id} onConfirm={confirmDispatch} />
      <PodModal
        open={podOpen}
        shipment={shipment}
        recordedBy={currentUser}
        onClose={() => setPodOpen(false)}
        onConfirm={recordPod}
      />
      <FailDeliveryModal open={failOpen} onClose={() => setFailOpen(false)} onConfirm={failDelivery} />
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          danger={confirm.danger}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.action}
        />
      )}
    </div>
  );
}
