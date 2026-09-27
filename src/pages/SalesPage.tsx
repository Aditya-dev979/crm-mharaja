import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Checkbox from "@/components/forms/Checkbox";
import OrderDetail from "@/components/sales/OrderDetail";
import QuotationDetail from "@/components/sales/QuotationDetail";
import QuoteEditor from "@/components/sales/QuoteEditor";
import { NewOrderModal } from "@/components/sales/SalesModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { orderStatuses, orderStatusTone, paidAmount, quoteStatusTone, saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { OrderStatus, QuoteLine, QuoteStatus, SalesOrder, SalesQuotation } from "@/types";
import { formatINR } from "@/utils";

export interface SalesIntent {
  mode: "create-quote";
  customerId?: string;
  productId?: string;
}

type SalesView =
  | { type: "overview" }
  | { type: "quotes" }
  | { type: "orders" }
  | { type: "quote-detail"; id: string }
  | { type: "quote-form"; id?: string; customerId?: string; productId?: string }
  | { type: "order-detail"; id: string };

const quoteTabs: Array<"All" | QuoteStatus> = ["All", "Draft", "Sent", "Negotiation", "Accepted", "Rejected", "Expired", "Converted"];

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

export default function SalesPage({
  initialTab,
  onTabHandled,
  intent,
  onIntentHandled,
  focusQuotationId,
  focusOrderId,
  onFocusHandled,
  onOpenCustomer,
  onOpenProduct,
  onOpenProduction,
  onOpenShipment,
  onOpenFinanceDoc,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  intent: SalesIntent | null;
  onIntentHandled: () => void;
  focusQuotationId: string | null;
  focusOrderId: string | null;
  onFocusHandled: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenProduction?: (productionId: string) => void;
  onOpenShipment?: (shipmentId: string) => void;
  onOpenFinanceDoc?: (docId: string) => void;
}) {
  const { quotations, orders, addQuotation, updateQuotation, addOrder, updateOrder } = useSales();
  const { addNotification } = useTeam();
  const { customers } = useCrm();
  const { products, updateProduct, logMovement } = useProducts();
  const toast = useToast();

  const [view, setView] = useState<SalesView>({ type: "overview" });

  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Quotations") setView({ type: "quotes" });
    else if (initialTab === "Orders") setView({ type: "orders" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [quoteTab, setQuoteTab] = useState<(typeof quoteTabs)[number]>("All");
  const [quoteQuery, setQuoteQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus[]>([]);
  const [orderFilterOpen, setOrderFilterOpen] = useState(false);
  useEscapeKey(() => setOrderFilterOpen(false), orderFilterOpen);
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  useEffect(() => {
    if (intent?.mode === "create-quote") {
      setView({ type: "quote-form", customerId: intent.customerId, productId: intent.productId });
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  useEffect(() => {
    if (focusQuotationId) {
      setView({ type: "quote-detail", id: focusQuotationId });
      onFocusHandled();
    } else if (focusOrderId) {
      setView({ type: "order-detail", id: focusOrderId });
      onFocusHandled();
    }
  }, [focusQuotationId, focusOrderId, onFocusHandled]);

  const reserveLines = (lines: QuoteLine[], orderId: string) => {
    let reserved = 0;
    lines.forEach(line => {
      const product = products.find(p => p.id === line.productId);
      if (product && product.status === "Available") {
        updateProduct(product.id, { status: "Reserved" }, `Reserved for ${orderId}`);
        logMovement({ sku: product.sku, product: product.name, type: "Reservation", qty: -line.qty, location: product.location, note: `Reserved against ${orderId}` });
        reserved++;
      }
    });
    return reserved;
  };

  const convertQuote = (quote: SalesQuotation) => {
    const customer = customers.find(c => c.id === quote.customerId);
    const order = addOrder(
      {
        quotationId: quote.id,
        customerId: quote.customerId,
        customerName: quote.customerName,
        executive: quote.executive,
        lines: quote.lines,
        gstPct: quote.gstPct,
        status: "Confirmed",
        deliveryAddress: customer?.address ?? (customer ? `${customer.city}` : undefined),
      },
      `Order confirmed from ${quote.id}`,
    );
    const reserved = reserveLines(quote.lines, order.id);
    if (reserved) updateOrder(order.id, {}, `Stock reserved — ${reserved} item${reserved > 1 ? "s" : ""}`);
    updateQuotation(quote.id, { status: "Converted", orderId: order.id }, `Converted to order ${order.id}`);
    addNotification({
      type: "New order", priority: "High",
      title: `${order.id} confirmed`,
      message: `${order.customerName} · ${formatINR(saleTotals(order.lines, order.gstPct).total)} · from ${quote.id}.`,
      reference: order.id,
      recordRef: { kind: "order", id: order.id },
    });
    toast({
      tone: "success",
      title: "Order created",
      message: `${quote.id} → ${order.id}${reserved ? " · stock reserved" : " · check stock availability"}.`,
    });
    setView({ type: "order-detail", id: order.id });
  };

  const duplicateQuote = (quote: SalesQuotation) => {
    const copy = addQuotation({
      customerId: quote.customerId,
      customerName: quote.customerName,
      executive: quote.executive,
      lines: quote.lines,
      gstPct: quote.gstPct,
      validUntil: "22 Mar 2026",
      terms: quote.terms,
      status: "Draft",
      notes: `Duplicated from ${quote.id}`,
    });
    toast({ tone: "success", title: "Draft created", message: `${copy.id} duplicated from ${quote.id}.` });
    setView({ type: "quote-detail", id: copy.id });
  };

  const quickOrder = (customerId: string, line: QuoteLine) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const order = addOrder(
      {
        customerId,
        customerName: customer.name,
        executive: "Arjun Sharma",
        lines: [line],
        gstPct: 18,
        status: "Confirmed",
        deliveryAddress: customer.address ?? customer.city,
      },
      "Order confirmed — direct sale",
    );
    const reserved = reserveLines([line], order.id);
    if (reserved) updateOrder(order.id, {}, "Stock reserved — 1 item");
    addNotification({
      type: "New order", priority: "Normal",
      title: `${order.id} confirmed`,
      message: `${customer.name} · ${formatINR(saleTotals(order.lines, order.gstPct).total)} · direct sale.`,
      reference: order.id,
      recordRef: { kind: "order", id: order.id },
    });
    setNewOrderOpen(false);
    toast({ tone: "success", title: "Order created", message: `${order.id} for ${customer.name} · stock reserved.` });
    setView({ type: "order-detail", id: order.id });
  };

  /* ---------- lists ---------- */

  const filteredQuotes = useMemo(() => {
    const q = quoteQuery.trim().toLowerCase();
    return quotations.filter(quote => {
      if (quoteTab !== "All" && quote.status !== quoteTab) return false;
      if (!q) return true;
      return `${quote.id} ${quote.customerName} ${quote.lines.map(l => `${l.sku} ${l.name}`).join(" ")}`.toLowerCase().includes(q);
    });
  }, [quotations, quoteTab, quoteQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter(order => {
      if (orderStatusFilter.length && !orderStatusFilter.includes(order.status)) return false;
      if (!q) return true;
      return `${order.id} ${order.customerName} ${order.invoiceId ?? ""} ${order.lines.map(l => `${l.sku} ${l.name}`).join(" ")}`.toLowerCase().includes(q);
    });
  }, [orders, orderStatusFilter, orderQuery]);

  const itemsSummary = (lines: QuoteLine[]) =>
    lines.length === 1 ? lines[0].name : `${lines[0].name} +${lines.length - 1} more`;

  const quoteColumns: Column<SalesQuotation>[] = [
    {
      key: "id", label: "Quotation", sortable: true, hideable: false, sortValue: r => r.id,
      render: r => <button type="button" className="link-btn" onClick={() => setView({ type: "quote-detail", id: r.id })}>{r.id}</button>,
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: r => r.customerName,
      render: r => <button type="button" className="cell-link" onClick={() => onOpenCustomer(r.customerId)}>{r.customerName}</button>,
    },
    { key: "items", label: "Items", render: r => itemsSummary(r.lines) },
    {
      key: "value", label: "Value", sortable: true, align: "right", sortValue: r => saleTotals(r.lines, r.gstPct).total,
      render: r => <strong>{formatINR(saleTotals(r.lines, r.gstPct).total)}</strong>,
    },
    { key: "status", label: "Status", sortable: true, sortValue: r => r.status, render: r => <Badge tone={quoteStatusTone[r.status]}>{r.status}</Badge> },
    { key: "validUntil", label: "Valid until" },
    { key: "executive", label: "Executive", defaultHidden: true },
    { key: "created", label: "Created", defaultHidden: true },
  ];

  const orderColumns: Column<SalesOrder>[] = [
    {
      key: "id", label: "Order", sortable: true, hideable: false, sortValue: r => r.id,
      render: r => <button type="button" className="link-btn" onClick={() => setView({ type: "order-detail", id: r.id })}>{r.id}</button>,
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: r => r.customerName,
      render: r => <button type="button" className="cell-link" onClick={() => onOpenCustomer(r.customerId)}>{r.customerName}</button>,
    },
    { key: "items", label: "Items", render: r => itemsSummary(r.lines) },
    {
      key: "value", label: "Value", sortable: true, align: "right", sortValue: r => saleTotals(r.lines, r.gstPct).total,
      render: r => <strong>{formatINR(saleTotals(r.lines, r.gstPct).total)}</strong>,
    },
    {
      key: "balance", label: "Balance", sortable: true, align: "right",
      sortValue: r => saleTotals(r.lines, r.gstPct).total - paidAmount(r),
      render: r => {
        const balance = saleTotals(r.lines, r.gstPct).total - paidAmount(r);
        if (r.status === "Cancelled") return <span className="muted">—</span>;
        return balance <= 0 ? <Badge tone="emerald">Paid</Badge> : <strong className="warning-text">{formatINR(balance)}</strong>;
      },
    },
    { key: "status", label: "Status", sortable: true, sortValue: r => r.status, render: r => <Badge tone={orderStatusTone[r.status]}>{r.status}</Badge> },
    { key: "invoice", label: "Invoice", defaultHidden: true, render: r => r.invoiceId ?? "—" },
    { key: "created", label: "Created", defaultHidden: true },
  ];

  /* ---------- detail / form views ---------- */

  if (view.type === "quote-detail") {
    const quote = quotations.find(q => q.id === view.id);
    if (!quote) {
      setView({ type: "quotes" });
      return null;
    }
    return (
      <QuotationDetail
        quote={quote}
        onBack={() => setView({ type: "quotes" })}
        onEdit={() => setView({ type: "quote-form", id: quote.id })}
        onConvert={() => convertQuote(quote)}
        onDuplicate={() => duplicateQuote(quote)}
        onOpenCustomer={onOpenCustomer}
        onOpenOrder={orderId => setView({ type: "order-detail", id: orderId })}
        onOpenProduct={onOpenProduct}
        onOpenQuotation={id => setView({ type: "quote-detail", id })}
      />
    );
  }

  if (view.type === "order-detail") {
    const order = orders.find(o => o.id === view.id);
    if (!order) {
      setView({ type: "orders" });
      return null;
    }
    return (
      <OrderDetail
        order={order}
        onBack={() => setView({ type: "orders" })}
        onOpenCustomer={onOpenCustomer}
        onOpenProduct={onOpenProduct}
        onOpenQuotation={quotationId => setView({ type: "quote-detail", id: quotationId })}
        onOpenProduction={onOpenProduction}
        onOpenShipment={onOpenShipment}
        onOpenFinanceDoc={onOpenFinanceDoc}
      />
    );
  }

  if (view.type === "quote-form") {
    const quote = view.id ? quotations.find(q => q.id === view.id) : undefined;
    return (
      <div className="page-stack">
        <button
          type="button"
          className="back-link"
          onClick={() => setView(quote ? { type: "quote-detail", id: quote.id } : { type: "quotes" })}
        >
          ← Back to {quote ? quote.id : "quotations"}
        </button>
        <QuoteEditor
          quote={quote}
          presetCustomerId={view.customerId}
          presetProductId={view.productId}
          onCancel={() => setView(quote ? { type: "quote-detail", id: quote.id } : { type: "quotes" })}
          onSave={draft => {
            if (quote) {
              updateQuotation(quote.id, draft, "Quotation revised");
              toast({ tone: "success", title: "Quotation revised", message: quote.id });
              setView({ type: "quote-detail", id: quote.id });
            } else {
              const created = addQuotation({ ...draft, status: "Draft" });
              toast({ tone: "success", title: "Quotation created", message: `${created.id} for ${created.customerName}.` });
              setView({ type: "quote-detail", id: created.id });
            }
          }}
        />
      </div>
    );
  }

  /* ---------- overview metrics ---------- */

  const openQuotes = quotations.filter(q => ["Draft", "Sent", "Negotiation"].includes(q.status));
  const openQuoteValue = openQuotes.reduce((s, q) => s + saleTotals(q.lines, q.gstPct).total, 0);
  const decided = quotations.filter(q => ["Accepted", "Converted", "Rejected", "Expired"].includes(q.status));
  const won = quotations.filter(q => ["Accepted", "Converted"].includes(q.status));
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const activeOrders = orders.filter(o => !["Completed", "Cancelled"].includes(o.status));
  const receivables = activeOrders.reduce((s, o) => s + Math.max(0, saleTotals(o.lines, o.gstPct).total - paidAmount(o)), 0);

  const quotePipeline = (["Draft", "Sent", "Negotiation", "Accepted", "Converted"] as QuoteStatus[]).map(status => ({
    label: status,
    value: quotations.filter(q => q.status === status).length,
    display: String(quotations.filter(q => q.status === status).length),
  }));
  const orderPipeline = orderStatuses
    .map(status => ({
      label: status,
      value: orders.filter(o => o.status === status).length,
      display: String(orders.filter(o => o.status === status).length),
    }))
    .filter(x => x.value > 0);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">SALES · QUOTATIONS & ORDERS</p>
          <h1>From quotation to delivery.</h1>
          <p>Customer-ready quotations, negotiated to acceptance, converted into orders with payments, stock, billing and dispatch.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setNewOrderOpen(true)}><Icon name="grid" /> Quick order</Button>
          <Button onClick={() => setView({ type: "quote-form" })}><Icon name="plus" /> New quotation</Button>
        </div>
      </div>
      <Tabs
        tabs={["Overview", "Quotations", "Orders"]}
        active={view.type === "overview" ? "Overview" : view.type === "quotes" ? "Quotations" : "Orders"}
        onChange={t => setView({ type: t === "Overview" ? "overview" : t === "Quotations" ? "quotes" : "orders" })}
        label="Sales views"
      />

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Open quotation value" value={lakh(openQuoteValue)} note={`${openQuotes.length} quotes in play`} icon="component" iconTone="royal" onClick={() => setView({ type: "quotes" })} />
            <KpiCard label="Win rate" value={`${winRate}%`} note={`${won.length} of ${decided.length} decided`} noteTone="up" icon="check" iconTone="emerald" />
            <KpiCard label="Active orders" value={String(activeOrders.length)} note={`${orders.length} total this season`} icon="grid" iconTone="royal" onClick={() => setView({ type: "orders" })} />
            <KpiCard label="Receivables on orders" value={lakh(receivables)} note="Balance across active orders" noteTone="warning" icon="warning" iconTone="gold" onClick={() => setView({ type: "orders" })} />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">QUOTE PIPELINE</p><h2>Where quotations stand</h2></div>
              </div>
              <BarList items={quotePipeline} />
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">ORDER BOOK</p><h2>Orders by status</h2></div>
              </div>
              <BarList items={orderPipeline} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">NEEDS ATTENTION</p><h2>Quotes to chase</h2></div>
              </div>
              <div className="feed">
                {quotations.filter(q => ["Sent", "Negotiation", "Accepted"].includes(q.status)).slice(0, 4).map(q => (
                  <button key={q.id} type="button" onClick={() => setView({ type: "quote-detail", id: q.id })}>
                    <span className="feed-icon gold"><Icon name="component" size={15} /></span>
                    <span className="feed-body">
                      <strong>{q.id} · {q.customerName}</strong>
                      <small>{q.status} · {formatINR(saleTotals(q.lines, q.gstPct).total)} · valid until {q.validUntil}</small>
                    </span>
                    <Badge tone={quoteStatusTone[q.status]}>{q.status}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">FULFILMENT</p><h2>Orders in motion</h2></div>
              </div>
              <div className="feed">
                {activeOrders.slice(0, 4).map(o => (
                  <button key={o.id} type="button" onClick={() => setView({ type: "order-detail", id: o.id })}>
                    <span className="feed-icon royal"><Icon name="grid" size={15} /></span>
                    <span className="feed-body">
                      <strong>{o.id} · {o.customerName}</strong>
                      <small>{itemsSummary(o.lines)} · {formatINR(saleTotals(o.lines, o.gstPct).total)}</small>
                    </span>
                    <Badge tone={orderStatusTone[o.status]}>{o.status}</Badge>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {view.type === "quotes" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">QUOTATIONS</p><h2>{filteredQuotes.length} quotations</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search quotations" aria-label="Search quotations" value={quoteQuery} onChange={e => setQuoteQuery(e.target.value)} />
              </div>
            </div>
          </div>
          <Tabs tabs={quoteTabs as unknown as string[]} active={quoteTab} onChange={t => setQuoteTab(t as typeof quoteTab)} label="Quotation status filter" />
          <DataTable
            columns={quoteColumns}
            rows={filteredQuotes}
            rowKey={r => r.id}
            pageSize={8}
            emptyState={
              <EmptyState
                icon="component"
                title="No matching quotations"
                description="Try another keyword or status, or create a new quotation."
                mini
                action={<Button variant="secondary" onClick={() => setView({ type: "quote-form" })}>New quotation</Button>}
              />
            }
          />
        </section>
      )}

      {view.type === "orders" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">SALES ORDERS</p><h2>{filteredOrders.length} orders</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search orders" aria-label="Search orders" value={orderQuery} onChange={e => setOrderQuery(e.target.value)} />
              </div>
              <div className="filter-anchor">
                <Button variant="secondary" onClick={() => setOrderFilterOpen(o => !o)} aria-expanded={orderFilterOpen}>
                  <Icon name="filter" /> Status{orderStatusFilter.length > 0 && ` · ${orderStatusFilter.length}`}
                </Button>
                {orderFilterOpen && (
                  <>
                    <div className="popover-backdrop" onClick={() => setOrderFilterOpen(false)} aria-hidden="true" />
                    <div className="filter-pop" role="group" aria-label="Filter by order status">
                      <p>FILTER BY STATUS</p>
                      {orderStatuses.map(status => (
                        <Checkbox
                          key={status}
                          label={status}
                          checked={orderStatusFilter.includes(status)}
                          onChange={on => setOrderStatusFilter(f => (on ? [...f, status] : f.filter(s => s !== status)))}
                        />
                      ))}
                      <button type="button" className="link-btn" onClick={() => setOrderStatusFilter([])}>Clear filter</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <DataTable
            columns={orderColumns}
            rows={filteredOrders}
            rowKey={r => r.id}
            pageSize={8}
            emptyState={
              <EmptyState
                icon="grid"
                title="No matching orders"
                description="Try another keyword or clear the status filter."
                mini
                action={<Button variant="secondary" onClick={() => { setOrderQuery(""); setOrderStatusFilter([]); }}>Clear filters</Button>}
              />
            }
          />
        </section>
      )}

      <NewOrderModal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} onSubmit={quickOrder} />
    </div>
  );
}
