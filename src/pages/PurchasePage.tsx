import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import DeviationHub from "@/components/purchase/DeviationHub";
import GrnDetail from "@/components/purchase/GrnDetail";
import PODetail from "@/components/purchase/PODetail";
import QuotationHub from "@/components/purchase/QuotationHub";
import POForm from "@/components/purchase/POForm";
import { PurchaseRequestModal } from "@/components/purchase/PurchaseModals";
import SupplierForm from "@/components/purchase/SupplierForm";
import SupplierProfile from "@/components/purchase/SupplierProfile";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import {
  grnStatusTone,
  poPaid,
  poStatusTone,
  poTotals,
  prPriorityTone,
  prStatusTone,
} from "@/data/purchaseData";
import { usePurchase } from "@/hooks/usePurchase";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { Grn, PurchaseOrder, PurchaseRequest, Supplier } from "@/types";
import { formatINR } from "@/utils";

type PurchaseView =
  | { type: "overview" }
  | { type: "suppliers" }
  | { type: "requests" }
  | { type: "quotations" }
  | { type: "pos" }
  | { type: "grns" }
  | { type: "deviations" }
  | { type: "supplier-profile"; id: string }
  | { type: "supplier-form"; id?: string }
  | { type: "po-detail"; id: string }
  | { type: "po-form"; prId?: string; supplierId?: string }
  | { type: "grn-detail"; id: string };

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

const purchaseChain = ["Request", "Approval", "Supplier", "PO", "Material Received", "Inspection", "GRN", "Stock Posting"];

export default function PurchasePage({
  initialTab,
  onTabHandled,
  intent,
  onIntentHandled,
  focusRecordId,
  onFocusHandled,
  onCreateProduct,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  intent: "create-pr" | null;
  onIntentHandled: () => void;
  focusRecordId?: string | null;
  onFocusHandled?: () => void;
  onCreateProduct: () => void;
}) {
  const { suppliers, requests, pos, grns, addSupplier, updateSupplier, addRequest, updateRequest, addPO, updatePO } = usePurchase();
  const { addNotification, logAudit } = useTeam();
  const { currentUser } = useAdmin();
  const toast = useToast();
  const [view, setView] = useState<PurchaseView>({ type: "overview" });

  /* A navigation entry can open this workspace straight on one of its tabs. */
  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Requests") setView({ type: "requests" });
    else if (initialTab === "Quotations") setView({ type: "quotations" });
    else if (initialTab === "Purchase Orders") setView({ type: "pos" });
    else if (initialTab === "Suppliers") setView({ type: "suppliers" });
    else if (initialTab === "GRN") setView({ type: "grns" });
    else if (initialTab === "Deviations") setView({ type: "deviations" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [prModalOpen, setPrModalOpen] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  /* Deep links from notifications, tasks and the audit trail land on the record. */
  useEffect(() => {
    if (!focusRecordId) return;
    if (focusRecordId.startsWith("DEV-")) setView({ type: "deviations" });
    else if (focusRecordId.startsWith("GRN-")) setView({ type: "grn-detail", id: focusRecordId });
    else if (focusRecordId.startsWith("PO-")) setView({ type: "po-detail", id: focusRecordId });
    else if (focusRecordId.startsWith("SQ-") || focusRecordId.startsWith("PR-")) setView({ type: "quotations" });
    onFocusHandled?.();
  }, [focusRecordId, onFocusHandled]);

  useEffect(() => {
    if (intent === "create-pr") {
      setView({ type: "requests" });
      setPrModalOpen(true);
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  /* ---------- metrics ---------- */

  const openPOs = pos.filter(po => ["Sent", "Partially Received"].includes(po.status));
  const openPOValue = openPOs.reduce((s, po) => s + poTotals(po).total, 0);
  const payables = pos
    .filter(po => !["Draft", "Cancelled"].includes(po.status))
    .reduce((s, po) => s + Math.max(0, poTotals(po).total - poPaid(po)), 0);
  const pendingRequests = requests.filter(r => r.status === "Pending Approval");
  const activeGrns = grns.filter(g => !["Posted to Stock", "Rejected"].includes(g.status));

  const supplierBusiness = suppliers
    .map(s => ({
      label: s.name,
      value: pos.filter(po => po.supplierId === s.id && po.status !== "Cancelled").reduce((sum, po) => sum + poTotals(po).total, 0),
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(x => ({ ...x, display: lakh(x.value) }));

  /* ---------- request actions ---------- */

  const approveRequest = (r: PurchaseRequest) =>
    setConfirm({
      title: `Approve ${r.id}?`,
      message: <>{r.items} · estimated {formatINR(r.estimatedCost)}. Approval allows a purchase order to be raised.</>,
      confirmLabel: "Approve request",
      action: () => {
        updateRequest(r.id, { status: "Approved", decidedBy: currentUser });
        logAudit({
          user: currentUser, action: "Purchase request approved", module: "Purchase",
          record: `${r.id} · ${r.items}`,
          oldValue: "Pending Approval",
          newValue: `Approved · ${r.qty} × ${r.items} · ${formatINR(r.estimatedCost)}`,
        });
        toast({ tone: "success", title: "Request approved", message: `${r.id} — raise a PO when ready.` });
        setConfirm(null);
      },
    });

  const rejectRequest = (r: PurchaseRequest) =>
    setConfirm({
      title: `Reject ${r.id}?`,
      danger: true,
      message: "The requester is notified. The request stays in history.",
      confirmLabel: "Reject request",
      action: () => {
        updateRequest(r.id, { status: "Rejected", decidedBy: currentUser });
        logAudit({
          user: currentUser, action: "Purchase request rejected", module: "Purchase",
          record: `${r.id} · ${r.items}`,
          oldValue: "Pending Approval",
          newValue: `Rejected · ${formatINR(r.estimatedCost)} not committed`,
        });
        toast({ tone: "info", title: "Request rejected", message: r.id });
        setConfirm(null);
      },
    });

  /* ---------- table columns ---------- */

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    return suppliers.filter(s => !q || `${s.name} ${s.city} ${s.speciality.join(" ")} ${s.contact}`.toLowerCase().includes(q));
  }, [suppliers, supplierQuery]);

  const supplierColumns: Column<Supplier>[] = [
    {
      key: "name", label: "Supplier", sortable: true, hideable: false, sortValue: s => s.name,
      render: s => (
        <button type="button" className="table-product" onClick={() => setView({ type: "supplier-profile", id: s.id })}>
          <span className="doc-icon"><Icon name="building" /></span>
          <span><b className="link">{s.name}</b><small>{s.contact} · {s.city}</small></span>
        </button>
      ),
    },
    { key: "speciality", label: "Speciality", render: s => s.speciality.join(", ") },
    {
      key: "business", label: "Total business", sortable: true, align: "right",
      sortValue: s => pos.filter(po => po.supplierId === s.id && po.status !== "Cancelled").reduce((sum, po) => sum + poTotals(po).total, 0),
      render: s => {
        const value = pos.filter(po => po.supplierId === s.id && po.status !== "Cancelled").reduce((sum, po) => sum + poTotals(po).total, 0);
        return value ? <strong>{lakh(value)}</strong> : <span className="muted">—</span>;
      },
    },
    {
      key: "outstanding", label: "Outstanding", sortable: true, align: "right",
      sortValue: s => pos.filter(po => po.supplierId === s.id && !["Draft", "Cancelled"].includes(po.status)).reduce((sum, po) => sum + Math.max(0, poTotals(po).total - poPaid(po)), 0),
      render: s => {
        const value = pos.filter(po => po.supplierId === s.id && !["Draft", "Cancelled"].includes(po.status)).reduce((sum, po) => sum + Math.max(0, poTotals(po).total - poPaid(po)), 0);
        return value ? <strong className="warning-text">{formatINR(value)}</strong> : <span className="muted">—</span>;
      },
    },
    { key: "since", label: "Since", defaultHidden: true },
    { key: "active", label: "Status", render: s => <Badge tone={s.active ? "emerald" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge> },
  ];

  const poColumns: Column<PurchaseOrder>[] = [
    {
      key: "id", label: "PO", sortable: true, hideable: false, sortValue: po => po.id,
      render: po => <button type="button" className="link-btn" onClick={() => setView({ type: "po-detail", id: po.id })}>{po.id}</button>,
    },
    {
      key: "supplier", label: "Supplier", sortable: true, sortValue: po => po.supplierName,
      render: po => <button type="button" className="cell-link" onClick={() => setView({ type: "supplier-profile", id: po.supplierId })}>{po.supplierName}</button>,
    },
    { key: "items", label: "Items", render: po => <span className="note-cell">{po.lines[0]?.description}{po.lines.length > 1 ? ` +${po.lines.length - 1}` : ""}</span> },
    { key: "total", label: "Total", sortable: true, align: "right", sortValue: po => poTotals(po).total, render: po => <strong>{formatINR(poTotals(po).total)}</strong> },
    {
      key: "payable", label: "Payable",
      render: po => {
        if (["Draft", "Cancelled"].includes(po.status)) return <span className="muted">—</span>;
        const balance = poTotals(po).total - poPaid(po);
        return balance <= 0 ? <Badge tone="emerald">Paid</Badge> : <strong className="warning-text">{formatINR(balance)}</strong>;
      },
    },
    { key: "delivery", label: "Delivery", defaultHidden: true, render: po => po.deliveryDate },
    { key: "status", label: "Status", sortable: true, sortValue: po => po.status, render: po => <Badge tone={poStatusTone[po.status]}>{po.status}</Badge> },
  ];

  const grnColumns: Column<Grn>[] = [
    {
      key: "id", label: "GRN", sortable: true, hideable: false, sortValue: g => g.id,
      render: g => <button type="button" className="link-btn" onClick={() => setView({ type: "grn-detail", id: g.id })}>{g.id}</button>,
    },
    { key: "poId", label: "PO", render: g => <button type="button" className="cell-link" onClick={() => setView({ type: "po-detail", id: g.poId })}>{g.poId}</button> },
    { key: "supplier", label: "Supplier", render: g => g.supplierName },
    { key: "received", label: "Received", render: g => g.receivedDate },
    {
      key: "qty", label: "Accepted / Received",
      render: g => `${g.lines.reduce((s, l) => s + l.acceptedQty, 0)} / ${g.lines.reduce((s, l) => s + l.receivedQty, 0)}`,
    },
    { key: "inspector", label: "Inspector", defaultHidden: true, render: g => g.inspector ?? "—" },
    { key: "status", label: "Status", sortable: true, sortValue: g => g.status, render: g => <Badge tone={grnStatusTone[g.status]}>{g.status}</Badge> },
  ];

  /* ---------- detail views ---------- */

  if (view.type === "supplier-profile") {
    const supplier = suppliers.find(s => s.id === view.id);
    if (!supplier) {
      setView({ type: "suppliers" });
      return null;
    }
    return (
      <SupplierProfile
        supplier={supplier}
        onBack={() => setView({ type: "suppliers" })}
        onEdit={() => setView({ type: "supplier-form", id: supplier.id })}
        onOpenPO={id => setView({ type: "po-detail", id })}
        onNewPO={() => setView({ type: "po-form", supplierId: supplier.id })}
        onOpenDeviation={() => setView({ type: "deviations" })}
      />
    );
  }

  if (view.type === "supplier-form") {
    const supplier = view.id ? suppliers.find(s => s.id === view.id) : undefined;
    return (
      <div className="page-stack">
        <button type="button" className="back-link" onClick={() => setView(supplier ? { type: "supplier-profile", id: supplier.id } : { type: "suppliers" })}>
          ← Back to {supplier ? supplier.name : "suppliers"}
        </button>
        <SupplierForm
          supplier={supplier}
          onCancel={() => setView(supplier ? { type: "supplier-profile", id: supplier.id } : { type: "suppliers" })}
          onSave={draft => {
            if (supplier) {
              updateSupplier(supplier.id, draft);
              toast({ tone: "success", title: "Supplier updated", message: draft.name });
              setView({ type: "supplier-profile", id: supplier.id });
            } else {
              const created = addSupplier({ ...draft, since: "2026", active: true });
              toast({ tone: "success", title: "Supplier added", message: created.name });
              setView({ type: "supplier-profile", id: created.id });
            }
          }}
        />
      </div>
    );
  }

  if (view.type === "po-detail") {
    const po = pos.find(p => p.id === view.id);
    if (!po) {
      setView({ type: "pos" });
      return null;
    }
    return (
      <PODetail
        po={po}
        onBack={() => setView({ type: "pos" })}
        onOpenSupplier={id => setView({ type: "supplier-profile", id })}
        onOpenGrn={id => setView({ type: "grn-detail", id })}
      />
    );
  }

  if (view.type === "po-form") {
    const presetPr = view.prId ? requests.find(r => r.id === view.prId) : undefined;
    return (
      <div className="page-stack">
        <button type="button" className="back-link" onClick={() => setView({ type: "pos" })}>← Back to purchase orders</button>
        <POForm
          presetPr={presetPr}
          presetSupplierId={view.supplierId}
          onCancel={() => setView({ type: "pos" })}
          onSave={draft => {
            const created = addPO(draft, presetPr ? `Created from request ${presetPr.id}` : "Draft PO created");
            if (presetPr) updateRequest(presetPr.id, { status: "Ordered", poId: created.id });
            toast({ tone: "success", title: "Purchase order created", message: `${created.id} for ${created.supplierName}.` });
            setView({ type: "po-detail", id: created.id });
          }}
        />
      </div>
    );
  }

  if (view.type === "grn-detail") {
    const grn = grns.find(g => g.id === view.id);
    if (!grn) {
      setView({ type: "grns" });
      return null;
    }
    return (
      <GrnDetail
        grn={grn}
        onBack={() => setView({ type: "grns" })}
        onOpenPO={id => setView({ type: "po-detail", id })}
        onOpenDeviations={() => setView({ type: "deviations" })}
        onCreateProduct={onCreateProduct}
      />
    );
  }

  /* ---------- main tabs ---------- */

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">PURCHASE · SUPPLIERS & GRN</p>
          <h1>Sourcing, received and accounted.</h1>
          <p>Requests with approval, supplier purchase orders, goods received notes and payable tracking — through to stock posting.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setPrModalOpen(true)}><Icon name="plus" /> Purchase request</Button>
          <Button onClick={() => setView({ type: "po-form" })}><Icon name="building" /> New purchase order</Button>
        </div>
      </div>
      <Tabs
        tabs={["Overview", "Suppliers", "Requests", "Quotations", "Purchase Orders", "GRN", "Deviations"]}
        active={
          view.type === "overview" ? "Overview"
          : view.type === "suppliers" ? "Suppliers"
          : view.type === "requests" ? "Requests"
          : view.type === "quotations" ? "Quotations"
          : view.type === "pos" ? "Purchase Orders"
          : view.type === "deviations" ? "Deviations"
          : "GRN"
        }
        onChange={t =>
          setView(
            t === "Overview" ? { type: "overview" }
            : t === "Suppliers" ? { type: "suppliers" }
            : t === "Requests" ? { type: "requests" }
            : t === "Quotations" ? { type: "quotations" }
            : t === "Purchase Orders" ? { type: "pos" }
            : t === "Deviations" ? { type: "deviations" }
            : { type: "grns" },
          )
        }
        label="Purchase views"
      />

      {view.type === "quotations" && (
        <QuotationHub
          onCreatePo={(prId, supplierId) => setView({ type: "po-form", prId, supplierId })}
          onOpenSupplier={id => setView({ type: "supplier-profile", id })}
        />
      )}

      {view.type === "deviations" && (
        <DeviationHub
          onOpenGrn={id => setView({ type: "grn-detail", id })}
          onOpenPo={id => setView({ type: "po-detail", id })}
          onOpenSupplier={id => setView({ type: "supplier-profile", id })}
        />
      )}

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Open PO value" value={lakh(openPOValue)} note={`${openPOs.length} orders with suppliers`} icon="building" iconTone="royal" onClick={() => setView({ type: "pos" })} />
            <KpiCard label="Outstanding payables" value={lakh(payables)} note="Across active POs" noteTone="warning" icon="warning" iconTone="gold" onClick={() => setView({ type: "suppliers" })} />
            <KpiCard label="Requests awaiting approval" value={String(pendingRequests.length)} note={`${requests.length} total this quarter`} noteTone={pendingRequests.length ? "warning" : "muted"} icon="check" iconTone="gold" onClick={() => setView({ type: "requests" })} />
            <KpiCard label="GRNs in progress" value={String(activeGrns.length)} note="Verification & inspection" icon="layers" iconTone="emerald" onClick={() => setView({ type: "grns" })} />
          </div>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">PURCHASE CHAIN</p><h2>Request → Stock posting</h2></div></div>
            <div className="chain-strip" role="img" aria-label={`Purchase chain: ${purchaseChain.join(", then ")}`}>
              {purchaseChain.map((step, i) => (
                <span key={step} className="chain-step">
                  <Badge tone={i < 4 ? "royal" : i < 7 ? "amber" : "emerald"}>{step}</Badge>
                  {i < purchaseChain.length - 1 && <Icon name="arrow" size={13} />}
                </span>
              ))}
            </div>
            <p className="muted chain-note">Approved GRNs post accepted stock straight into the inventory ledger — the same ledger the Inventory module audits.</p>
          </section>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">SUPPLIER BUSINESS</p><h2>Purchase value by supplier</h2></div>
              </div>
              <BarList items={supplierBusiness} />
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">NEEDS ACTION</p><h2>Approvals & inspections</h2></div>
              </div>
              <div className="feed">
                {pendingRequests.map(r => (
                  <button key={r.id} type="button" onClick={() => setView({ type: "requests" })}>
                    <span className="feed-icon gold"><Icon name="check" size={15} /></span>
                    <span className="feed-body">
                      <strong>{r.id} · {r.items}</strong>
                      <small>{r.requester} · est {formatINR(r.estimatedCost)}</small>
                    </span>
                    <Badge tone={prPriorityTone[r.priority]}>{r.priority}</Badge>
                  </button>
                ))}
                {activeGrns.map(g => (
                  <button key={g.id} type="button" onClick={() => setView({ type: "grn-detail", id: g.id })}>
                    <span className="feed-icon amber"><Icon name="layers" size={15} /></span>
                    <span className="feed-body">
                      <strong>{g.id} · {g.supplierName}</strong>
                      <small>{g.status} · received {g.receivedDate}</small>
                    </span>
                    <Badge tone={grnStatusTone[g.status]}>{g.status}</Badge>
                  </button>
                ))}
                {pendingRequests.length === 0 && activeGrns.length === 0 && (
                  <EmptyState icon="check" title="All clear" description="No approvals or inspections pending." mini />
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {view.type === "suppliers" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">SUPPLIERS</p><h2>{filteredSuppliers.length} suppliers</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search suppliers" aria-label="Search suppliers" value={supplierQuery} onChange={e => setSupplierQuery(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => setView({ type: "supplier-form" })}><Icon name="plus" /> New supplier</Button>
            </div>
          </div>
          <DataTable
            columns={supplierColumns}
            rows={filteredSuppliers}
            rowKey={s => s.id}
            pageSize={6}
            emptyState={<EmptyState icon="search" title="No matching suppliers" description="Try another keyword." mini />}
          />
        </section>
      )}

      {view.type === "requests" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">PURCHASE REQUESTS</p><h2>{requests.length} requests</h2></div>
            <Button variant="secondary" onClick={() => setPrModalOpen(true)}><Icon name="plus" /> New request</Button>
          </div>
          <div className="transfer-list">
            {requests.map(r => (
              <div key={r.id} className="transfer-row">
                <div className="transfer-main">
                  <strong>{r.id} · {r.items}</strong>
                  <small>{r.requester} · qty {r.qty} · est {formatINR(r.estimatedCost)} · {r.date}</small>
                  <small className="transfer-reason">“{r.reason}”</small>
                </div>
                <Badge tone={prPriorityTone[r.priority]}>{r.priority}</Badge>
                <Badge tone={prStatusTone[r.status]}>{r.status}</Badge>
                <div className="transfer-actions">
                  {r.status === "Pending Approval" && (
                    <>
                      <Button variant="secondary" onClick={() => approveRequest(r)}><Icon name="check" /> Approve</Button>
                      <Button variant="danger" onClick={() => rejectRequest(r)}>Reject</Button>
                    </>
                  )}
                  {["Pending Approval", "Approved"].includes(r.status) && (
                    <Button variant="secondary" onClick={() => setView({ type: "quotations" })}><Icon name="component" /> Quotations</Button>
                  )}
                  {r.status === "Approved" && (
                    <Button variant="secondary" onClick={() => setView({ type: "po-form", prId: r.id })}><Icon name="building" /> Create PO</Button>
                  )}
                  {r.status === "Ordered" && r.poId && (
                    <Button variant="secondary" onClick={() => setView({ type: "po-detail", id: r.poId! })}>View {r.poId}</Button>
                  )}
                  {r.status === "Rejected" && r.decidedBy && <small className="muted">by {r.decidedBy}</small>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {view.type === "pos" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">PURCHASE ORDERS</p><h2>{pos.length} orders</h2></div>
            <Button variant="secondary" onClick={() => setView({ type: "po-form" })}><Icon name="plus" /> New PO</Button>
          </div>
          <DataTable
            columns={poColumns}
            rows={pos}
            rowKey={po => po.id}
            pageSize={8}
            emptyState={<EmptyState icon="building" title="No purchase orders" description="Raise a PO from an approved request or directly." mini />}
          />
        </section>
      )}

      {view.type === "grns" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">GOODS RECEIVED NOTES</p><h2>{grns.length} GRNs</h2></div>
            <span>Raise GRNs from a purchase order’s “Receive material”.</span>
          </div>
          <DataTable
            columns={grnColumns}
            rows={grns}
            rowKey={g => g.id}
            pageSize={8}
            emptyState={<EmptyState icon="layers" title="No GRNs yet" description="Receive material against a sent PO to create the first GRN." mini />}
          />
        </section>
      )}

      <PurchaseRequestModal
        open={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        onSubmit={draft => {
          const created = addRequest(draft);
          addNotification({
            type: "Approval required", priority: created.priority === "High" ? "High" : "Normal",
            title: `${created.id} awaiting approval`,
            message: `${created.items} · ${created.qty} · ${formatINR(created.estimatedCost)} requested by ${created.requester}.`,
            reference: created.id,
            recordRef: { kind: "request", id: created.id },
          });
          setPrModalOpen(false);
          toast({ tone: "success", title: "Request submitted", message: `${created.id} is awaiting approval.` });
          setView({ type: "requests" });
        }}
      />
      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
