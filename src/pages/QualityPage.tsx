import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import GemImage from "@/components/products/GemImage";
import InspectionDetail from "@/components/quality/InspectionDetail";
import { NewReturnModal } from "@/components/quality/QualityModals";
import ReturnDetail from "@/components/quality/ReturnDetail";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { inspectionStatusTone, returnStatusTone } from "@/data/qualityData";
import { saleTotals } from "@/data/salesData";
import { useQuality } from "@/hooks/useQuality";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { InspectionRecord, InspectionStatus, ReturnCase } from "@/types";
import { formatINR } from "@/utils";

type QualityView =
  | { type: "overview" }
  | { type: "inspections" }
  | { type: "returns" }
  | { type: "inspection-detail"; id: string }
  | { type: "return-detail"; id: string };

const inspectionTabs: Array<"All" | InspectionStatus> = ["All", "Pending", "In Review", "Approved", "Rejected", "Reinspection"];

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

export default function QualityPage({
  initialTab,
  onTabHandled,
  focusReturnId,
  focusInspectionId,
  onFocusHandled,
  onOpenCustomer,
  onOpenOrder,
  onOpenProduct,
  onOpenProduction,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  focusReturnId: string | null;
  focusInspectionId: string | null;
  onFocusHandled: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenProduction?: (productionId: string) => void;
}) {
  const { inspections, returns, addReturn } = useQuality();
  const { addNotification } = useTeam();
  const toast = useToast();
  const [view, setView] = useState<QualityView>({ type: "overview" });

  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Inspections") setView({ type: "inspections" });
    else if (initialTab === "Returns") setView({ type: "returns" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [inspectionTab, setInspectionTab] = useState<(typeof inspectionTabs)[number]>("All");
  const [inspectionQuery, setInspectionQuery] = useState("");
  const [returnQuery, setReturnQuery] = useState("");
  const [newReturnOpen, setNewReturnOpen] = useState(false);

  useEffect(() => {
    if (focusReturnId) {
      setView({ type: "return-detail", id: focusReturnId });
      onFocusHandled();
    } else if (focusInspectionId) {
      setView({ type: "inspection-detail", id: focusInspectionId });
      onFocusHandled();
    }
  }, [focusReturnId, focusInspectionId, onFocusHandled]);

  const filteredInspections = useMemo(() => {
    const q = inspectionQuery.trim().toLowerCase();
    return inspections.filter(i => {
      if (inspectionTab !== "All" && i.status !== inspectionTab) return false;
      if (!q) return true;
      return `${i.id} ${i.sku} ${i.product} ${i.source} ${i.reference ?? ""} ${i.inspector ?? ""}`.toLowerCase().includes(q);
    });
  }, [inspections, inspectionTab, inspectionQuery]);

  const filteredReturns = useMemo(() => {
    const q = returnQuery.trim().toLowerCase();
    return returns.filter(r => !q || `${r.id} ${r.customerName} ${r.sku} ${r.product} ${r.orderId}`.toLowerCase().includes(q));
  }, [returns, returnQuery]);

  const inspectionColumns: Column<InspectionRecord>[] = [
    {
      key: "id", label: "Inspection", sortable: true, hideable: false, sortValue: i => i.id,
      render: i => (
        <button type="button" className="table-product" onClick={() => setView({ type: "inspection-detail", id: i.id })}>
          <GemImage tone={i.tone} size="thumb" className="table-thumb" />
          <span><b className="link">{i.id}</b><small>{i.sku} · {i.product}</small></span>
        </button>
      ),
    },
    { key: "source", label: "Source", render: i => `${i.source}${i.reference ? ` · ${i.reference}` : ""}` },
    { key: "inspector", label: "Inspector", render: i => i.inspector ?? "—" },
    { key: "condition", label: "Condition", defaultHidden: true, render: i => i.condition ?? "—" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status", sortable: true, sortValue: i => i.status, render: i => <Badge tone={inspectionStatusTone[i.status]}>{i.status}</Badge> },
  ];

  const returnColumns: Column<ReturnCase>[] = [
    {
      key: "id", label: "Return", sortable: true, hideable: false, sortValue: r => r.id,
      render: r => (
        <button type="button" className="table-product" onClick={() => setView({ type: "return-detail", id: r.id })}>
          <GemImage tone={r.tone} size="thumb" className="table-thumb" />
          <span><b className="link">{r.id}</b><small>{r.product}</small></span>
        </button>
      ),
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: r => r.customerName,
      render: r => <button type="button" className="cell-link" onClick={() => onOpenCustomer(r.customerId)}>{r.customerName}</button>,
    },
    { key: "order", label: "Order", render: r => r.orderId },
    { key: "qty", label: "Qty", sortable: true, align: "right", sortValue: r => r.qty, render: r => <strong>{r.qty}</strong> },
    { key: "amount", label: "Value", sortable: true, align: "right", sortValue: r => r.amount, render: r => <strong>{formatINR(r.amount)}</strong> },
    {
      key: "resolution", label: "Resolution", defaultHidden: true,
      render: r => (r.refund ? `Refund · ${r.refund.reference}` : r.creditNote ? `Credit note · ${r.creditNote.id}` : "—"),
    },
    { key: "requested", label: "Requested" },
    { key: "status", label: "Status", sortable: true, sortValue: r => r.status, render: r => <Badge tone={returnStatusTone[r.status]}>{r.status}</Badge> },
  ];

  if (view.type === "inspection-detail") {
    const inspection = inspections.find(i => i.id === view.id);
    if (!inspection) {
      setView({ type: "inspections" });
      return null;
    }
    return (
      <InspectionDetail
        inspection={inspection}
        onBack={() => setView({ type: "inspections" })}
        onOpenProduct={onOpenProduct}
        onOpenReturn={id => setView({ type: "return-detail", id })}
      />
    );
  }

  if (view.type === "return-detail") {
    const ret = returns.find(r => r.id === view.id);
    if (!ret) {
      setView({ type: "returns" });
      return null;
    }
    return (
      <ReturnDetail
        ret={ret}
        onBack={() => setView({ type: "returns" })}
        onOpenInspection={id => setView({ type: "inspection-detail", id })}
        onOpenCustomer={onOpenCustomer}
        onOpenOrder={onOpenOrder}
        onOpenProduct={onOpenProduct}
        onOpenProduction={onOpenProduction}
      />
    );
  }

  /* ---------- overview metrics ---------- */

  const pendingCount = inspections.filter(i => i.status === "Pending" || i.status === "Reinspection").length;
  const inReviewCount = inspections.filter(i => i.status === "In Review").length;
  const openReturns = returns.filter(r => !["Refund Processed", "Credit Note Issued", "Rejected"].includes(r.status));
  const refundedValue = returns.reduce((s, r) => s + (r.refund?.amount ?? 0) + (r.creditNote?.amount ?? 0), 0);

  const inspectionPipeline = inspectionTabs.slice(1).map(status => ({
    label: status,
    value: inspections.filter(i => i.status === status).length,
    display: String(inspections.filter(i => i.status === status).length),
  }));
  const returnsPipeline = (["Requested", "Under Inspection", "Approved", "Stock Reconciled", "Refund Processed", "Credit Note Issued"] as const)
    .map(status => ({
      label: status,
      value: returns.filter(r => r.status === status).length,
      display: String(returns.filter(r => r.status === status).length),
    }))
    .filter(x => x.value > 0);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">QUALITY · INSPECTION, RETURNS & REPROCESSING</p>
          <h1>Trust, verified twice.</h1>
          <p>Every batch inspected on the way in, every return inspected on the way back — with refunds and credit notes fully traceable.</p>
        </div>
        <Button onClick={() => setNewReturnOpen(true)}><Icon name="plus" /> New return</Button>
      </div>
      <Tabs
        tabs={["Overview", "Inspections", "Returns"]}
        active={view.type === "overview" ? "Overview" : view.type === "inspections" ? "Inspections" : "Returns"}
        onChange={t => setView({ type: t === "Overview" ? "overview" : t === "Inspections" ? "inspections" : "returns" })}
        label="Quality views"
      />

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Awaiting inspection" value={String(pendingCount)} note="Pending & reinspection queue" noteTone={pendingCount ? "warning" : "muted"} icon="shield" iconTone="gold" onClick={() => { setInspectionTab("Pending"); setView({ type: "inspections" }); }} />
            <KpiCard label="In review" value={String(inReviewCount)} note="Under the loupe right now" icon="eye" iconTone="royal" onClick={() => { setInspectionTab("In Review"); setView({ type: "inspections" }); }} />
            <KpiCard label="Open returns" value={String(openReturns.length)} note={`${returns.length} total this season`} icon="grid" iconTone="royal" onClick={() => setView({ type: "returns" })} />
            <KpiCard label="Refunded & credited" value={lakh(refundedValue)} note="Across completed returns" icon="check" iconTone="emerald" onClick={() => setView({ type: "returns" })} />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">INSPECTION PIPELINE</p><h2>Queue by state</h2></div></div>
              <BarList items={inspectionPipeline} />
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">RETURNS PIPELINE</p><h2>Cases by state</h2></div></div>
              <BarList items={returnsPipeline} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">INSPECTION QUEUE</p><h2>Next up</h2></div></div>
              <div className="feed">
                {inspections.filter(i => ["Pending", "In Review", "Reinspection"].includes(i.status)).slice(0, 4).map(i => (
                  <button key={i.id} type="button" onClick={() => setView({ type: "inspection-detail", id: i.id })}>
                    <span className="feed-icon amber"><Icon name="shield" size={15} /></span>
                    <span className="feed-body">
                      <strong>{i.id} · {i.product}</strong>
                      <small>{i.source}{i.reference ? ` · ${i.reference}` : ""} · {i.date}</small>
                    </span>
                    <Badge tone={inspectionStatusTone[i.status]}>{i.status}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ACTIVE RETURNS</p><h2>Needs a decision</h2></div></div>
              {openReturns.length === 0 ? (
                <EmptyState icon="check" title="No open returns" description="New return requests appear here." mini />
              ) : (
                <div className="feed">
                  {openReturns.slice(0, 4).map(r => (
                    <button key={r.id} type="button" onClick={() => setView({ type: "return-detail", id: r.id })}>
                      <span className="feed-icon royal"><Icon name="grid" size={15} /></span>
                      <span className="feed-body">
                        <strong>{r.id} · {r.customerName}</strong>
                        <small>{r.product} · {formatINR(r.amount)}</small>
                      </span>
                      <Badge tone={returnStatusTone[r.status]}>{r.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {view.type === "inspections" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">QUALITY INSPECTIONS</p><h2>{filteredInspections.length} records</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search inspections" aria-label="Search inspections" value={inspectionQuery} onChange={e => setInspectionQuery(e.target.value)} />
              </div>
            </div>
          </div>
          <Tabs tabs={inspectionTabs as unknown as string[]} active={inspectionTab} onChange={t => setInspectionTab(t as typeof inspectionTab)} label="Inspection status filter" />
          <DataTable
            columns={inspectionColumns}
            rows={filteredInspections}
            rowKey={i => i.id}
            pageSize={8}
            emptyState={<EmptyState icon="shield" title="No matching inspections" description="Try another keyword or status." mini />}
          />
        </section>
      )}

      {view.type === "returns" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">SALES RETURNS</p><h2>{filteredReturns.length} cases</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search returns" aria-label="Search returns" value={returnQuery} onChange={e => setReturnQuery(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => setNewReturnOpen(true)}><Icon name="plus" /> New return</Button>
            </div>
          </div>
          <DataTable
            columns={returnColumns}
            rows={filteredReturns}
            rowKey={r => r.id}
            pageSize={8}
            emptyState={<EmptyState icon="grid" title="No matching returns" description="Try another keyword, or raise a new return." mini />}
          />
        </section>
      )}

      <NewReturnModal
        open={newReturnOpen}
        onClose={() => setNewReturnOpen(false)}
        onSubmit={(order, reason, qty) => {
          const line = order.lines[0];
          const created = addReturn({
            orderId: order.id,
            customerId: order.customerId,
            customerName: order.customerName,
            productId: line?.productId,
            sku: line?.sku ?? "—",
            product: line?.name ?? "Item",
            tone: line?.tone ?? "gold",
            qty,
            amount: saleTotals(order.lines, order.gstPct).total,
            reason,
          });
          addNotification({
            type: "Sales Return Update", priority: "High",
            title: `${created.id} raised`,
            message: `${order.customerName} · ${qty} × ${created.product} · ${reason}`,
            reference: created.id,
            recordRef: { kind: "return", id: created.id },
          });
          setNewReturnOpen(false);
          toast({ tone: "success", title: "Return raised", message: `${created.id} · ${qty} unit${qty === 1 ? "" : "s"} from ${order.customerName}.` });
          setView({ type: "return-detail", id: created.id });
        }}
      />
    </div>
  );
}
