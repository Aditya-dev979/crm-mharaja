import { useState } from "react";
import BarList from "@/components/data-display/BarList";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import SegmentBar from "@/components/data-display/SegmentBar";
import TrendChart from "@/components/data-display/TrendChart";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { chartColors, dashboardQuickActions, salesTrends } from "@/data/dashboardData";
import { docTotals } from "@/data/financeData";
import { poTotals } from "@/data/purchaseData";
import { saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useFinance } from "@/hooks/useFinance";
import { useInventory } from "@/hooks/useInventory";
import { usePostSales } from "@/hooks/usePostSales";
import { useQuality } from "@/hooks/useQuality";
import { useProducts } from "@/hooks/useProducts";
import { useProduction } from "@/hooks/useProduction";
import { usePurchase } from "@/hooks/usePurchase";
import { useAdmin } from "@/hooks/useAdmin";
import { useDispatch } from "@/hooks/useDispatch";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { BadgeTone } from "@/components/ui/Badge";
import type { Branch } from "@/types";
import { cn, formatINR } from "@/utils";

type DashboardMode = "Live" | "Loading" | "Empty" | "Error";
type TrendRange = "Daily" | "Weekly" | "Monthly";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const todayLine = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function SkeletonBlock() {
  return (
    <div className="skeleton-block" role="status" aria-label="Loading">
      <i /><i /><i />
    </div>
  );
}

export default function DashboardPage({
  activeBranch,
  onOpenModule,
  onQuickAction,
  onOpenRecord,
}: {
  activeBranch: Branch;
  onOpenModule: (module: string) => void;
  onQuickAction: (label: string) => void;
  onOpenRecord?: (recordId?: string, fallbackTarget?: string) => void;
}) {
  const toast = useToast();
  const { docs: financeDocs, tallyEntries, bankTransactions } = useFinance();
  const { requests: purchaseRequests, deviations, grns, pos } = usePurchase();
  const { gatePasses } = useInventory();
  const { tickets, feedback } = usePostSales();
  const { orders: salesOrders } = useSales();
  const { shipments } = useDispatch();
  const { orders: productionOrders, materials, lots, assignments } = useProduction();
  const { products } = useProducts();
  const { leads, customers } = useCrm();
  const { returns } = useQuality();

  const { activeRole } = useAdmin();
  const { teamNotifications } = useTeam();
  const unreadNotifications = teamNotifications.filter(n => n.unread).length;
  const [mode, setMode] = useState<DashboardMode>("Live");
  const [range, setRange] = useState<TrendRange>("Daily");
  const [opTab, setOpTab] = useState("Orders");

  const trend = salesTrends[range];
  const loading = mode === "Loading";

  const openModule = onOpenModule;
  const quickAction = onQuickAction;

  /* Pending actions: everything waiting on a decision, drawn live from each
     workspace so the dashboard never drifts from the records. */
  const pendingActions = [
    ...financeDocs
      .filter(d => d.pi?.status === "Pending Approval")
      .map(d => ({
        id: d.id,
        label: `Proforma ${d.id} awaiting approval`,
        meta: `${d.partyName} · ${formatINR(docTotals(d.lines, d.gstPct).total)}`,
        owner: "Approving Manager",
        tone: "amber" as const,
      })),
    ...purchaseRequests
      .filter(r => r.status === "Pending Approval")
      .map(r => ({ id: r.id, label: `Purchase request ${r.id}`, meta: `${r.items} · ${formatINR(r.estimatedCost)}`, owner: "Purchase Manager", tone: "amber" as const })),
    ...deviations
      .filter(d => !["Approved", "Partially Approved", "Rejected"].includes(d.status))
      .map(d => ({ id: d.id, label: `GRN deviation ${d.id}`, meta: `${d.supplierName} · ${d.deviationPct}% · ${d.grnId}`, owner: "Purchase Manager", tone: "danger" as const })),
    ...productionOrders
      .filter(o => o.status === "Quality Check")
      .map(o => ({ id: o.id, label: `${o.id} awaiting quality clearance`, meta: `${o.product} · ${o.producedQty} produced`, owner: "Plant Manager", tone: "royal" as const })),
    ...gatePasses
      .filter(g => g.status === "Pending Approval")
      .map(g => ({ id: g.id, label: `Gate pass ${g.id}`, meta: `${g.item} · ${g.issuedTo}`, owner: "Inventory Manager", tone: "amber" as const })),
    ...tickets
      .filter(t => t.priority === "High" && !["Resolved", "Closed"].includes(t.status))
      .map(t => ({ id: t.id, label: `Support ticket ${t.id}`, meta: `${t.customerName} · due ${t.dueDate}`, owner: t.assignedTo, tone: "danger" as const })),
    ...tallyEntries
      .filter(e => e.status === "Failed")
      .map(e => ({ id: e.id, label: `Accounting entry ${e.id} failed`, meta: `${e.party} · ${formatINR(e.amount)}`, owner: "Accounts Team", tone: "danger" as const })),
    ...bankTransactions
      .filter(b => b.matchState === "Unmatched")
      .map(b => ({ id: b.id, label: `Bank line ${b.id} unmatched`, meta: `${b.narration} · ${formatINR(b.amount)}`, owner: "Accounts Team", tone: "amber" as const })),
  ];

  /* One live row per workspace, read from the same stores the modules use. */
  const openOrders = salesOrders.filter(o => !["Completed", "Cancelled", "Delivered"].includes(o.status));
  const receivable = salesOrders.reduce((sum, o) => {
    const total = saleTotals(o.lines, o.gstPct).total;
    const paid = o.payments.reduce((t, p) => t + p.amount, 0);
    return o.status === "Cancelled" ? sum : sum + Math.max(0, total - paid);
  }, 0);
  const openGrns = grns.filter(g => !["Posted to Stock", "Rejected"].includes(g.status));
  const activeProduction = productionOrders.filter(o => o.status !== "Completed");
  const readyExternal = assignments.reduce((t, a) => t + a.readyQty, 0);
  const lowMaterials = materials.filter(m => m.available <= m.reorderLevel).length;
  const openLots = lots.filter(l => l.remaining > 0);
  const inTransit = shipments.filter(sh => ["Packing", "Dispatched", "In Transit", "Ready to Dispatch"].includes(sh.status));
  const unmatchedBank = bankTransactions.filter(b => b.matchState !== "Matched").length;

  /* ---------- live figures for every KPI and chart on this page ---------- */
  const orderTotal = (o: (typeof salesOrders)[number]) => saleTotals(o.lines, o.gstPct).total;
  const liveOrders = salesOrders.filter(o => o.status !== "Cancelled");
  const monthSales = liveOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const paidSoFar = liveOrders.reduce((sum, o) => sum + o.payments.reduce((t, p) => t + p.amount, 0), 0);
  const pendingOrders = salesOrders.filter(o => ["Confirmed", "Payment Pending", "Partially Paid", "Processing"].includes(o.status));
  const awaitingPayment = salesOrders.filter(o => ["Payment Pending", "Partially Paid"].includes(o.status)).length;
  const newLeads = leads.filter(l => !["Converted", "Lost"].includes(l.status));
  const unattendedLeads = leads.filter(l => l.status === "New").length;
  const payable = pos.reduce((sum, po) => {
    if (po.status === "Cancelled") return sum;
    const paid = po.payments.reduce((t, p) => t + p.amount, 0);
    return sum + Math.max(0, poTotals(po).total - paid);
  }, 0);
  const stockValue = products.reduce((sum, p) => sum + p.sellingPrice * Math.max(p.stock, 0), 0);
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 2);

  const liveKpis: Array<{ label: string; value: string; note: string; noteTone?: "up" | "warning"; icon: IconName; iconTone: "royal" | "gold" | "emerald"; module: string }> = [
    { label: "Order book", value: formatINR(monthSales), note: `${liveOrders.length} live order${liveOrders.length === 1 ? "" : "s"}`, icon: "grid", iconTone: "royal", module: "Orders" },
    { label: "Collected", value: formatINR(paidSoFar), note: `${formatINR(receivable)} still receivable`, noteTone: receivable > 0 ? "warning" : "up", icon: "wallet", iconTone: "emerald", module: "Accounts · Receivables" },
    { label: "Pending orders", value: String(pendingOrders.length), note: `${awaitingPayment} awaiting payment`, noteTone: awaitingPayment ? "warning" : undefined, icon: "calendar", iconTone: "gold", module: "Orders" },
    { label: "Customers", value: String(customers.length), note: `${customers.filter(c => c.segment === "VIP").length} VIP account${customers.filter(c => c.segment === "VIP").length === 1 ? "" : "s"}`, icon: "user", iconTone: "emerald", module: "Customers" },
    { label: "Open leads", value: String(newLeads.length), note: `${unattendedLeads} not yet contacted`, noteTone: unattendedLeads ? "warning" : undefined, icon: "plus", iconTone: "gold", module: "CRM · Leads" },
    { label: "Payables", value: formatINR(payable), note: `${pos.filter(po => !["Closed", "Cancelled"].includes(po.status)).length} open purchase order(s)`, icon: "building", iconTone: "gold", module: "Accounts · Payables" },
    { label: "Finished-goods value", value: formatINR(stockValue), note: `${products.length} SKU${products.length === 1 ? "" : "s"} in the catalogue`, icon: "layers", iconTone: "emerald", module: "Inventory" },
    { label: "Low stock", value: String(lowStockProducts.length + lowMaterials), note: `${lowMaterials} material line(s), ${lowStockProducts.length} SKU(s)`, noteTone: lowStockProducts.length + lowMaterials ? "warning" : undefined, icon: "warning", iconTone: "gold", module: "Inventory · Low stock" },
  ];

  /* Sales by product family, read from the order lines themselves. */
  const familyOf = (sku: string) => products.find(p => p.sku === sku)?.category ?? "Other";
  const familyTotals = new Map<string, number>();
  liveOrders.forEach(o =>
    o.lines.forEach(l => {
      const family = familyOf(l.sku);
      const value = l.price * l.qty * (1 - l.discountPct / 100);
      familyTotals.set(family, (familyTotals.get(family) ?? 0) + value);
    }),
  );
  const categorySalesLive = [...familyTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value / 100000), display: `₹${(value / 100000).toFixed(1)}L` }));

  /* Lead funnel straight from the CRM pipeline. */
  const funnelStages: Array<[string, string[]]> = [
    ["New & contacted", ["New", "Contacted"]],
    ["Interested", ["Interested", "Product Shared"]],
    ["Quoted", ["Quotation Sent", "Negotiation"]],
    ["Converted", ["Converted"]],
  ];
  const leadFunnelLive = funnelStages.map(([label, states]) => {
    const count = leads.filter(l => states.includes(l.status)).length;
    return { label, value: count, display: `${count} lead${count === 1 ? "" : "s"}` };
  });

  const customerStatsLive = [
    { label: "Customers", value: String(customers.length), note: `${customers.filter(c => c.segment === "New").length} onboarded recently`, up: true },
    { label: "Open leads", value: String(newLeads.length), note: `${leads.filter(l => l.priority === "Hot").length} hot`, up: false },
    { label: "Conversion", value: `${leads.length ? Math.round((leads.filter(l => l.status === "Converted").length / leads.length) * 100) : 0}%`, note: `${leads.filter(l => l.status === "Lost").length} lost`, up: false },
    { label: "Avg. rating", value: feedback.filter(f => f.rating > 0).length ? `${(feedback.filter(f => f.rating > 0).reduce((t, f) => t + f.rating, 0) / feedback.filter(f => f.rating > 0).length).toFixed(1)} / 5` : "—", note: `${feedback.length} response(s)`, up: true },
  ];

  const inventoryChipsLive = [
    { label: "SKUs", value: String(products.length), note: `${products.filter(p => p.status === "Available").length} available`, up: true },
    { label: "FIFO lots open", value: String(openLots.length), note: `${lots.length} lot(s) on record`, up: false },
    { label: "Material lines", value: String(materials.length), note: lowMaterials ? `${lowMaterials} below reorder` : "All above reorder", up: false },
    { label: "Stock value", value: formatINR(stockValue), note: "At selling price", up: true },
  ];

  const statusCount = (status: string) => products.filter(p => p.status === status).length;
  const inventorySegmentsLive = [
    { label: "Available", value: statusCount("Available"), color: chartColors.emerald },
    { label: "Reserved", value: statusCount("Reserved"), color: chartColors.royal },
    { label: "Under inspection", value: statusCount("Under Inspection"), color: chartColors.amber },
    { label: "Dispatched / sold", value: statusCount("Dispatched") + statusCount("Sold"), color: chartColors.gold },
  ].filter(seg => seg.value > 0);

  /* Operational queues, each one a live slice of its own store. */
  const opQueues: Array<{
    key: string;
    headers: string[];
    viewAll: string;
    rows: Array<{ id: string; cells: [string, string, string]; status: string; tone: BadgeTone }>;
  }> = [
    {
      key: "Orders",
      headers: ["Order", "Customer", "Value", "Owner", "Status"],
      viewAll: "Orders",
      rows: pendingOrders.slice(0, 6).map(o => ({
        id: o.id,
        cells: [o.customerName, formatINR(orderTotal(o)), o.executive],
        status: o.status,
        tone: (o.status === "Ready" ? "emerald" : o.status === "Payment Pending" ? "danger" : "amber") as BadgeTone,
      })),
    },
    {
      key: "Purchase",
      headers: ["GRN", "Supplier", "Received", "Inspector", "Status"],
      viewAll: "Purchase",
      rows: openGrns.slice(0, 6).map(g => ({
        id: g.id,
        cells: [g.supplierName, g.receivedDate, g.inspector ?? "Unassigned"],
        status: g.status,
        tone: (g.status === "Rejected" ? "danger" : g.status === "Approved" ? "emerald" : "amber") as BadgeTone,
      })),
    },
    {
      key: "Production",
      headers: ["Order", "Product", "Progress", "Responsible", "Status"],
      viewAll: "Production",
      rows: activeProduction.slice(0, 6).map(o => ({
        id: o.id,
        cells: [o.product, `${o.producedQty} of ${o.plannedQty}`, o.responsible],
        status: o.status,
        tone: (o.status === "Quality Check" ? "royal" : "amber") as BadgeTone,
      })),
    },
    {
      key: "Dispatch",
      headers: ["Shipment", "Customer", "Transport", "Coordinator", "Status"],
      viewAll: "Dispatch",
      rows: inTransit.slice(0, 6).map(sh => ({
        id: sh.id,
        cells: [sh.customerName, sh.transport?.transporter ?? sh.courier ?? "Not assigned", sh.coordinator ?? "—"],
        status: sh.status,
        tone: (sh.status === "In Transit" ? "royal" : "amber") as BadgeTone,
      })),
    },
    {
      key: "Returns",
      headers: ["Return", "Customer", "Product", "Value", "Status"],
      viewAll: "Quality",
      rows: returns.slice(0, 6).map(r => ({
        id: r.id,
        cells: [r.customerName, r.product, formatINR(r.amount)],
        status: r.status,
        tone: (["Refund Processed", "Credit Note Issued", "Stock Reconciled"].includes(r.status) ? "emerald" : r.status === "Rejected" ? "danger" : "amber") as BadgeTone,
      })),
    },
  ];
  const activeQueue = opQueues.find(q => q.key === opTab) ?? opQueues[0];

  /* Recent activity, merged from the timelines the modules actually write. */
  const recentActivity = [
    ...salesOrders.slice(0, 4).map(o => ({ text: `${o.id} · ${o.timeline[0]?.text ?? o.status}`, module: "Sales", time: o.timeline[0]?.time ?? o.created, tone: "royal", icon: "grid" as IconName, target: "Orders" })),
    ...grns.slice(0, 3).map(g => ({ text: `${g.id} · ${g.timeline[0]?.text ?? g.status}`, module: "Purchase", time: g.timeline[0]?.time ?? g.receivedDate, tone: "amber", icon: "building" as IconName, target: "Purchase" })),
    ...productionOrders.slice(0, 3).map(o => ({ text: `${o.id} · ${o.timeline[0]?.text ?? o.status}`, module: "Production", time: o.timeline[0]?.time ?? o.plannedStart, tone: "emerald", icon: "layers" as IconName, target: "Production" })),
    ...shipments.slice(0, 3).map(sh => ({ text: `${sh.id} · ${sh.timeline[0]?.text ?? sh.status}`, module: "Dispatch", time: sh.timeline[0]?.time ?? sh.created, tone: "royal", icon: "send" as IconName, target: "Dispatch" })),
  ].slice(0, 9);

  const snapshot: Array<{ id: string; label: string; value: string; note: string; icon: IconName; target: string }> = [
    { id: "sales", label: "Open orders", value: String(openOrders.length), note: `${formatINR(receivable)} receivable`, icon: "component", target: "Orders" },
    { id: "purchase", label: "GRNs in progress", value: String(openGrns.length), note: `${deviations.filter(d => !["Approved", "Partially Approved", "Rejected"].includes(d.status)).length} deviation(s) open`, icon: "building", target: "Purchase" },
    { id: "production", label: "In production", value: String(activeProduction.length), note: `${readyExternal} ready at contract units`, icon: "layers", target: "Production" },
    { id: "inventory", label: "Open FIFO lots", value: String(openLots.length), note: lowMaterials ? `${lowMaterials} material line(s) below reorder` : "All materials above reorder", icon: "grid", target: "Inventory" },
    { id: "dispatch", label: "Shipments moving", value: String(inTransit.length), note: `${shipments.filter(sh => sh.status === "Delivered").length} delivered`, icon: "send", target: "Dispatch" },
    { id: "accounts", label: "Bank lines to clear", value: String(unmatchedBank), note: `${tallyEntries.filter(e => e.status !== "Synced").length} accounting entr(ies) pending`, icon: "wallet", target: "Accounts" },
  ];

  return (
    <div className="page-stack">
      <div className="dash-head">
        <div>
          <p className="eyebrow">OPERATIONS DASHBOARD</p>
          <h1>{greeting()}, Arjun.</h1>
          <p className="muted-line">
            {todayLine} · Here’s how the business is moving today.
          </p>
          <div className="dash-context">
            <span className="context-chip"><Icon name="user" size={13} /> Arjun Sharma</span>
            <span className="context-chip"><Icon name="shield" size={13} /> {activeRole}</span>
            <span className="context-chip"><Icon name="building" size={13} /> {activeBranch.name}</span>
            <span className="context-chip"><Icon name="bell" size={13} /> {unreadNotifications} unread</span>
          </div>
        </div>
        <div className="screen-switcher dash-switcher">
          <span id="dash-state-label">Preview state</span>
          <div role="tablist" aria-labelledby="dash-state-label">
            {(["Live", "Loading", "Empty", "Error"] as DashboardMode[]).map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? "active" : ""}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && mode === "Live" && (
        <section className="panel snapshot-panel">
          <div className="section-head">
            <div><p className="kicker">TODAY ACROSS THE HOUSE</p><h2>Operations snapshot</h2></div>
            <span>Live from every workspace</span>
          </div>
          <div className="snapshot-grid">
            {snapshot.map(item => (
              <button key={item.id} type="button" className="snapshot-tile" onClick={() => openModule(item.target)}>
                <span className="snapshot-icon"><Icon name={item.icon} size={15} /></span>
                <strong>{item.value}</strong>
                <span className="snapshot-label">{item.label}</span>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {pendingActions.length > 0 && !loading && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">PENDING ACTIONS</p><h2>{pendingActions.length} decisions waiting</h2></div>
            <Badge tone={pendingActions.some(a => a.tone === "danger") ? "danger" : "amber"}>
              {pendingActions.filter(a => a.tone === "danger").length} urgent
            </Badge>
          </div>
          <div className="related-list">
            {pendingActions.slice(0, 8).map(a => (
              <button key={a.id} type="button" onClick={() => onOpenRecord?.(a.id)}>
                <span className="doc-icon"><Icon name="warning" /></span>
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.meta} · {a.owner}</small>
                </span>
                <Badge tone={a.tone}>{a.tone === "danger" ? "Urgent" : "Waiting"}</Badge>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="quick-strip" role="group" aria-label="Quick actions">
        {dashboardQuickActions.map(action => (
          <button key={action.label} type="button" onClick={() => quickAction(action.label)}>
            <span><Icon name={action.icon} size={15} /></span>
            {action.label}
          </button>
        ))}
      </div>

      {mode === "Empty" && (
        <EmptyState
          className="panel"
          icon="grid"
          title="No business data yet"
          description="KPIs, analytics and live operations appear here as soon as your first leads, orders and stock are recorded."
          action={
            <Button onClick={() => { setMode("Live"); toast({ tone: "success", title: "Sample data loaded", message: "Showing the live dashboard preview." }); }}>
              Load sample data
            </Button>
          }
        />
      )}

      {mode === "Error" && (
        <EmptyState
          className="panel"
          icon="error"
          tone="error"
          title="We couldn’t load your dashboard"
          description="The overview service didn’t respond. Your data is safe — try again in a moment."
          action={
            <Button onClick={() => { setMode("Live"); toast({ tone: "success", title: "Dashboard restored", message: "All widgets are live again." }); }}>
              Try again
            </Button>
          }
        />
      )}

      {(mode === "Live" || loading) && (
        <>
          <div className="dash-kpis">
            {liveKpis.map(kpi =>
              loading ? (
                <KpiCard key={kpi.label} label={kpi.label} loading />
              ) : (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  note={kpi.note}
                  noteTone={kpi.noteTone}
                  icon={kpi.icon}
                  iconTone={kpi.iconTone}
                  onClick={() => openModule(kpi.module)}
                />
              ),
            )}
          </div>

          <div className="dash-grid">
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="kicker">SALES ANALYTICS · SAMPLE SERIES</p>
                  <h2>Sales trend</h2>
                </div>
                {!loading && (
                  <span className="trend-delta">
                    <Badge tone="emerald">{trend.delta}</Badge> {trend.summary}
                  </span>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : (
                <>
                  <Tabs tabs={["Daily", "Weekly", "Monthly"]} active={range} onChange={r => setRange(r as TrendRange)} label="Sales trend range" />
                  <TrendChart
                    points={trend.points}
                    formatValue={v => `₹${v % 1 === 0 ? v : v.toFixed(1)}L`}
                    currentLabel="This period"
                    previousLabel="Previous period"
                  />
                  <p className="chart-unit">{trend.unit} · illustrative series — this prototype holds no historical periods, so the shape is sample data. Every other figure on this page is read from the live records.</p>
                </>
              )}
            </section>
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="kicker">CATEGORY SALES</p>
                  <h2>Order book by product family</h2>
                </div>
                {!loading && (
                  <button type="button" className="link-btn" onClick={() => openModule("Sales reports")}>View report</button>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : categorySalesLive.length ? (
                <BarList items={categorySalesLive} />
              ) : (
                <EmptyState icon="grid" title="No orders yet" description="Product families appear here as soon as an order is confirmed." mini />
              )}
            </section>
          </div>

          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="kicker">CUSTOMER ANALYTICS</p>
                  <h2>Relationships & conversion</h2>
                </div>
                {!loading && (
                  <button type="button" className="link-btn" onClick={() => openModule("Customers")}>View customers</button>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="stat-chips">
                    {customerStatsLive.map(stat => (
                      <div key={stat.label} className={cn("stat-chip", stat.up && "up")}>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                        <small>{stat.note}</small>
                      </div>
                    ))}
                  </div>
                  <p className="mini-title">LEAD CONVERSION FUNNEL · LIVE PIPELINE</p>
                  <BarList items={leadFunnelLive} />
                </>
              )}
            </section>
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="kicker">INVENTORY OVERVIEW</p>
                  <h2>Stock health</h2>
                </div>
                {!loading && (
                  <button type="button" className="link-btn" onClick={() => openModule("Inventory")}>View inventory</button>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : (
                <>
                  <div className="stat-chips">
                    {inventoryChipsLive.map(chip => (
                      <div key={chip.label} className={cn("stat-chip", chip.up && "up")}>
                        <span>{chip.label}</span>
                        <strong>{chip.value}</strong>
                        <small>{chip.note}</small>
                      </div>
                    ))}
                  </div>
                  <p className="mini-title">CURRENT STOCK BY STATUS</p>
                  <SegmentBar segments={inventorySegmentsLive} />
                </>
              )}
            </section>
          </div>

          <div className="dash-grid">
            <section className="panel table-panel">
              <div className="section-head">
                <div>
                  <p className="kicker">LIVE OPERATIONS</p>
                  <h2>Needs your attention</h2>
                </div>
                {!loading && (
                  <button type="button" className="link-btn" onClick={() => openModule(activeQueue.viewAll)}>
                    View all {activeQueue.key.toLowerCase()}
                  </button>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : (
                <>
                  <Tabs tabs={opQueues.map(q => q.key)} active={opTab} onChange={setOpTab} label="Operational queues" />
                  {activeQueue.rows.length === 0 ? (
                    <EmptyState icon="check" title={`Nothing waiting in ${activeQueue.key.toLowerCase()}`} description="This queue is clear right now." mini />
                  ) : (
                    <div className="table-wrap op-table">
                      <table>
                        <thead>
                          <tr>{activeQueue.headers.map(h => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {activeQueue.rows.map(row => (
                            <tr key={row.id}>
                              <td>
                                <button type="button" className="link-btn" onClick={() => onOpenRecord?.(row.id, activeQueue.viewAll)}>{row.id}</button>
                              </td>
                              <td>{row.cells[0]}</td>
                              <td>{row.cells[1]}</td>
                              <td><strong>{row.cells[2]}</strong></td>
                              <td><Badge tone={row.tone}>{row.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="kicker">RECENT ACTIVITY</p>
                  <h2>Across the business</h2>
                </div>
                {!loading && (
                  <button type="button" className="link-btn" onClick={() => openModule("Audit trail")}>Full timeline</button>
                )}
              </div>
              {loading ? (
                <SkeletonBlock />
              ) : (
                <div className="feed">
                  {recentActivity.map(event => (
                    <button key={event.text} type="button" onClick={() => openModule(event.target)}>
                      <span className={`feed-icon ${event.tone}`}><Icon name={event.icon} size={16} /></span>
                      <span className="feed-body">
                        <strong>{event.text}</strong>
                        <small>{event.module} · {event.time}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
