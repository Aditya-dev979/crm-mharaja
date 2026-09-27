import { useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import InvoiceDrawer from "@/components/sales/InvoiceDrawer";
import OrderReleaseModal from "@/components/sales/OrderReleaseModal";
import { NewDispatchModal } from "@/components/dispatch/DispatchModals";
import { dispatchOwnedStatuses, OrderStatusModal, RecordPaymentModal } from "@/components/sales/SalesModals";
import { TextAreaField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { productStatusTone } from "@/data/productData";
import { customerFacingStatus, lineTotal, orderStatusTone, paidAmount, saleTotals } from "@/data/salesData";
import { useProduction } from "@/hooks/useProduction";
import { useDispatch } from "@/hooks/useDispatch";
import { useFinance } from "@/hooks/useFinance";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { OrderStatus, SalesOrder } from "@/types";
import { cn, formatINR } from "@/utils";

const journeySteps = ["Quotation", "Order", "Payment", "Stock", "Billing", "Dispatch", "Delivery"] as const;

export default function OrderDetail({
  order,
  onBack,
  onOpenCustomer,
  onOpenProduct,
  onOpenQuotation,
  onOpenProduction,
  onOpenShipment,
  onOpenFinanceDoc,
}: {
  order: SalesOrder;
  onBack: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenQuotation: (quotationId: string) => void;
  onOpenProduction?: (productionId: string) => void;
  /** Hands over to the Dispatch module once a shipment exists. */
  onOpenShipment?: (shipmentId: string) => void;
  onOpenFinanceDoc?: (docId: string) => void;
}) {
  const { updateOrder, addPayment, nextInvoiceId } = useSales();
  const { orders: productionOrders, assignments } = useProduction();
  const { products, updateProduct, logMovement } = useProducts();
  const { shipments, addShipment } = useDispatch();
  const { docs: financeDocs } = useFinance();

  /* Commercial trail: the advance sits on the PI, so the order shows it rather
     than letting it disappear once the order is raised. */
  const linkedPi = financeDocs.find(
    d => d.type === "Proforma Invoice" && d.partyId === order.customerId && d.pi?.status === "Approved",
  );
  const advances = financeDocs.filter(
    d => d.type === "Payment Receipt" && d.reference && linkedPi && d.reference === linkedPi.id,
  );
  const advanceTotal = advances.reduce((sum, d) => sum + d.paid, 0);
  const { addNotification } = useTeam();
  const toast = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);

  const totals = saleTotals(order.lines, order.gstPct);
  const paid = paidAmount(order);
  const balance = totals.total - paid;
  const cancelled = order.status === "Cancelled";
  const lineProducts = order.lines.map(l => ({ line: l, product: products.find(p => p.id === l.productId) }));
  const stockSecured = lineProducts.every(
    ({ product }) => !product || ["Reserved", "Sold", "Dispatched"].includes(product.status),
  );
  const dispatched = ["Dispatched", "Delivered", "Completed"].includes(order.status);
  const delivered = ["Delivered", "Completed"].includes(order.status);

  /* Fulfilment tracking: milestones and the responsible team are derived from
     the linked production order or contract-manufacturing assignment. */
  const linkedProduction = productionOrders.find(p => p.id === order.release?.productionOrderId);
  const linkedAssignment = assignments.find(a => a.id === order.release?.assignmentId);
  const productionDone = linkedProduction?.status === "Completed" || linkedAssignment?.status === "Ready to Dispatch";
  const releaseOwner = dispatched
    ? "Dispatch · Suresh Yadav"
    : productionDone
      ? "Dispatch · Suresh Yadav"
      : linkedProduction
        ? `${linkedProduction.plant} · ${linkedProduction.responsible}`
        : linkedAssignment
          ? `${linkedAssignment.manufacturerName} (external)`
          : `${order.executive} · Sales`;
  const milestones = order.release
    ? [
        { label: "Released", due: order.release.releaseDate, owner: order.release.releasedBy, done: true, late: false },
        {
          label: linkedAssignment ? "Manufacturer accepted" : "Material issued",
          due: order.release.releaseDate,
          owner: linkedAssignment ? linkedAssignment.manufacturerName : linkedProduction?.responsible ?? "Plant",
          done: linkedAssignment
            ? linkedAssignment.status !== "Sent"
            : !!linkedProduction && linkedProduction.status !== "Planned",
          late: false,
        },
        {
          label: "Production complete",
          due: order.release.expectedReady,
          owner: linkedAssignment ? linkedAssignment.manufacturerName : linkedProduction?.plant ?? "Owned Factory",
          done: !!productionDone,
          late: !productionDone && order.release.expectedReady < "08 Mar 2026",
        },
        {
          label: "Ready to dispatch",
          due: order.release.expectedReady,
          owner: "Inventory · Priya Nair",
          done: ["Ready", "Dispatched", "Delivered", "Completed"].includes(order.status),
          late: false,
        },
        {
          label: "Dispatched",
          due: order.expectedDelivery ?? "On readiness",
          owner: "Dispatch · Suresh Yadav",
          done: dispatched,
          late: false,
        },
        {
          label: "Delivered",
          due: order.expectedDelivery ?? "Per courier",
          owner: "Dispatch · Suresh Yadav",
          done: delivered,
          late: false,
        },
      ]
    : [];

  const stepDone: Record<(typeof journeySteps)[number], boolean> = {
    Quotation: !!order.quotationId,
    Order: true,
    Payment: balance <= 0 && totals.total > 0,
    Stock: stockSecured,
    Billing: !!order.invoiceId,
    Dispatch: dispatched,
    Delivery: delivered,
  };
  const currentStep = journeySteps.find(s => !stepDone[s]) ?? "Delivery";

  const reserveStock = () => {
    let reserved = 0;
    lineProducts.forEach(({ line, product }) => {
      if (product && product.status === "Available") {
        updateProduct(product.id, { status: "Reserved" }, `Reserved for ${order.id}`);
        logMovement({ sku: product.sku, product: product.name, type: "Reservation", qty: -line.qty, location: product.location, note: `Reserved against ${order.id}` });
        reserved++;
      }
    });
    if (reserved) {
      updateOrder(order.id, {}, `Stock reserved — ${reserved} item${reserved > 1 ? "s" : ""}`);
      toast({ tone: "success", title: "Stock reserved", message: `${reserved} item${reserved > 1 ? "s" : ""} reserved for ${order.id}.` });
    } else {
      toast({ tone: "info", title: "Nothing to reserve", message: "Line items are already reserved or unavailable." });
    }
  };

  const generateInvoice = () => {
    const invoiceId = nextInvoiceId();
    updateOrder(order.id, { invoiceId }, `Invoice ${invoiceId} generated`);
    addNotification({
      type: "Invoice Status Update", priority: "Normal",
      title: `${invoiceId} raised`,
      message: `${order.customerName} · ${formatINR(totals.total)} · balance due before dispatch.`,
      reference: order.id,
      recordRef: { kind: "order", id: order.id },
    });
    toast({ tone: "success", title: "Invoice generated", message: `${invoiceId} for ${formatINR(totals.total)}.` });
    setInvoiceOpen(true);
  };

  const recordPayment = (amount: number, method: string) => {
    const receipt = addPayment(order.id, { amount, method });
    const newBalance = balance - amount;
    let statusPatch: Partial<SalesOrder> = {};
    if (["Confirmed", "Payment Pending", "Partially Paid"].includes(order.status)) {
      statusPatch = { status: newBalance <= 0 ? "Processing" : "Partially Paid" };
    }
    updateOrder(order.id, statusPatch, `${receipt.id} · ${formatINR(amount)} received — ${method.toLowerCase()}`);
    if (newBalance > 0) {
      addNotification({
        type: "Payment due", priority: "Normal",
        title: `${formatINR(newBalance)} still due on ${order.id}`,
        message: `${order.customerName} paid ${formatINR(amount)} by ${method.toLowerCase()} — balance payable before dispatch.`,
        reference: order.id,
        recordRef: { kind: "order", id: order.id },
      });
    }
    setPayOpen(false);
    toast({
      tone: "success",
      title: newBalance <= 0 ? "Paid in full" : "Payment recorded",
      message: newBalance <= 0 ? `${order.id} is fully paid — moved to Processing.` : `${formatINR(newBalance)} still due on ${order.id}.`,
    });
  };

  /* An order never dispatches itself. It raises a shipment, and the Dispatch
     module owns packing, LR, gate pass, FIFO stock reduction and delivery — so
     there is one dispatch journey rather than two divergent ones. */
  const orderShipment = shipments.find(s => s.orderId === order.id && !["Failed", "Returned"].includes(s.status));

  const createShipment = (packageType: string, weight: string, insured: boolean, address: string) => {
    const created = addShipment({
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      address,
      packageType,
      weight,
      insured,
    });
    updateOrder(order.id, {}, `Shipment ${created.id} raised — handed to dispatch`);
    setDispatchOpen(false);
    toast({
      tone: "success",
      title: `${created.id} created`,
      message: `Packing, LR and gate pass continue in Dispatch.`,
    });
    onOpenShipment?.(created.id);
  };

  const markDelivered = () =>
    setConfirm({
      title: `Mark ${order.id} delivered?`,
      message: <>Confirms the customer has received the order. The delivery step completes and feedback can be requested.</>,
      confirmLabel: "Confirm delivered",
      action: () => {
        updateOrder(order.id, { status: "Delivered" }, "Delivered to customer");
        toast({ tone: "success", title: "Delivered", message: `${order.id} marked delivered.` });
        setConfirm(null);
      },
    });

  const completeOrder = () =>
    setConfirm({
      title: `Complete ${order.id}?`,
      message:
        balance > 0 ? (
          <>The order still has {formatINR(balance)} unpaid. Completing with a balance requires manager override and stays flagged in receivables.</>
        ) : (
          <>Closes the order. It remains available for returns, repairs and reports.</>
        ),
      confirmLabel: balance > 0 ? "Override & complete" : "Complete order",
      danger: balance > 0,
      action: () => {
        updateOrder(order.id, { status: "Completed" }, "Order completed");
        toast({ tone: "success", title: "Order completed", message: order.id });
        setConfirm(null);
      },
    });

  const applyStatus = (status: OrderStatus, note: string) => {
    /* Defence in depth: the modal disables these, and the handler refuses them
       too, so the order can never reach a dispatch state without a shipment. */
    if (dispatchOwnedStatuses.includes(status) && status !== order.status) {
      setStatusOpen(false);
      toast({
        tone: "error",
        title: "Complete the dispatch workflow first",
        message: `${status} is set by the Dispatch module once ${orderShipment ? orderShipment.id : "a shipment"} is packed, documented and dispatched.`,
      });
      return;
    }
    if (status === "Cancelled") {
      lineProducts.forEach(({ line, product }) => {
        if (product && product.status === "Reserved") {
          updateProduct(product.id, { status: "Available" }, `Reservation released — ${order.id} cancelled`);
          logMovement({ sku: product.sku, product: product.name, type: "Adjustment", qty: line.qty, location: product.location, note: `Reservation released — ${order.id} cancelled` });
        }
      });
    }
    updateOrder(order.id, { status }, note ? `Status changed to ${status} — ${note}` : `Status changed to ${status}`);
    setStatusOpen(false);
    toast({ tone: status === "Cancelled" ? "warning" : "success", title: `Order ${status.toLowerCase()}`, message: order.id });
  };

  const stepAction = (step: (typeof journeySteps)[number]) => {
    switch (step) {
      case "Quotation":
        if (order.quotationId) onOpenQuotation(order.quotationId);
        else toast({ tone: "info", title: "Direct order", message: "This order was created without a quotation." });
        break;
      case "Order":
        toast({ tone: "info", title: order.id, message: `Created ${order.created} by ${order.executive}.` });
        break;
      case "Payment":
        if (balance > 0 && !cancelled) setPayOpen(true);
        else toast({ tone: "success", title: "Paid in full", message: `${formatINR(paid)} received.` });
        break;
      case "Stock":
        if (!stockSecured && !cancelled) reserveStock();
        else if (order.lines[0]) onOpenProduct(order.lines[0].productId);
        break;
      case "Billing":
        if (order.invoiceId) setInvoiceOpen(true);
        else if (!cancelled) generateInvoice();
        break;
      case "Dispatch":
        if (orderShipment && onOpenShipment) onOpenShipment(orderShipment.id);
        else if (dispatched) toast({ tone: "info", title: "Dispatched", message: `${order.courier} · ${order.tracking}` });
        else if (!cancelled) setDispatchOpen(true);
        break;
      case "Delivery":
        if (delivered) toast({ tone: "success", title: "Delivered", message: order.id });
        else if (dispatched) markDelivered();
        else toast({ tone: "info", title: "Not dispatched yet", message: "Dispatch the order before marking delivery." });
        break;
    }
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All orders</button>

      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{order.id}</h1>
            <Badge tone={orderStatusTone[order.status]}>{order.status}</Badge>
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenCustomer(order.customerId)}>{order.customerName}</button>
            {" "}· {order.executive} · created {order.created}
            {order.quotationId && <> · from <button type="button" className="link-btn" onClick={() => onOpenQuotation(order.quotationId!)}>{order.quotationId}</button></>}
          </p>
        </div>
        <div className="detail-actions">
          {!cancelled && balance > 0 && <Button variant="secondary" onClick={() => setPayOpen(true)}><Icon name="check" /> Record payment</Button>}
          {!cancelled && (order.invoiceId ? (
            <Button variant="secondary" onClick={() => setInvoiceOpen(true)}><Icon name="component" /> View invoice</Button>
          ) : (
            <Button variant="secondary" onClick={generateInvoice}><Icon name="component" /> Generate invoice</Button>
          ))}
          {!cancelled && !order.release && !dispatched && (
            <Button variant="secondary" onClick={() => setReleaseOpen(true)}><Icon name="send" /> Release for fulfilment</Button>
          )}
          {!cancelled && !dispatched && !orderShipment && (
            <Button variant="secondary" onClick={() => setDispatchOpen(true)}><Icon name="send" /> Create shipment</Button>
          )}
          {orderShipment && onOpenShipment && (
            <Button variant="secondary" onClick={() => onOpenShipment(orderShipment.id)}>
              <Icon name="send" /> Open {orderShipment.id}
            </Button>
          )}
          {order.status === "Dispatched" && <Button variant="secondary" onClick={markDelivered}><Icon name="check" /> Mark delivered</Button>}
          {order.status === "Delivered" && <Button onClick={completeOrder}><Icon name="check" /> Complete order</Button>}
          <Button variant="secondary" onClick={() => setStatusOpen(true)}><Icon name="layers" /> Status…</Button>
        </div>
      </div>

      {cancelled && (
        <Alert tone="danger" title="This order was cancelled">
          {order.notes ?? "Reserved stock was released back to the catalogue."}
        </Alert>
      )}

      {order.release && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">ORDER RELEASE & TRACKING</p><h2>{order.release.destination}</h2></div>
            <div className="release-status">
              <Badge tone="royal">Customer sees: {customerFacingStatus(order)}</Badge>
              <Badge tone={orderStatusTone[order.status]}>Internal: {order.status}</Badge>
            </div>
          </div>
          <div className="detail-list">
            <div><span>Release</span><strong>{order.release.id} · {order.release.releaseDate}</strong></div>
            <div><span>Released by</span><strong>{order.release.releasedBy}</strong></div>
            <div><span>Expected ready</span><strong>{order.release.expectedReady}</strong></div>
            <div>
              <span>Fulfilment record</span>
              <strong>
                {order.release.productionOrderId ? (
                  <button type="button" className="link-btn" onClick={() => onOpenProduction?.(order.release!.productionOrderId!)}>
                    {order.release.productionOrderId}
                  </button>
                ) : (
                  order.release.assignmentId ?? "—"
                )}
              </strong>
            </div>
            <div><span>Currently with</span><strong>{releaseOwner}</strong></div>
          </div>
          <p className="requirement-quote">“{order.release.instructions}”</p>
          <div className="journey-chain" role="group" aria-label="Fulfilment milestones">
            {milestones.map((m, i) => (
              <span key={m.label} className="chain-step">
                <span className={cn("journey-step", m.done ? "done" : i === milestones.findIndex(x => !x.done) ? "current" : "pending")}>
                  {m.done && <Icon name="check" size={13} />}
                  {m.label}
                </span>
                {i < milestones.length - 1 && <Icon name="arrow" size={13} />}
              </span>
            ))}
          </div>
          <div className="detail-list">
            {milestones.map(m => (
              <div key={m.label}>
                <span>{m.label} · {m.owner}</span>
                <strong className={!m.done && m.late ? "warning-text" : undefined}>
                  {m.done ? "Done" : `Due ${m.due}${m.late ? " · running late" : ""}`}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {(order.quotationId || linkedPi) && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">COMMERCIAL TRAIL</p><h2>Quotation → PI → Approval → Advance → Order</h2></div>
            {advanceTotal > 0 && <Badge tone="emerald">{formatINR(advanceTotal)} advance received</Badge>}
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead><tr><th>Stage</th><th>Record</th><th>Who</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Quotation</strong></td>
                  <td>
                    {order.quotationId
                      ? <button type="button" className="link-btn" onClick={() => onOpenQuotation(order.quotationId!)}>{order.quotationId}</button>
                      : <span className="muted">Direct sale</span>}
                  </td>
                  <td>{order.executive}</td>
                  <td>{order.created}</td>
                  <td><Badge tone={order.quotationId ? "emerald" : "neutral"}>{order.quotationId ? "Accepted" : "Not raised"}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Proforma invoice</strong></td>
                  <td>{linkedPi ? <button type="button" className="link-btn" onClick={() => onOpenFinanceDoc?.(linkedPi.id)}>{linkedPi.id}</button> : <span className="muted">Not raised</span>}</td>
                  <td>{linkedPi?.createdBy ?? "—"}</td>
                  <td>{linkedPi?.date ?? "—"}</td>
                  <td><Badge tone={linkedPi ? "emerald" : "neutral"}>{linkedPi ? `v${linkedPi.pi?.version} ${linkedPi.pi?.status}` : "Not raised"}</Badge></td>
                </tr>
                <tr>
                  <td><strong>PI approval</strong></td>
                  <td className="note-cell">{linkedPi?.pi?.approvalRemarks ?? "—"}</td>
                  <td>{linkedPi?.pi?.approvedBy ?? "—"}</td>
                  <td>{linkedPi?.pi?.approvedAt ?? "—"}</td>
                  <td><Badge tone={linkedPi?.pi?.lockedAt ? "emerald" : "amber"}>{linkedPi?.pi?.lockedAt ? "Terms locked" : "Pending"}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Customer advance</strong></td>
                  <td>
                    {advances.length
                      ? advances.map(a => (
                          <div key={a.id}>
                            <button type="button" className="link-btn" onClick={() => onOpenFinanceDoc?.(a.id)}>{a.id}</button>
                            {" "}· {formatINR(a.paid)}{a.txnRef ? ` · ${a.txnRef}` : ""}
                          </div>
                        ))
                      : <span className="muted">No advance recorded</span>}
                  </td>
                  <td>{advances[0]?.createdBy ?? "—"}</td>
                  <td>{advances[0]?.date ?? "—"}</td>
                  <td><Badge tone={advanceTotal > 0 ? "emerald" : "amber"}>{advanceTotal > 0 ? formatINR(advanceTotal) : "Awaited"}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Sales order</strong></td>
                  <td>{order.id}</td>
                  <td>{order.executive}</td>
                  <td>{order.created}</td>
                  <td><Badge tone={orderStatusTone[order.status]}>{order.status}</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
          {advanceTotal > 0 && (
            <p className="muted">
              The advance is held against {linkedPi?.id} and is not re-applied to this order — the order balance below
              reflects payments recorded against the order itself.
            </p>
          )}
        </section>
      )}

      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">ORDER JOURNEY</p><h2>Quotation → Delivery</h2></div>
          <span>Click a step to act on it</span>
        </div>
        <div className="journey-chain" role="group" aria-label="Order journey steps">
          {journeySteps.map((step, i) => {
            const state = stepDone[step] ? "done" : step === currentStep && !cancelled ? "current" : "pending";
            return (
              <span key={step} className="chain-step">
                <button
                  type="button"
                  className={cn("journey-step", state)}
                  aria-label={`${step}: ${state === "done" ? "complete" : state}`}
                  onClick={() => stepAction(step)}
                >
                  {state === "done" && <Icon name="check" size={13} />}
                  {step}
                </button>
                {i < journeySteps.length - 1 && <Icon name="arrow" size={13} />}
              </span>
            );
          })}
        </div>
      </section>

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">ITEMS & STOCK</p><h2>{order.lines.length} line{order.lines.length > 1 ? "s" : ""}</h2></div>
              {!cancelled && !stockSecured && (
                <Button variant="secondary" onClick={reserveStock}><Icon name="lock" /> Reserve stock</Button>
              )}
            </div>
            <div className="quote-lines">
              {lineProducts.map(({ line, product }) => (
                <div key={line.productId} className="quote-line">
                  <button type="button" className="thumb-btn" onClick={() => onOpenProduct(line.productId)} aria-label={`View ${line.sku}`}>
                    <GemImage tone={line.tone} size="thumb" />
                  </button>
                  <div className="quote-line-name">
                    <strong>{line.name}</strong>
                    <small>{line.sku} · qty {line.qty}{line.discountPct ? ` · ${line.discountPct}% off` : ""}</small>
                  </div>
                  {product && <Badge tone={productStatusTone[product.status]}>{product.status}</Badge>}
                  <strong className="quote-line-total">{formatINR(lineTotal(line))}</strong>
                </div>
              ))}
            </div>
            <div className="quote-totals">
              <div><span>GST ({order.gstPct}% included)</span><strong>{formatINR(totals.gstIncluded)}</strong></div>
              <div className="quote-grand"><span>Order total</span><strong>{formatINR(totals.total)}</strong></div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">PAYMENTS</p><h2>{formatINR(paid)} received</h2></div>
              <Badge tone={balance <= 0 ? "emerald" : paid > 0 ? "amber" : "danger"}>
                {balance <= 0 ? "Paid in full" : `${formatINR(balance)} due`}
              </Badge>
            </div>
            {order.payments.length === 0 ? (
              <p className="muted">No payments yet.</p>
            ) : (
              <div className="detail-list">
                {order.payments.map(p => (
                  <div key={p.id}><span>{p.id} · {p.method} · {p.date}</span><strong>{formatINR(p.amount)}</strong></div>
                ))}
              </div>
            )}
            {!cancelled && balance > 0 && (
              <div className="note-actions">
                <Button variant="secondary" onClick={() => setPayOpen(true)}><Icon name="plus" /> Record payment</Button>
              </div>
            )}
          </section>
        </div>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">DELIVERY</p><h2>Dispatch & tracking</h2></div>
            </div>
            <div className="detail-list">
              <div><span>Address</span><strong>{order.deliveryAddress ?? "—"}</strong></div>
              <div>
                <span>Shipment</span>
                <strong>
                  {orderShipment
                    ? onOpenShipment
                      ? <button type="button" className="link-btn" onClick={() => onOpenShipment(orderShipment.id)}>{orderShipment.id} · {orderShipment.status}</button>
                      : `${orderShipment.id} · ${orderShipment.status}`
                    : "Not raised yet"}
                </strong>
              </div>
              <div><span>Courier</span><strong>{order.courier ?? "Not dispatched"}</strong></div>
              <div><span>Tracking</span><strong>{order.tracking ?? "—"}</strong></div>
              <div><span>Expected</span><strong>{order.expectedDelivery ?? "—"}</strong></div>
              <div><span>Invoice</span>
                <strong>
                  {order.invoiceId ? (
                    <button type="button" className="link-btn" onClick={() => setInvoiceOpen(true)}>{order.invoiceId}</button>
                  ) : "Not generated"}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">ACTIVITY</p><h2>Order timeline</h2></div>
            </div>
            <Timeline
              items={order.timeline.slice(0, 8).map((event, i) => ({
                title: event.text,
                meta: event.time,
                state: i === 0 ? "current" : "done",
              }))}
            />
          </section>

          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">NOTES</p><h2>Internal notes</h2></div>
            </div>
            {order.notes && <p className="requirement-quote">“{order.notes}”</p>}
            <TextAreaField
              label="Add a note"
              placeholder="Delivery preferences, approvals, context..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="note-actions">
              <Button
                variant="secondary"
                disabled={!noteText.trim()}
                onClick={() => {
                  updateOrder(order.id, { notes: noteText.trim() }, "Note added");
                  setNoteText("");
                  toast({ tone: "success", title: "Note added" });
                }}
              >
                Save note
              </Button>
            </div>
          </section>
        </div>
      </div>

      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} order={order} onConfirm={recordPayment} />
      <NewDispatchModal
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        presetOrderId={order.id}
        onCreate={(_o, packageType, weight, insured, address) => createShipment(packageType, weight, insured, address)}
      />
      <OrderStatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        order={order}
        onConfirm={applyStatus}
        shipmentId={orderShipment?.id}
        onOpenShipment={orderShipment && onOpenShipment ? () => onOpenShipment(orderShipment.id) : undefined}
        onCreateShipment={!orderShipment && !cancelled ? () => setDispatchOpen(true) : undefined}
      />
      <OrderReleaseModal order={order} open={releaseOpen} onClose={() => setReleaseOpen(false)} onOpenProduction={onOpenProduction} />
      <InvoiceDrawer open={invoiceOpen} onClose={() => setInvoiceOpen(false)} order={order} />
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.action}
        />
      )}
    </div>
  );
}
