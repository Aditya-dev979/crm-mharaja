import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import GemImage from "@/components/products/GemImage";
import CustomOrderDetail from "@/components/workshop/CustomOrderDetail";
import CustomOrderForm from "@/components/workshop/CustomOrderForm";
import RepairDetail from "@/components/workshop/RepairDetail";
import { NewRepairModal } from "@/components/workshop/WorkshopModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { customStages, customStageTone, repairStages, repairStageTone } from "@/data/workshopData";
import { useToast } from "@/hooks/useToast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { CustomOrder, RepairJob } from "@/types";
import { formatINR } from "@/utils";

type WorkshopView =
  | { type: "overview" }
  | { type: "custom" }
  | { type: "repairs" }
  | { type: "custom-detail"; id: string }
  | { type: "custom-form" }
  | { type: "repair-detail"; id: string };

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

export default function WorkshopPage({
  focusRepairId,
  focusCustomOrderId,
  onFocusHandled,
  onOpenCustomer,
  onOpenProduct,
  onOpenInspection,
}: {
  focusRepairId: string | null;
  focusCustomOrderId: string | null;
  onFocusHandled: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenInspection: (inspectionId: string) => void;
}) {
  const { customOrders, repairs, addCustomOrder, addRepair } = useWorkshop();
  const toast = useToast();
  const [view, setView] = useState<WorkshopView>({ type: "overview" });
  const [customQuery, setCustomQuery] = useState("");
  const [repairQuery, setRepairQuery] = useState("");
  const [newRepairOpen, setNewRepairOpen] = useState(false);

  useEffect(() => {
    if (focusRepairId) {
      setView({ type: "repair-detail", id: focusRepairId });
      onFocusHandled();
    } else if (focusCustomOrderId) {
      setView({ type: "custom-detail", id: focusCustomOrderId });
      onFocusHandled();
    }
  }, [focusRepairId, focusCustomOrderId, onFocusHandled]);

  const filteredCustom = useMemo(() => {
    const q = customQuery.trim().toLowerCase();
    return customOrders.filter(o => !q || `${o.id} ${o.customerName} ${o.productType} ${o.gemstone}`.toLowerCase().includes(q));
  }, [customOrders, customQuery]);

  const filteredRepairs = useMemo(() => {
    const q = repairQuery.trim().toLowerCase();
    return repairs.filter(r => !q || `${r.id} ${r.customerName} ${r.product} ${r.issue}`.toLowerCase().includes(q));
  }, [repairs, repairQuery]);

  const customColumns: Column<CustomOrder>[] = [
    {
      key: "id", label: "Order", sortable: true, hideable: false, sortValue: o => o.id,
      render: o => (
        <button type="button" className="table-product" onClick={() => setView({ type: "custom-detail", id: o.id })}>
          <GemImage tone={o.attachments[0]?.tone ?? "gold"} size="thumb" className="table-thumb" />
          <span><b className="link">{o.id}</b><small>{o.productType} · {o.gemstone}</small></span>
        </button>
      ),
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: o => o.customerName,
      render: o => <button type="button" className="cell-link" onClick={() => onOpenCustomer(o.customerId)}>{o.customerName}</button>,
    },
    {
      key: "value", label: "Value", sortable: true, align: "right", sortValue: o => o.quotedAmount ?? o.estimatedCost,
      render: o => <strong>{formatINR(o.quotedAmount ?? o.estimatedCost)}</strong>,
    },
    {
      key: "progress", label: "Progress",
      render: o => (o.stage === "Work in Progress" || o.progress > 0 ? `${o.progress}%` : "—"),
    },
    { key: "worker", label: "Line operator", defaultHidden: true, render: o => o.worker ?? "—" },
    { key: "delivery", label: "Delivery", render: o => o.deliveryDate },
    { key: "stage", label: "Stage", sortable: true, sortValue: o => o.stage, render: o => <Badge tone={customStageTone[o.stage]}>{o.stage}</Badge> },
  ];

  const repairColumns: Column<RepairJob>[] = [
    {
      key: "id", label: "Repair", sortable: true, hideable: false, sortValue: r => r.id,
      render: r => (
        <button type="button" className="table-product" onClick={() => setView({ type: "repair-detail", id: r.id })}>
          <GemImage tone={r.tone} size="thumb" className="table-thumb" />
          <span><b className="link">{r.id}</b><small>{r.product}</small></span>
        </button>
      ),
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: r => r.customerName,
      render: r => <button type="button" className="cell-link" onClick={() => onOpenCustomer(r.customerId)}>{r.customerName}</button>,
    },
    { key: "issue", label: "Issue", render: r => <span className="note-cell">{r.issue}</span> },
    { key: "estimate", label: "Estimate", render: r => (r.estimate ? formatINR(r.estimate) : "—") },
    { key: "worker", label: "Line operator", defaultHidden: true, render: r => r.worker ?? "—" },
    { key: "expected", label: "Expected", render: r => r.expectedDelivery },
    { key: "stage", label: "Stage", sortable: true, sortValue: r => r.stage, render: r => <Badge tone={repairStageTone[r.stage]}>{r.stage}</Badge> },
  ];

  if (view.type === "custom-detail") {
    const order = customOrders.find(o => o.id === view.id);
    if (!order) {
      setView({ type: "custom" });
      return null;
    }
    return (
      <CustomOrderDetail
        order={order}
        onBack={() => setView({ type: "custom" })}
        onOpenCustomer={onOpenCustomer}
        onOpenInspection={onOpenInspection}
      />
    );
  }

  if (view.type === "repair-detail") {
    const repair = repairs.find(r => r.id === view.id);
    if (!repair) {
      setView({ type: "repairs" });
      return null;
    }
    return (
      <RepairDetail
        repair={repair}
        onBack={() => setView({ type: "repairs" })}
        onOpenCustomer={onOpenCustomer}
        onOpenProduct={onOpenProduct}
        onOpenInspection={onOpenInspection}
      />
    );
  }

  if (view.type === "custom-form") {
    return (
      <div className="page-stack">
        <button type="button" className="back-link" onClick={() => setView({ type: "custom" })}>← Back to custom orders</button>
        <CustomOrderForm
          onCancel={() => setView({ type: "custom" })}
          onSave={(draft, tone) => {
            const created = addCustomOrder({ ...draft, attachments: [{ id: `co-att-init-${draft.customerId}`, label: "Reference 1", tone }] });
            toast({ tone: "success", title: "Custom order created", message: `${created.id} for ${created.customerName}.` });
            setView({ type: "custom-detail", id: created.id });
          }}
        />
      </div>
    );
  }

  /* ---------- overview ---------- */

  const activeCustom = customOrders.filter(o => !["Delivered", "Cancelled"].includes(o.stage));
  const customPipelineValue = activeCustom.reduce((s, o) => s + (o.quotedAmount ?? o.estimatedCost), 0);
  const inProduction = customOrders.filter(o => o.stage === "Work in Progress").length;
  const activeRepairs = repairs.filter(r => !["Delivered", "Declined"].includes(r.stage));
  const readyRepairs = repairs.filter(r => r.stage === "Ready").length;

  const customPipeline = customStages
    .map(stage => ({
      label: stage,
      value: customOrders.filter(o => o.stage === stage).length,
      display: String(customOrders.filter(o => o.stage === stage).length),
    }))
    .filter(x => x.value > 0);
  const repairPipeline = repairStages
    .map(stage => ({
      label: stage,
      value: repairs.filter(r => r.stage === stage).length,
      display: String(repairs.filter(r => r.stage === stage).length),
    }))
    .filter(x => x.value > 0);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">PRIVATE LABEL · CUSTOM ORDERS & JOB WORK</p>
          <h1>Private label, made to brief.</h1>
          <p>Private-label and contract runs from artwork approval to delivery, and job-work tickets from request to return — with the customer informed at every step.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setNewRepairOpen(true)}><Icon name="settings" /> New repair</Button>
          <Button onClick={() => setView({ type: "custom-form" })}><Icon name="plus" /> New custom order</Button>
        </div>
      </div>
      <Tabs
        tabs={["Overview", "Custom Orders", "Repairs"]}
        active={view.type === "overview" ? "Overview" : view.type === "custom" ? "Custom Orders" : "Repairs"}
        onChange={t => setView({ type: t === "Overview" ? "overview" : t === "Custom Orders" ? "custom" : "repairs" })}
        label="Private label views"
      />

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Active custom orders" value={String(activeCustom.length)} note={`${lakh(customPipelineValue)} pipeline value`} icon="gem" iconTone="royal" onClick={() => setView({ type: "custom" })} />
            <KpiCard label="In production" value={String(inProduction)} note="With line operators right now" icon="settings" iconTone="gold" onClick={() => setView({ type: "custom" })} />
            <KpiCard label="Active repairs" value={String(activeRepairs.length)} note={`${repairs.length} total this season`} icon="shield" iconTone="royal" onClick={() => setView({ type: "repairs" })} />
            <KpiCard label="Ready for collection" value={String(readyRepairs)} note="Customer notified" noteTone={readyRepairs ? "warning" : "muted"} icon="check" iconTone="emerald" onClick={() => setView({ type: "repairs" })} />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">CUSTOM PIPELINE</p><h2>Orders by stage</h2></div></div>
              <BarList items={customPipeline} />
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">REPAIR PIPELINE</p><h2>Jobs by stage</h2></div></div>
              <BarList items={repairPipeline} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ON THE PACKING FLOOR</p><h2>Private-label orders moving</h2></div></div>
              <div className="feed">
                {activeCustom.slice(0, 4).map(o => (
                  <button key={o.id} type="button" onClick={() => setView({ type: "custom-detail", id: o.id })}>
                    <span className="feed-icon gold"><Icon name="gem" size={15} /></span>
                    <span className="feed-body">
                      <strong>{o.id} · {o.customerName}</strong>
                      <small>{o.productType} · {formatINR(o.quotedAmount ?? o.estimatedCost)}{o.stage === "Work in Progress" ? ` · ${o.progress}%` : ""}</small>
                    </span>
                    <Badge tone={customStageTone[o.stage]}>{o.stage}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">REPAIR BENCH</p><h2>Jobs needing action</h2></div></div>
              {activeRepairs.length === 0 ? (
                <EmptyState icon="check" title="Bench is clear" description="New repair requests appear here." mini />
              ) : (
                <div className="feed">
                  {activeRepairs.slice(0, 4).map(r => (
                    <button key={r.id} type="button" onClick={() => setView({ type: "repair-detail", id: r.id })}>
                      <span className="feed-icon royal"><Icon name="settings" size={15} /></span>
                      <span className="feed-body">
                        <strong>{r.id} · {r.customerName}</strong>
                        <small>{r.product} · expected {r.expectedDelivery}</small>
                      </span>
                      <Badge tone={repairStageTone[r.stage]}>{r.stage}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {view.type === "custom" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">CUSTOM ORDERS</p><h2>{filteredCustom.length} orders</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search custom orders" aria-label="Search custom orders" value={customQuery} onChange={e => setCustomQuery(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => setView({ type: "custom-form" })}><Icon name="plus" /> New custom order</Button>
            </div>
          </div>
          <DataTable
            columns={customColumns}
            rows={filteredCustom}
            rowKey={o => o.id}
            pageSize={8}
            emptyState={<EmptyState icon="gem" title="No matching custom orders" description="Try another keyword or create a new order." mini />}
          />
        </section>
      )}

      {view.type === "repairs" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">REPAIRS</p><h2>{filteredRepairs.length} jobs</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search repairs" aria-label="Search repairs" value={repairQuery} onChange={e => setRepairQuery(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => setNewRepairOpen(true)}><Icon name="plus" /> New repair</Button>
            </div>
          </div>
          <DataTable
            columns={repairColumns}
            rows={filteredRepairs}
            rowKey={r => r.id}
            pageSize={8}
            emptyState={<EmptyState icon="settings" title="No matching repairs" description="Try another keyword, or log a new repair." mini />}
          />
        </section>
      )}

      <NewRepairModal
        open={newRepairOpen}
        onClose={() => setNewRepairOpen(false)}
        onSubmit={(customerId, customerName, product, issue) => {
          const created = addRepair({
            customerId,
            customerName,
            product,
            tone: "gold",
            issue,
            expectedDelivery: "To be confirmed",
            photosBefore: [{ id: `rj-init-${customerId}`, label: "As received", tone: "gold" }],
          });
          setNewRepairOpen(false);
          toast({ tone: "success", title: "Repair logged", message: `${created.id} for ${customerName}.` });
          setView({ type: "repair-detail", id: created.id });
        }}
      />
    </div>
  );
}
