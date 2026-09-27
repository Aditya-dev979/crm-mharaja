import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import CommunicationCenter from "@/components/dispatch/CommunicationCenter";
import { NewDispatchModal } from "@/components/dispatch/DispatchModals";
import ShipmentDetail from "@/components/dispatch/ShipmentDetail";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { dispatchStatuses, dispatchStatusTone } from "@/data/dispatchData";
import { useDispatch } from "@/hooks/useDispatch";
import { useToast } from "@/hooks/useToast";
import type { Shipment } from "@/types";

type DispatchView =
  | { type: "overview" }
  | { type: "shipments" }
  | { type: "communication" }
  | { type: "detail"; id: string };

export default function DispatchPage({
  initialTab,
  onTabHandled,
  focusShipmentId,
  onFocusHandled,
  onOpenOrder,
  onOpenCustomer,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  focusShipmentId?: string | null;
  onFocusHandled?: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}) {
  const { shipments, messages, addShipment } = useDispatch();
  const toast = useToast();
  const [view, setView] = useState<DispatchView>({ type: "overview" });

  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Shipments") setView({ type: "shipments" });
    else if (initialTab === "Communication") setView({ type: "communication" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (!focusShipmentId) return;
    setView({ type: "detail", id: focusShipmentId });
    onFocusHandled?.();
  }, [focusShipmentId, onFocusHandled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter(s => {
      if (statusFilter !== "All statuses" && s.status !== statusFilter) return false;
      return !q || `${s.id} ${s.orderId} ${s.customerName} ${s.courier ?? ""} ${s.tracking ?? ""}`.toLowerCase().includes(q);
    });
  }, [shipments, query, statusFilter]);

  const columns: Column<Shipment>[] = [
    {
      key: "id", label: "Shipment", sortable: true, hideable: false, sortValue: s => s.id,
      render: s => (
        <button type="button" className="table-product" onClick={() => setView({ type: "detail", id: s.id })}>
          <span><b className="link">{s.id}</b><small>{s.packageType}</small></span>
        </button>
      ),
    },
    {
      key: "order", label: "Order", sortable: true, sortValue: s => s.orderId,
      render: s => <button type="button" className="cell-link" onClick={() => onOpenOrder(s.orderId)}>{s.orderId}</button>,
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: s => s.customerName,
      render: s => <button type="button" className="cell-link" onClick={() => onOpenCustomer(s.customerId)}>{s.customerName}</button>,
    },
    { key: "courier", label: "Courier", defaultHidden: true, render: s => s.courier ?? "—" },
    { key: "tracking", label: "Tracking", render: s => s.tracking ?? "—" },
    { key: "expected", label: "Expected", render: s => s.expectedDelivery ?? "—" },
    { key: "status", label: "Status", sortable: true, sortValue: s => s.status, render: s => <Badge tone={dispatchStatusTone[s.status]}>{s.status}</Badge> },
  ];

  if (view.type === "detail") {
    const shipment = shipments.find(s => s.id === view.id);
    if (!shipment) {
      setView({ type: "shipments" });
      return null;
    }
    return (
      <ShipmentDetail
        shipment={shipment}
        onBack={() => setView({ type: "shipments" })}
        onOpenOrder={onOpenOrder}
        onOpenCustomer={onOpenCustomer}
      />
    );
  }

  const active = shipments.filter(s => ["Ready to Dispatch", "Packing", "Dispatched", "In Transit"].includes(s.status));
  const attention = shipments.filter(s => s.status === "Failed");
  const delivered = shipments.filter(s => s.status === "Delivered");
  const pipeline = dispatchStatuses
    .map(status => ({ label: status, value: shipments.filter(s => s.status === status).length, display: String(shipments.filter(s => s.status === status).length) }))
    .filter(x => x.value > 0);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">DISPATCH · DELIVERY & COMMUNICATION</p>
          <h1>From plant to distributor.</h1>
          <p>Secure packing, insured couriers and a message for every milestone — WhatsApp, email and SMS from one desk.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setView({ type: "communication" })}><Icon name="mail" /> Communication center</Button>
          <Button onClick={() => setNewOpen(true)}><Icon name="send" /> New dispatch</Button>
        </div>
      </div>
      <Tabs
        tabs={["Overview", "Shipments", "Communication"]}
        active={view.type === "overview" ? "Overview" : view.type === "shipments" ? "Shipments" : "Communication"}
        onChange={t => setView({ type: t === "Overview" ? "overview" : t === "Shipments" ? "shipments" : "communication" })}
        label="Dispatch views"
      />

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Active shipments" value={String(active.length)} note="Packing to in-transit" icon="send" iconTone="royal" onClick={() => setView({ type: "shipments" })} />
            <KpiCard label="Needs attention" value={String(attention.length)} note="Failed deliveries" noteTone={attention.length ? "warning" : "muted"} icon="warning" iconTone="gold" onClick={() => { setStatusFilter("Failed"); setView({ type: "shipments" }); }} />
            <KpiCard label="Delivered" value={String(delivered.length)} note="Signed & smiling" icon="check" iconTone="emerald" onClick={() => { setStatusFilter("Delivered"); setView({ type: "shipments" }); }} />
            <KpiCard label="Messages sent" value={String(messages.length)} note="WhatsApp · Email · SMS" icon="mail" iconTone="royal" onClick={() => setView({ type: "communication" })} />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">DISPATCH PIPELINE</p><h2>Shipments by status</h2></div></div>
              <BarList items={pipeline} />
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ON THE MOVE</p><h2>Live shipments</h2></div></div>
              {active.length === 0 ? (
                <EmptyState icon="send" title="Nothing in motion" description="Create a dispatch from a paid order." mini />
              ) : (
                <div className="feed">
                  {active.slice(0, 4).map(s => (
                    <button key={s.id} type="button" onClick={() => setView({ type: "detail", id: s.id })}>
                      <span className="feed-icon royal"><Icon name="send" size={15} /></span>
                      <span className="feed-body">
                        <strong>{s.id} · {s.customerName}</strong>
                        <small>{s.orderId}{s.tracking ? ` · ${s.tracking}` : ""}{s.expectedDelivery ? ` · expected ${s.expectedDelivery}` : ""}</small>
                      </span>
                      <Badge tone={dispatchStatusTone[s.status]}>{s.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">RECENT MESSAGES</p><h2>Communication log</h2></div>
                <button type="button" className="link-btn" onClick={() => setView({ type: "communication" })}>Open center</button>
              </div>
              <div className="feed">
                {messages.slice(0, 4).map(m => (
                  <button key={m.id} type="button" onClick={() => setView({ type: "communication" })}>
                    <span className={`feed-icon ${m.channel === "WhatsApp" ? "emerald" : m.channel === "Email" ? "royal" : "gold"}`}>
                      <Icon name={m.channel === "Email" ? "mail" : m.channel === "SMS" ? "component" : "phone"} size={15} />
                    </span>
                    <span className="feed-body">
                      <strong>{m.templateName} · {m.partyName}</strong>
                      <small>{m.channel}{m.reference ? ` · ${m.reference}` : ""} · {m.time}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">FAILED & RETURNED</p><h2>Exceptions</h2></div></div>
              {shipments.filter(s => ["Failed", "Returned"].includes(s.status)).length === 0 ? (
                <EmptyState icon="check" title="No exceptions" description="Failed and returned shipments appear here." mini />
              ) : (
                <div className="feed">
                  {shipments.filter(s => ["Failed", "Returned"].includes(s.status)).slice(0, 4).map(s => (
                    <button key={s.id} type="button" onClick={() => setView({ type: "detail", id: s.id })}>
                      <span className="feed-icon amber"><Icon name="warning" size={15} /></span>
                      <span className="feed-body">
                        <strong>{s.id} · {s.customerName}</strong>
                        <small>{s.failReason ?? s.orderId}</small>
                      </span>
                      <Badge tone={dispatchStatusTone[s.status]}>{s.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {view.type === "shipments" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">SHIPMENTS</p><h2>{filtered.length} shipments</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search shipments" aria-label="Search shipments" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option>All statuses</option>
                {dispatchStatuses.map(s => <option key={s}>{s}</option>)}
              </select>
              <Button variant="secondary" onClick={() => setNewOpen(true)}><Icon name="plus" /> New dispatch</Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={s => s.id}
            pageSize={8}
            emptyState={<EmptyState icon="send" title="No matching shipments" description="Adjust the search or status filter." mini />}
          />
        </section>
      )}

      {view.type === "communication" && <CommunicationCenter />}

      <NewDispatchModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(order, packageType, weight, insured, address) => {
          const created = addShipment({
            orderId: order.id,
            customerId: order.customerId,
            customerName: order.customerName,
            address,
            packageType,
            weight,
            insured,
          });
          setNewOpen(false);
          toast({ tone: "success", title: "Shipment created", message: `${created.id} for ${order.customerName} — start packing.` });
          setView({ type: "detail", id: created.id });
        }}
      />
    </div>
  );
}
