import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import GatePassHub from "@/components/inventory/GatePassHub";
import { AddLocationModal, ConfirmModal, NewSessionModal, NewTransferModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import { AdjustStockModal } from "@/components/products/ProductModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { movementTone, transferTone, verificationTone } from "@/data/inventoryData";
import { productStatusTone } from "@/data/productData";
import { dateRank } from "@/data/financeData";
import { useAdmin } from "@/hooks/useAdmin";
import { useInventory } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { Product, StockMovement, StockMovementType, TransferRequest, VerificationSession } from "@/types";
import { downloadCsv, cn, formatINR } from "@/utils";

const inventoryTabs = ["Overview", "Stock", "History", "Transfers", "Verification", "Gate Pass", "Locations"];
const stockStatusTabs = ["All Stock", "Available", "Reserved", "Sold", "Under Inspection", "Damaged"];
const movementTypes: Array<"All types" | StockMovementType> = [
  "All types", "Purchase", "GRN", "Stock In", "Reservation", "Sale", "Dispatch", "Stock Out", "Transfer", "Adjustment", "Return", "Inspection", "Production", "Material Issue", "Gate Pass",
];

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

const chainSteps: StockMovementType[] = ["Purchase", "GRN", "Stock In", "Reservation", "Sale", "Dispatch", "Stock Out"];

export default function InventoryPage({
  initialTab,
  onTabHandled,
  onOpenProduct,
  intent,
  onIntentHandled,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  onOpenProduct: (productId: string) => void;
  intent?: string | null;
  onIntentHandled?: () => void;
}) {
  const { products, movements, locations, logMovement, updateProduct, addLocation } = useProducts();
  const { transfers, sessions, addTransfer, updateTransfer, addSession, updateSession, setCount } = useInventory();
  const { addNotification, logAudit } = useTeam();
  const toast = useToast();

  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    if (!initialTab) return;
    if (inventoryTabs.includes(initialTab)) setTab(initialTab);
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const { getControl } = useAdmin();
  const verificationInterval = getControl("verificationInterval", 14);

  /* Fortnightly physical verification: every location carries a due date derived
     from its last completed session and the configured interval. */
  const verificationSchedule = locations.map(location => {
    const done = sessions
      .filter(x => x.location === location && ["Adjusted", "Awaiting Approval"].includes(x.status))
      .sort((a, b) => dateRank(b.date) - dateRank(a.date))[0];
    const lastRank = done ? dateRank(done.date) : 0;
    /* dateRank returns a very large value for "Today"/"Just now" entries. */
    const daysSince = !lastRank
      ? null
      : lastRank > 1e9
        ? 0
        : Math.round((Date.UTC(2026, 2, 8) - Date.UTC(Math.floor(lastRank / 10000), Math.floor((lastRank % 10000) / 100) - 1, lastRank % 100)) / 86400000);
    const overdue = daysSince === null ? true : daysSince > verificationInterval;
    return {
      location,
      session: done,
      lastDate: done ? done.date : "Never",
      by: done ? done.startedBy : "—",
      variance: done ? done.lines.filter(l => l.counted !== null && l.counted !== l.expected).length : 0,
      dueLabel: daysSince === null
        ? "Immediately"
        : overdue
          ? `${daysSince - verificationInterval} day(s) overdue`
          : `in ${verificationInterval - daysSince} day(s)`,
      overdue,
    };
  });
  const overdueLocations = verificationSchedule.filter(r => r.overdue);

  useEffect(() => {
    if (intent === "gate-pass") {
      setTab("Gate Pass");
      onIntentHandled?.();
    }
  }, [intent, onIntentHandled]);
  const [stockStatus, setStockStatus] = useState("All Stock");
  const [stockQuery, setStockQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [selected, setSelected] = useState<string[]>([]);
  const [historyType, setHistoryType] = useState<(typeof movementTypes)[number]>("All types");
  const [historyQuery, setHistoryQuery] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPreset, setTransferPreset] = useState<string | undefined>(undefined);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);

  /* ---------- derived metrics ---------- */

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const stockValue = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
  const availableUnits = products.filter(p => p.status === "Available").reduce((s, p) => s + p.stock, 0);
  const reservedCount = products.filter(p => p.status === "Reserved").length;
  const inspectionCount = products.filter(p => p.status === "Under Inspection" || p.status === "In Repair").length;
  const damagedCount = products.filter(p => p.status === "Damaged").length;
  const lowStock = products.filter(p => p.status === "Available" && p.stock <= 1);
  const pendingTransfers = transfers.filter(t => t.status === "Pending Approval").length;

  const valueByLocation = locations
    .map(loc => ({
      label: loc.replace("Vapi Plant · ", "Jaipur · ").replace("Ahmedabad Depot · ", "Mumbai · ").replace("Delhi Depot · ", "Delhi · "),
      value: products.filter(p => p.location === loc).reduce((s, p) => s + p.purchasePrice * p.stock, 0),
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(x => ({ ...x, display: lakh(x.value) }));

  /* ---------- stock table ---------- */

  const stockRows = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    return products.filter(p => {
      if (stockStatus !== "All Stock" && p.status !== stockStatus) return false;
      if (locationFilter !== "All locations" && p.location !== locationFilter) return false;
      if (!q) return true;
      return `${p.sku} ${p.name} ${p.category} ${p.location}`.toLowerCase().includes(q);
    });
  }, [products, stockStatus, stockQuery, locationFilter]);

  const stockColumns: Column<Product>[] = [
    {
      key: "sku", label: "Product", sortable: true, hideable: false, sortValue: p => p.sku,
      render: p => (
        <button type="button" className="table-product" onClick={() => onOpenProduct(p.id)}>
          <GemImage tone={p.images.find(i => i.id === p.primaryImageId)?.tone ?? "gold"} size="thumb" className="table-thumb" />
          <span><b className="link">{p.sku}</b><small>{p.name}</small></span>
        </button>
      ),
    },
    { key: "category", label: "Category", defaultHidden: true },
    {
      key: "weight", label: "Weight",
      render: p => (p.carat !== undefined ? `${p.carat} / ctn` : p.weightGrams !== undefined ? `${p.weightGrams} g` : "—"),
    },
    { key: "stock", label: "Qty", sortable: true, align: "right", sortValue: p => p.stock, render: p => String(p.stock) },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", sortable: true, sortValue: p => p.status, render: p => <Badge tone={productStatusTone[p.status]}>{p.status}</Badge> },
    { key: "purchasePrice", label: "Purchase", defaultHidden: true, render: p => formatINR(p.purchasePrice) },
    { key: "sellingPrice", label: "Selling", defaultHidden: true, render: p => formatINR(p.sellingPrice) },
    {
      key: "value", label: "Stock value", sortable: true, align: "right", sortValue: p => p.purchasePrice * p.stock,
      render: p => <strong>{p.stock > 0 ? formatINR(p.purchasePrice * p.stock) : "—"}</strong>,
    },
    { key: "updated", label: "Last updated", render: p => p.activity[0]?.time ?? p.created },
    {
      key: "actions", label: "", hideable: false,
      render: p => (
        <span className="row-actions">
          <button type="button" className="link-btn" onClick={() => setAdjustTarget(p)}>Adjust</button>
          <button type="button" className="link-btn" onClick={() => { setTransferPreset(p.id); setTransferOpen(true); }}>Transfer</button>
        </span>
      ),
    },
  ];

  /* ---------- history table ---------- */

  const historyRows = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return movements.filter(m => {
      if (historyType !== "All types" && m.type !== historyType) return false;
      if (!q) return true;
      return `${m.sku} ${m.product} ${m.user} ${m.note ?? ""}`.toLowerCase().includes(q);
    });
  }, [movements, historyType, historyQuery]);

  const historyColumns: Column<StockMovement>[] = [
    { key: "time", label: "When", hideable: false },
    {
      key: "sku", label: "Reference",
      render: m => {
        const product = products.find(p => p.sku === m.sku);
        return product ? (
          <button type="button" className="link-btn" onClick={() => onOpenProduct(product.id)}>{m.sku}</button>
        ) : (
          <b>{m.sku}</b>
        );
      },
    },
    { key: "product", label: "Item" },
    { key: "type", label: "Movement", render: m => <Badge tone={movementTone[m.type]}>{m.type}</Badge> },
    {
      key: "qty", label: "Qty",
      render: m => (m.qty === 0 ? "—" : <strong className={m.qty > 0 ? "up-text" : "warning-text"}>{m.qty > 0 ? `+${m.qty}` : m.qty}</strong>),
    },
    { key: "location", label: "Location", defaultHidden: true },
    { key: "user", label: "By" },
    { key: "note", label: "Details", render: m => <span className="note-cell">{m.note ?? "—"}</span> },
  ];

  /* ---------- transfer actions ---------- */

  const submitTransfer = (productId: string, qty: number, destination: string, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const created = addTransfer({
      productId, sku: product.sku, product: product.name, qty,
      source: product.location, destination, reason, requestedBy: "Arjun Sharma",
    });
    logMovement({ sku: product.sku, product: product.name, type: "Transfer", qty: 0, location: product.location, note: `${created.id} requested → ${destination}` });
    setTransferOpen(false);
    setTransferPreset(undefined);
    toast({ tone: "success", title: "Transfer requested", message: `${created.id} is awaiting approval.` });
  };

  const approveTransfer = (t: TransferRequest) =>
    setConfirm({
      title: `Approve ${t.id}?`,
      message: <>Move {t.qty} × {t.product} from <strong>{t.source}</strong> to <strong>{t.destination}</strong>. Stock relocates when it is marked received.</>,
      confirmLabel: "Approve — in transit",
      action: () => {
        updateTransfer(t.id, { status: "In Transit", decidedBy: "Arjun Sharma" });
        logMovement({ sku: t.sku, product: t.product, type: "Transfer", qty: 0, location: t.source, note: `${t.id} approved — in transit to ${t.destination}` });
        toast({ tone: "success", title: "Transfer approved", message: `${t.id} is now in transit.` });
        setConfirm(null);
      },
    });

  const rejectTransfer = (t: TransferRequest) =>
    setConfirm({
      title: `Reject ${t.id}?`,
      danger: true,
      message: <>The stock stays at {t.source}. The request is kept for the audit trail.</>,
      confirmLabel: "Reject transfer",
      action: () => {
        updateTransfer(t.id, { status: "Rejected", decidedBy: "Arjun Sharma" });
        logMovement({ sku: t.sku, product: t.product, type: "Transfer", qty: 0, location: t.source, note: `${t.id} rejected` });
        toast({ tone: "info", title: "Transfer rejected", message: t.id });
        setConfirm(null);
      },
    });

  const receiveTransfer = (t: TransferRequest) =>
    setConfirm({
      title: `Mark ${t.id} received?`,
      message: <>Confirms {t.qty} × {t.product} arrived at <strong>{t.destination}</strong>. The product location updates and the movement is posted.</>,
      confirmLabel: "Confirm received",
      action: () => {
        updateTransfer(t.id, { status: "Completed" });
        updateProduct(t.productId, { location: t.destination }, `Transferred to ${t.destination} (${t.id})`);
        logMovement({ sku: t.sku, product: t.product, type: "Transfer", qty: 0, location: t.destination, note: `${t.id} completed — received at ${t.destination}` });
        toast({ tone: "success", title: "Transfer completed", message: `${t.sku} is now at ${t.destination}.` });
        setConfirm(null);
      },
    });

  /* ---------- verification actions ---------- */

  const startSession = (location: string) => {
    const lines = products
      .filter(p => p.location === location)
      .map(p => ({ productId: p.id, sku: p.sku, product: p.name, expected: p.stock, counted: null }));
    const created = addSession(location, lines);
    setSessionModalOpen(false);
    setSelectedSessionId(created.id);
    toast({ tone: "success", title: "Verification started", message: `${created.id} · count ${lines.length} products at ${location}.` });
  };

  const submitSession = (session: VerificationSession) => {
    updateSession(session.id, { status: "Awaiting Approval" });
    toast({ tone: "info", title: "Submitted for approval", message: `${session.id} needs a manager to approve adjustments.` });
  };

  const approveSession = (session: VerificationSession) => {
    const variances = session.lines.filter(l => l.counted !== null && l.counted !== l.expected);
    setConfirm({
      title: `Approve ${session.id}?`,
      message:
        variances.length === 0 ? (
          <>All counts match the book stock. The session closes with no adjustments.</>
        ) : (
          <>{variances.length} line{variances.length > 1 ? "s" : ""} differ from book stock. Approving posts stock adjustments and audit entries for each difference.</>
        ),
      confirmLabel: variances.length ? "Approve & adjust stock" : "Approve — no changes",
      action: () => {
        variances.forEach(line => {
          const delta = (line.counted ?? 0) - line.expected;
          updateProduct(line.productId, { stock: line.counted ?? 0 }, `Stock corrected to ${line.counted} — physical verification ${session.id}`);
          logMovement({ sku: line.sku, product: line.product, type: "Adjustment", qty: delta, location: session.location, note: `${session.id} variance approved (${delta > 0 ? "+" : ""}${delta})` });
          addNotification({
            type: "Stock Status Update", priority: Math.abs(delta) > 2 ? "High" : "Normal",
            title: `${line.sku} adjusted ${delta > 0 ? "+" : ""}${delta}`,
            message: `${session.location} · counted ${line.counted} against book ${line.expected} — ${session.id}.`,
            reference: line.sku,
            recordRef: { kind: "product", id: line.sku },
          });
        });
        updateSession(session.id, { status: "Adjusted", approvedBy: "Arjun Sharma" });
        toast({
          tone: "success",
          title: `${session.id} approved`,
          message: variances.length ? `${variances.length} stock adjustment${variances.length > 1 ? "s" : ""} posted.` : "Counts matched — no adjustments needed.",
        });
        setConfirm(null);
      },
    });
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? sessions[0] ?? null;

  const varianceSummary = (session: VerificationSession) => {
    const counted = session.lines.filter(l => l.counted !== null).length;
    const variances = session.lines.filter(l => l.counted !== null && l.counted !== l.expected).length;
    return `${counted}/${session.lines.length} counted · ${variances} variance${variances === 1 ? "" : "s"}`;
  };

  /* ---------- render ---------- */

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">INVENTORY · WAREHOUSE & STOCK CONTROL</p>
          <h1>Every batch, accounted for.</h1>
          <p>Live stock by status and location, a full movement ledger, approved transfers and physical verification.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setSessionModalOpen(true)}><Icon name="check" /> Start verification</Button>
          <Button onClick={() => { setTransferPreset(undefined); setTransferOpen(true); }}><Icon name="building" /> New transfer</Button>
        </div>
      </div>
      <Tabs tabs={inventoryTabs} active={tab} onChange={setTab} label="Inventory views" />

      {tab === "Overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Units in stock" value={String(totalUnits)} note={`${products.length} catalogue lines`} icon="layers" iconTone="royal" onClick={() => setTab("Stock")} />
            <KpiCard label="Stock value" value={lakh(stockValue)} note="At purchase price" icon="gem" iconTone="emerald" />
            <KpiCard label="Available units" value={String(availableUnits)} note={`${reservedCount} products reserved`} icon="check" iconTone="emerald" onClick={() => { setStockStatus("Available"); setTab("Stock"); }} />
            <KpiCard label="Pending transfers" value={String(pendingTransfers)} note="Awaiting your approval" noteTone={pendingTransfers ? "warning" : "muted"} icon="building" iconTone="gold" onClick={() => setTab("Transfers")} />
          </div>
          <div className="kpi-grid">
            <KpiCard label="Under inspection / repair" value={String(inspectionCount)} note="Blocked from sale" icon="warning" iconTone="gold" onClick={() => { setStockStatus("Under Inspection"); setTab("Stock"); }} />
            <KpiCard label="Damaged" value={String(damagedCount)} note="Needs a decision" noteTone={damagedCount ? "warning" : "muted"} icon="error" iconTone="gold" onClick={() => { setStockStatus("Damaged"); setTab("Stock"); }} />
            <KpiCard label="Low stock lines" value={String(lowStock.length)} note="At or below 1 unit" noteTone="warning" icon="sort" iconTone="royal" />
            <KpiCard label="Movements logged" value={String(movements.length)} note="Complete audit ledger" icon="menu" iconTone="royal" onClick={() => setTab("History")} />
          </div>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">STOCK MOVEMENT CHAIN</p><h2>Traceable end to end</h2></div>
            </div>
            <div className="chain-strip" role="img" aria-label={`Stock chain: ${chainSteps.join(", then ")}`}>
              {chainSteps.map((step, i) => (
                <span key={step} className="chain-step">
                  <Badge tone={movementTone[step]}>{step}</Badge>
                  {i < chainSteps.length - 1 && <Icon name="arrow" size={13} />}
                </span>
              ))}
            </div>
            <p className="muted chain-note">Every step posts a ledger entry below — purchases arrive through GRN, stock reserves against orders, and sales leave through dispatch.</p>
          </section>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">VALUE BY LOCATION</p><h2>Where stock sits</h2></div>
                <button type="button" className="link-btn" onClick={() => setTab("Locations")}>Manage locations</button>
              </div>
              <BarList items={valueByLocation} />
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">LATEST MOVEMENTS</p><h2>Ledger highlights</h2></div>
                <button type="button" className="link-btn" onClick={() => setTab("History")}>Full history</button>
              </div>
              <div className="feed">
                {movements.slice(0, 5).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const product = products.find(p => p.sku === m.sku);
                      if (product) onOpenProduct(product.id);
                      else setTab("History");
                    }}
                  >
                    <span className={cn("feed-icon", m.qty > 0 ? "emerald" : m.qty < 0 ? "royal" : "gold")}><Icon name="layers" size={15} /></span>
                    <span className="feed-body">
                      <strong>{m.type} · {m.product}</strong>
                      <small>{m.time} · {m.user}</small>
                    </span>
                    <Badge tone={movementTone[m.type]}>{m.qty === 0 ? m.type : m.qty > 0 ? `+${m.qty}` : m.qty}</Badge>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {tab === "Stock" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">STOCK REGISTER</p><h2>{stockRows.length} lines · {stockRows.reduce((s, p) => s + p.stock, 0)} units</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search stock" aria-label="Search stock" value={stockQuery} onChange={e => setStockQuery(e.target.value)} />
              </div>
              <div className="field location-filter">
                <select aria-label="Filter by location" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                  <option>All locations</option>
                  {locations.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
          <Tabs tabs={stockStatusTabs} active={stockStatus} onChange={setStockStatus} label="Stock status filter" />
          {selected.length > 0 && (
            <div className="bulk-bar">
              <strong>{selected.length} selected</strong>
              <button type="button" onClick={() => {
                const rows = products.filter(p => selected.includes(p.id));
                const n = downloadCsv("stock.csv", ["SKU", "Product", "Status", "Stock", "Location", "Units per carton", "Value"],
                  rows.map(p => [p.sku, p.name, p.status, p.stock, p.location, p.carat ?? "", p.sellingPrice * p.stock]));
                toast({ tone: "success", title: "Stock exported", message: `stock.csv downloaded with ${n} row${n === 1 ? "" : "s"}.` });
              }}>Export</button>
              <button type="button" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}
          <DataTable
            columns={stockColumns}
            rows={stockRows}
            rowKey={p => p.id}
            rowLabel={p => `stock line ${p.sku}`}
            pageSize={8}
            selected={selected}
            onSelectedChange={setSelected}
            emptyState={
              <EmptyState
                icon="search"
                title="No stock matches"
                description="Try another keyword, status or location."
                mini
                action={<Button variant="secondary" onClick={() => { setStockQuery(""); setStockStatus("All Stock"); setLocationFilter("All locations"); }}>Clear filters</Button>}
              />
            }
          />
        </section>
      )}

      {tab === "History" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">STOCK HISTORY</p><h2>{historyRows.length} ledger entries</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search ledger" aria-label="Search stock history" value={historyQuery} onChange={e => setHistoryQuery(e.target.value)} />
              </div>
              <div className="field location-filter">
                <select aria-label="Filter by movement type" value={historyType} onChange={e => setHistoryType(e.target.value as typeof historyType)}>
                  {movementTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DataTable
            columns={historyColumns}
            rows={historyRows}
            rowKey={m => m.id}
            pageSize={8}
            emptyState={<EmptyState icon="search" title="No matching entries" description="Try another keyword or movement type." mini />}
          />
        </section>
      )}

      {tab === "Transfers" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">STOCK TRANSFERS</p><h2>{transfers.length} requests</h2></div>
            <Button variant="secondary" onClick={() => { setTransferPreset(undefined); setTransferOpen(true); }}><Icon name="plus" /> New transfer</Button>
          </div>
          <div className="transfer-list">
            {transfers.map(t => (
              <div key={t.id} className="transfer-row">
                <div className="transfer-main">
                  <strong>{t.id} · {t.product}</strong>
                  <small>{t.sku} · qty {t.qty} · requested by {t.requestedBy} · {t.date}</small>
                  <small className="transfer-reason">“{t.reason}”</small>
                </div>
                <div className="transfer-route">
                  <span>{t.source}</span>
                  <Icon name="arrow" size={14} />
                  <span>{t.destination}</span>
                </div>
                <Badge tone={transferTone[t.status]}>{t.status}</Badge>
                <div className="transfer-actions">
                  {t.status === "Pending Approval" && (
                    <>
                      <Button variant="secondary" onClick={() => approveTransfer(t)}><Icon name="check" /> Approve</Button>
                      <Button variant="danger" onClick={() => rejectTransfer(t)}>Reject</Button>
                    </>
                  )}
                  {t.status === "In Transit" && (
                    <Button variant="secondary" onClick={() => receiveTransfer(t)}><Icon name="check" /> Mark received</Button>
                  )}
                  {(t.status === "Completed" || t.status === "Rejected") && t.decidedBy && (
                    <small className="muted">by {t.decidedBy}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Gate Pass" && <GatePassHub />}

      {tab === "Verification" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">VERIFICATION SCHEDULE</p><h2>Every {verificationInterval} days · {locations.length} locations</h2></div>
            <Badge tone={overdueLocations.length ? "danger" : "emerald"}>
              {overdueLocations.length ? `${overdueLocations.length} overdue` : "On schedule"}
            </Badge>
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead>
                <tr><th>Location</th><th>Last verified</th><th>By</th><th>Variance found</th><th>Next due</th><th>Status</th></tr>
              </thead>
              <tbody>
                {verificationSchedule.map(row => (
                  <tr key={row.location}>
                    <td className="note-cell">{row.location}</td>
                    <td>{row.lastDate}</td>
                    <td>{row.by}</td>
                    <td className={row.variance ? "warning-text" : undefined}>{row.variance ? `${row.variance} line(s)` : "None"}</td>
                    <td>{row.dueLabel}</td>
                    <td>
                      <Badge tone={row.overdue ? "danger" : row.session ? "emerald" : "amber"}>
                        {row.overdue ? "Overdue" : row.session ? "Verified" : "Never verified"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            The fortnightly interval comes from Business Controls in Settings — change it there and this schedule follows.
          </p>
        </section>
      )}

      {tab === "Verification" && (
        <div className="two-col verify-grid">
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">SESSIONS</p><h2>Physical verification</h2></div>
              <Button variant="secondary" onClick={() => setSessionModalOpen(true)}><Icon name="plus" /> New session</Button>
            </div>
            <div className="session-list">
              {sessions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={cn("session-row", selectedSession?.id === s.id && "active")}
                  onClick={() => setSelectedSessionId(s.id)}
                >
                  <div>
                    <strong>{s.id} · {s.location}</strong>
                    <small>{s.date} · started by {s.startedBy} · {varianceSummary(s)}</small>
                  </div>
                  <Badge tone={verificationTone[s.status]}>{s.status}</Badge>
                </button>
              ))}
            </div>
          </section>
          <section className="panel">
            {selectedSession ? (
              <>
                <div className="section-head">
                  <div>
                    <p className="kicker">SESSION DETAIL</p>
                    <h2>{selectedSession.id} · {selectedSession.location}</h2>
                  </div>
                  <Badge tone={verificationTone[selectedSession.status]}>{selectedSession.status}</Badge>
                </div>
                <div className="table-wrap op-table">
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Expected</th><th>Counted</th><th>Difference</th></tr>
                    </thead>
                    <tbody>
                      {selectedSession.lines.map(line => {
                        const diff = line.counted === null ? null : line.counted - line.expected;
                        return (
                          <tr key={line.productId}>
                            <td>
                              <b className="link">{line.sku}</b>
                              <div className="note-cell">{line.product}</div>
                            </td>
                            <td>{line.expected}</td>
                            <td>
                              {selectedSession.status === "In Progress" ? (
                                <input
                                  className="count-input"
                                  inputMode="numeric"
                                  aria-label={`Counted quantity for ${line.sku}`}
                                  value={line.counted ?? ""}
                                  placeholder="—"
                                  onChange={e => {
                                    const v = e.target.value.replace(/\D/g, "");
                                    setCount(selectedSession.id, line.productId, v === "" ? null : parseInt(v, 10));
                                  }}
                                />
                              ) : (
                                line.counted ?? "—"
                              )}
                            </td>
                            <td>
                              {diff === null ? (
                                <span className="muted">Not counted</span>
                              ) : diff === 0 ? (
                                <Badge tone="emerald">Match</Badge>
                              ) : (
                                <Badge tone={diff > 0 ? "amber" : "danger"}>{diff > 0 ? `+${diff}` : diff}</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="detail-actions session-actions">
                  {selectedSession.status === "In Progress" && (
                    <Button
                      onClick={() => submitSession(selectedSession)}
                      disabled={selectedSession.lines.some(l => l.counted === null)}
                    >
                      Submit for approval
                    </Button>
                  )}
                  {selectedSession.status === "Awaiting Approval" && (
                    <>
                      <Button onClick={() => approveSession(selectedSession)}><Icon name="check" /> Approve & adjust</Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          setConfirm({
                            title: `Reject ${selectedSession.id}?`,
                            danger: true,
                            message: "No adjustments are posted. The count is kept for reference and can be redone.",
                            confirmLabel: "Reject session",
                            action: () => {
                              updateSession(selectedSession.id, { status: "Rejected", approvedBy: "Arjun Sharma" });
                              toast({ tone: "info", title: "Session rejected", message: selectedSession.id });
                              setConfirm(null);
                            },
                          })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {selectedSession.status === "Adjusted" && (
                    <p className="muted">Approved by {selectedSession.approvedBy} — adjustments posted to the ledger.</p>
                  )}
                  {selectedSession.status === "Rejected" && (
                    <p className="muted">Rejected by {selectedSession.approvedBy} — no adjustments were made.</p>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon="check" title="No sessions yet" description="Start a physical verification to reconcile book stock with reality." mini />
            )}
          </section>
        </div>
      )}

      {tab === "Locations" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">WAREHOUSE & LOCATIONS</p><h2>{locations.length} locations</h2></div>
            <Button variant="secondary" onClick={() => setLocationModalOpen(true)}><Icon name="plus" /> Add location</Button>
          </div>
          <div className="category-list">
            {locations.map(loc => {
              const here = products.filter(p => p.location === loc);
              const units = here.reduce((s, p) => s + p.stock, 0);
              const value = here.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
              return (
                <div key={loc} className="category-row">
                  <span className="doc-icon"><Icon name={loc.includes("workshop") ? "settings" : "building"} /></span>
                  <div>
                    <strong>{loc}</strong>
                    <small>{here.length} products · {units} units{value > 0 ? ` · ${lakh(value)} at cost` : ""}</small>
                  </div>
                  <Badge tone={units > 0 ? "emerald" : "neutral"}>{units > 0 ? "Stocked" : "Empty"}</Badge>
                  <button type="button" className="link-btn" onClick={() => { setLocationFilter(loc); setStockStatus("All Stock"); setTab("Stock"); }}>
                    View stock
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      const lines = here.map(p => ({ productId: p.id, sku: p.sku, product: p.name, expected: p.stock, counted: null }));
                      if (!lines.length) {
                        toast({ tone: "info", title: "Nothing to count", message: `${loc} has no products.` });
                        return;
                      }
                      startSession(loc);
                      setTab("Verification");
                    }}
                  >
                    Verify
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* modals */}
      {adjustTarget && (
        <AdjustStockModal
          open={!!adjustTarget}
          onClose={() => setAdjustTarget(null)}
          product={adjustTarget}
          onConfirm={(newStock, reason) => {
            const delta = newStock - adjustTarget.stock;
            updateProduct(adjustTarget.id, { stock: newStock }, `Stock adjusted to ${newStock} — ${reason}`);
            logMovement({ sku: adjustTarget.sku, product: adjustTarget.name, type: "Adjustment", qty: delta, location: adjustTarget.location, note: reason });
            setAdjustTarget(null);
            toast({ tone: "success", title: "Stock adjusted", message: `${adjustTarget.sku} now has ${newStock} in stock.` });
          }}
        />
      )}
      <NewTransferModal
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setTransferPreset(undefined); }}
        presetProductId={transferPreset}
        onSubmit={submitTransfer}
      />
      <NewSessionModal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} onSubmit={loc => { startSession(loc); setTab("Verification"); }} />
      <AddLocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSubmit={name => {
          addLocation(name);
          setLocationModalOpen(false);
          toast({ tone: "success", title: "Location added", message: name });
        }}
      />
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
