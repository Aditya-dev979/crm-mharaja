import { useEffect, useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Alert from "@/components/feedback/Alert";
import Switch from "@/components/forms/Switch";
import CmAssignmentDetail from "@/components/production/CmAssignmentDetail";
import ProductionOrderDetail from "@/components/production/ProductionOrderDetail";
import { AssignmentModal, BomModal, ManufacturerModal, MaterialModal, MaterialMovementModal, ProductionOrderModal, ReviseBomModal } from "@/components/production/ProductionModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { cmStatusTone, lotAgeDays, productionStatusTone } from "@/data/productionData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProduction } from "@/hooks/useProduction";
import { useToast } from "@/hooks/useToast";
import type { Bom, MaterialItem } from "@/types";
import { formatINR } from "@/utils";

type View =
  | { type: "overview" }
  | { type: "orders" }
  | { type: "boms" }
  | { type: "materials" }
  | { type: "daily" }
  | { type: "lots" }
  | { type: "cm" }
  | { type: "order-detail"; id: string }
  | { type: "cm-detail"; id: string };

const tabs = ["Overview", "Production Orders", "Formulation", "Materials", "Daily Reports", "Finished Goods", "Contract Manufacturing"];

export default function ProductionPage({
  initialTab,
  onTabHandled,
  focusRecordId,
  onOpenSalesOrder,
  onOpenReturn,
  onOpenDispatch,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  focusRecordId?: string;
  onOpenSalesOrder: (orderId: string) => void;
  onOpenReturn?: (returnId: string) => void;
  onOpenDispatch?: () => void;
}) {
  const { orders, boms, materials, lots, manufacturers, assignments, updateManufacturer } = useProduction();
  const { can, activeRole } = useAdmin();
  const toast = useToast();
  const [view, setView] = useState<View>(
    focusRecordId?.startsWith("CMA-")
      ? { type: "cm-detail", id: focusRecordId }
      : focusRecordId
        ? { type: "order-detail", id: focusRecordId }
        : { type: "overview" },
  );

  /* A deep link can arrive while the page is already mounted. */
  useEffect(() => {
    if (!focusRecordId) return;
    setView(focusRecordId.startsWith("CMA-") ? { type: "cm-detail", id: focusRecordId } : { type: "order-detail", id: focusRecordId });
  }, [focusRecordId]);

  /* A navigation entry can open this workspace straight on one of its tabs. */
  useEffect(() => {
    if (!initialTab) return;
    if (initialTab === "Production Orders") setView({ type: "orders" });
    else if (initialTab === "Formulation") setView({ type: "boms" });
    else if (initialTab === "Materials") setView({ type: "materials" });
    else if (initialTab === "Daily Reports") setView({ type: "daily" });
    else if (initialTab === "Finished Goods") setView({ type: "lots" });
    else if (initialTab === "Contract Manufacturing") setView({ type: "cm" });
    onTabHandled?.();
  }, [initialTab, onTabHandled]);
  const [orderModal, setOrderModal] = useState(false);
  const [bomModal, setBomModal] = useState(false);
  const [reviseBom, setReviseBom] = useState<Bom | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [materialKind, setMaterialKind] = useState<"All" | "Raw Material" | "Packaging">("All");
  const [materialModal, setMaterialModal] = useState(false);
  const [manufacturerModal, setManufacturerModal] = useState(false);
  const [movementFor, setMovementFor] = useState<MaterialItem | null>(null);

  const canEdit = can("Production", "Edit");

  /* Only live formulations are listed; superseded versions appear as history on
     the card that replaced them. */
  const liveBoms = boms.filter(b => !b.supersededById);
  const versionsOf = (b: Bom) => {
    const base = b.baseId ?? b.id;
    return boms.filter(x => (x.baseId ?? x.id) === base).sort((p, q) => p.version - q.version);
  };
  const active = orders.filter(o => o.status !== "Completed");
  const inProduction = orders.filter(o => o.status === "In Production");
  const planned = orders.reduce((s, o) => s + o.plannedQty, 0);
  const produced = orders.reduce((s, o) => s + o.producedQty, 0);
  const rejected = orders.reduce((s, o) => s + o.rejectedQty, 0);
  const lowMaterials = materials.filter(m => m.available <= m.reorderLevel);
  const fifoValue = lots.reduce((s, l) => s + l.remaining * l.rate, 0);
  const readyAtCm = assignments.reduce((s, a) => s + a.readyQty, 0);
  const allEntries = orders
    .flatMap(o => o.entries.map(e => ({ ...e, orderId: o.id, product: o.product })))
    .sort((a, b) => b.id.localeCompare(a.id));

  if (view.type === "order-detail") {
    const order = orders.find(o => o.id === view.id);
    if (!order) {
      setView({ type: "orders" });
      return null;
    }
    return (
      <ProductionOrderDetail
        order={order}
        onBack={() => setView({ type: "orders" })}
        onOpenOrder={onOpenSalesOrder}
        onOpenLots={() => setView({ type: "lots" })}
        onOpenReturn={onOpenReturn}
      />
    );
  }

  if (view.type === "cm-detail") {
    const assignment = assignments.find(a => a.id === view.id);
    if (!assignment) {
      setView({ type: "cm" });
      return null;
    }
    return (
      <CmAssignmentDetail
        assignment={assignment}
        onBack={() => setView({ type: "cm" })}
        onOpenOrder={onOpenSalesOrder}
        onOpenDispatch={onOpenDispatch}
      />
    );
  }

  const shownMaterials = materials.filter(m => materialKind === "All" || m.kind === materialKind);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">MANUFACTURING · OWN PLANT & CONTRACT UNITS</p>
          <h1>Released orders, made and accounted.</h1>
          <p>Raw material and packaging, formulations, production planning, daily reports and finished-goods posting with FIFO lots — plus external manufacturing without pretending their stock is ours.</p>
        </div>
        <div className="detail-actions">
          {canEdit && <Button variant="secondary" onClick={() => setBomModal(true)}><Icon name="gem" /> New formulation</Button>}
          {canEdit && <Button onClick={() => setOrderModal(true)}><Icon name="plus" /> Production order</Button>}
        </div>
      </div>

      <Tabs
        tabs={tabs}
        active={
          view.type === "orders" ? "Production Orders"
          : view.type === "boms" ? "Formulation"
          : view.type === "materials" ? "Materials"
          : view.type === "daily" ? "Daily Reports"
          : view.type === "lots" ? "Finished Goods"
          : view.type === "cm" ? "Contract Manufacturing"
          : "Overview"
        }
        onChange={t =>
          setView(
            t === "Production Orders" ? { type: "orders" }
            : t === "Formulation" ? { type: "boms" }
            : t === "Materials" ? { type: "materials" }
            : t === "Daily Reports" ? { type: "daily" }
            : t === "Finished Goods" ? { type: "lots" }
            : t === "Contract Manufacturing" ? { type: "cm" }
            : { type: "overview" },
          )
        }
        label="Production views"
      />

      {!canEdit && (
        <Alert tone="info" title={`${activeRole} has review access`}>
          Production planning, material issue and completion belong to the Plant Manager. Everything below stays visible for coordination.
        </Alert>
      )}

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Active production orders" value={String(active.length)} note={`${inProduction.length} on the floor today`} icon="layers" iconTone="royal" onClick={() => setView({ type: "orders" })} />
            <KpiCard label="Produced this quarter" value={`${produced} / ${planned}`} note={`${rejected} rejected or damaged`} noteTone={rejected ? "warning" : "muted"} icon="check" iconTone="gold" onClick={() => setView({ type: "daily" })} />
            <KpiCard label="Finished-goods FIFO value" value={formatINR(fifoValue)} note={`${lots.filter(l => l.remaining > 0).length} open lots`} icon="gem" iconTone="royal" onClick={() => setView({ type: "lots" })} />
            <KpiCard label="Ready at contract manufacturers" value={String(readyAtCm)} note="Tracked, not counted as our stock" noteTone="muted" icon="building" iconTone="gold" onClick={() => setView({ type: "cm" })} />
          </div>

          {lowMaterials.length > 0 && (
            <Alert tone="warning" title={`${lowMaterials.length} material line${lowMaterials.length === 1 ? "" : "s"} at or below reorder level`}>
              {lowMaterials.map(m => `${m.name} (${m.available} ${m.unit})`).join(" · ")}.{" "}
              <button type="button" className="link-btn" onClick={() => setView({ type: "materials" })}>Open the material register</button>
            </Alert>
          )}

          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ON THE FLOOR</p><h2>Production orders in progress</h2></div></div>
              {active.length === 0 ? (
                <EmptyState icon="layers" title="Nothing in production" description="Released orders create production orders here." mini />
              ) : (
                <div className="related-list">
                  {active.map(o => (
                    <button key={o.id} type="button" onClick={() => setView({ type: "order-detail", id: o.id })}>
                      <span className="doc-icon"><Icon name="layers" /></span>
                      <span>
                        <strong>{o.id} · {o.product}</strong>
                        <small>{o.producedQty} of {o.plannedQty} produced · {o.plant} · {o.responsible}</small>
                      </span>
                      <Badge tone={productionStatusTone[o.status]}>{o.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">EXTERNAL</p><h2>Contract manufacturing</h2></div></div>
              <div className="related-list">
                {assignments.map(a => (
                  <button key={a.id} type="button" onClick={() => setView({ type: "cm-detail", id: a.id })}>
                    <span className="doc-icon"><Icon name="building" /></span>
                    <span>
                      <strong>{a.id} · {a.manufacturerName}</strong>
                      <small>{a.readyQty} of {a.qty} ready · expected {a.expectedCompletion}</small>
                    </span>
                    <Badge tone={cmStatusTone[a.status]}>{a.status}</Badge>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {view.type === "orders" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">PRODUCTION PLANNING</p><h2>{orders.length} production orders</h2></div>
            {canEdit && <Button variant="secondary" onClick={() => setOrderModal(true)}><Icon name="plus" /> New order</Button>}
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead>
                <tr><th>Order</th><th>Product</th><th>Against</th><th>Planned</th><th>Produced</th><th>Balance</th><th>Plant</th><th>Responsible</th><th>Window</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><button type="button" className="link-btn" onClick={() => setView({ type: "order-detail", id: o.id })}>{o.id}</button></td>
                    <td className="note-cell">{o.product}</td>
                    <td>{o.sourceReturnId ?? o.orderId ?? "Stock build"}</td>
                    <td>{o.plannedQty}{o.adjustmentPct ? ` (${o.adjustmentPct}%)` : ""}</td>
                    <td>{o.producedQty}</td>
                    <td>{Math.max(0, o.plannedQty - o.producedQty)}</td>
                    <td className="note-cell">{o.plant}</td>
                    <td>{o.responsible}</td>
                    <td className="note-cell">{o.plannedStart} → {o.plannedComplete}</td>
                    <td><Badge tone={productionStatusTone[o.status]}>{o.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view.type === "boms" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">BOM / FORMULATION</p><h2>{liveBoms.length} live formulations</h2></div>
            {canEdit && <Button variant="secondary" onClick={() => setBomModal(true)}><Icon name="plus" /> New formulation</Button>}
          </div>
          {liveBoms.map(b => (
            <div className="bom-card" key={b.id}>
              <div className="section-head">
                <div>
                  <p className="kicker">{b.id} · VERSION {b.version}</p>
                  <h2>{b.product}</h2>
                  <p className="muted-line">{b.sku ?? "No SKU"} · by {b.createdBy} · {b.created} · used by {orders.filter(o => o.bomId === b.id).length} production order(s)</p>
                </div>
                <div className="head-actions">
                  <Badge tone="neutral">{b.lines.length} lines</Badge>
                  {canEdit && (
                    <Button variant="secondary" onClick={() => setReviseBom(b)}>
                      <Icon name="edit" /> Revise formulation
                    </Button>
                  )}
                </div>
              </div>
              <div className="table-wrap op-table">
                <table>
                  <thead><tr><th>Material</th><th>Per unit</th><th>Available now</th></tr></thead>
                  <tbody>
                    {b.lines.map(l => {
                      const m = materials.find(x => x.id === l.materialId);
                      return (
                        <tr key={l.materialId}>
                          <td className="note-cell">{l.materialName}</td>
                          <td>{l.qtyPerUnit} {l.unit}</td>
                          <td className={m && m.available <= m.reorderLevel ? "warning-text" : undefined}>
                            {m ? `${m.available} ${m.unit}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {b.notes && <p className="requirement-quote">“{b.notes}”</p>}
              {b.revisionReason && (
                <p className="muted-line">Revised because: {b.revisionReason} · previous version {b.previousVersionId}</p>
              )}
              {versionsOf(b).length > 1 && (
                <div className="revision-list">
                  <h4>Formulation history — {versionsOf(b).length} versions</h4>
                  <ul>
                    {versionsOf(b).map(v => (
                      <li key={v.id}>
                        <span><strong>v{v.version}</strong> · {v.id}</span>
                        <span>{v.lines.length} lines · {v.createdBy} · {v.created}</span>
                        <span className="muted">
                          {v.supersededById
                            ? `Superseded by ${v.supersededById}`
                            : `Live · used by ${orders.filter(o => o.bomId === v.id).length} order(s)`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="muted-line">
                    Production orders keep the version they were released against, so a completed batch always
                    shows the formulation actually used.
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {view.type === "materials" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">RAW MATERIAL & PACKAGING</p><h2>{shownMaterials.length} of {materials.length} lines</h2></div>
            <div className="chip-row">
              {canEdit && (
                <Button variant="secondary" onClick={() => setMaterialModal(true)}><Icon name="plus" /> New material line</Button>
              )}
              {(["All", "Raw Material", "Packaging"] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  className={materialKind === k ? "pref-chip active-chip" : "pref-chip"}
                  onClick={() => setMaterialKind(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap op-table">
            <table>
              <thead>
                <tr><th>Code</th><th>Material</th><th>Kind</th><th>Available</th><th>Reserved</th><th>Consumed</th><th>Reorder at</th><th>Rate</th><th>Location</th><th>Movement</th></tr>
              </thead>
              <tbody>
                {shownMaterials.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.code}</strong></td>
                    <td className="note-cell">{m.name}</td>
                    <td><Badge tone={m.kind === "Packaging" ? "neutral" : "royal"}>{m.kind}</Badge></td>
                    <td className={m.available <= m.reorderLevel ? "warning-text" : undefined}>{m.available} {m.unit}</td>
                    <td>{m.reserved} {m.unit}</td>
                    <td>{m.consumed} {m.unit}</td>
                    <td>{m.reorderLevel} {m.unit}</td>
                    <td>{formatINR(m.rate)}/{m.unit}</td>
                    <td className="note-cell">{m.location}</td>
                    <td>
                      <button
                        type="button" className="link-btn"
                        onClick={() => {
                          if (!canEdit) {
                            toast({ tone: "error", title: "Not permitted", message: `${activeRole} cannot move material stock.` });
                            return;
                          }
                          setMovementFor(m);
                        }}
                      >
                        Receipt / issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="kicker" style={{ marginTop: 16 }}>MOVEMENT HISTORY</p>
          <div className="detail-list">
            {shownMaterials.flatMap(m => m.movements.slice(0, 2).map((mv, i) => (
              <div key={`${m.id}-${i}`}>
                <span>{m.name} · {mv.text}</span>
                <strong className={mv.qty < 0 ? "warning-text" : "up-text"}>{mv.qty > 0 ? "+" : ""}{mv.qty} {m.unit} · {mv.time}</strong>
              </div>
            )))}
          </div>
        </section>
      )}

      {view.type === "daily" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">DAILY PRODUCTION REPORTS</p><h2>{allEntries.length} entries</h2></div>
            <Badge tone="royal">{produced} produced · {rejected} rejected</Badge>
          </div>
          {allEntries.length === 0 ? (
            <EmptyState icon="layers" title="No daily entries yet" description="Entries recorded on a production order roll up here." mini />
          ) : (
            <div className="table-wrap op-table">
              <table>
                <thead><tr><th>Entry</th><th>Date</th><th>Production order</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Material consumed</th><th>Responsible</th></tr></thead>
                <tbody>
                  {allEntries.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.id}</strong></td>
                      <td>{e.date}</td>
                      <td><button type="button" className="link-btn" onClick={() => setView({ type: "order-detail", id: e.orderId })}>{e.orderId}</button></td>
                      <td className="note-cell">{e.product}</td>
                      <td>{e.produced}</td>
                      <td className={e.rejected ? "warning-text" : undefined}>{e.rejected}</td>
                      <td className="note-cell">{e.materialNote}</td>
                      <td>{e.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {view.type === "lots" && (
        <>
          <Alert tone="info" title="FIFO valuation">
            Finished goods are held as dated lots. Dispatch and sale consume the oldest open lot first, so valuation and traceability follow the
            business rule without a separate ledger.
          </Alert>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">FINISHED GOODS · FIFO LOTS</p><h2>{lots.filter(l => l.remaining > 0).length} open lots</h2></div>
              <Badge tone="royal">{formatINR(fifoValue)} at cost</Badge>
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead>
                  <tr><th>Lot</th><th>Batch</th><th>SKU</th><th>Product</th><th>Received</th><th>Age</th><th>Qty</th><th>Remaining</th><th>Rate</th><th>Source</th><th>FIFO order</th></tr>
                </thead>
                <tbody>
                  {[...lots].sort((a, b) => a.dateRank - b.dateRank).map((l, i) => {
                    const ageDays = lotAgeDays(l.dateRank);
                    return (
                      <tr key={l.id} className={l.remaining === 0 ? "lot-exhausted" : undefined}>
                        <td><strong>{l.id}</strong></td>
                        <td>{l.batchNo ? <code>{l.batchNo}</code> : <span className="muted">Bought in</span>}</td>
                        <td>{l.sku}</td>
                        <td className="note-cell">{l.product}</td>
                        <td>{l.receivedDate}</td>
                        <td>{ageDays} days</td>
                        <td>{l.qty}</td>
                        <td className={l.remaining === 0 ? "muted" : undefined}>{l.remaining}</td>
                        <td>{formatINR(l.rate)}</td>
                        <td>{l.source}</td>
                        <td>{l.remaining === 0 ? "Consumed" : `#${i + 1} to issue`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {view.type === "cm" && (
        <>
          <Alert tone="info" title="External manufacturer inventory is not managed here">
            Maharaja Soap tracks assignment status and ready-to-dispatch quantity. Material at a contract manufacturer never posts to our
            inventory ledger — only goods received back do.
          </Alert>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">ASSIGNMENTS</p><h2>{assignments.length} on record</h2></div>
              {canEdit && <Button variant="secondary" onClick={() => setAssignModal(true)}><Icon name="plus" /> New assignment</Button>}
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead><tr><th>Assignment</th><th>Manufacturer</th><th>Product</th><th>Order / PI</th><th>Qty</th><th>Ready</th><th>Sent</th><th>Expected</th><th>Status</th></tr></thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td><button type="button" className="link-btn" onClick={() => setView({ type: "cm-detail", id: a.id })}>{a.id}</button></td>
                      <td>{a.manufacturerName}</td>
                      <td className="note-cell">{a.product}</td>
                      <td>{[a.orderId, a.piId].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{a.qty}</td>
                      <td>{a.readyQty}</td>
                      <td>{a.sentDate}</td>
                      <td>{a.expectedCompletion}</td>
                      <td><Badge tone={cmStatusTone[a.status]}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">MANUFACTURER PROFILES</p><h2>{manufacturers.length} partners</h2></div>
              {canEdit && (
                <Button variant="secondary" onClick={() => setManufacturerModal(true)}><Icon name="plus" /> Add manufacturer</Button>
              )}
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead><tr><th>Manufacturer</th><th>Contact</th><th>City</th><th>Speciality</th><th>Since</th><th>Assignments</th><th>Active</th></tr></thead>
                <tbody>
                  {manufacturers.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong>{m.notes && <><br /><small className="muted">{m.notes}</small></>}</td>
                      <td>{m.contact}<br /><small className="muted">+91 {m.phone} · {m.email}</small></td>
                      <td>{m.city}</td>
                      <td className="note-cell">{m.speciality.join(", ")}</td>
                      <td>{m.since}</td>
                      <td>{assignments.filter(a => a.manufacturerId === m.id).length}</td>
                      <td>
                        <Switch
                          on={m.active}
                          label={`${m.name} active`}
                          onChange={on => {
                            if (!canEdit) {
                              toast({ tone: "error", title: "Not permitted", message: `${activeRole} cannot change manufacturer status.` });
                              return;
                            }
                            updateManufacturer(m.id, { active: on });
                            toast({ tone: on ? "success" : "info", title: `${m.name} ${on ? "activated" : "deactivated"}`, message: on ? "Available for new assignments." : "Hidden from new assignments." });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ProductionOrderModal open={orderModal} onClose={() => setOrderModal(false)} onCreated={id => setView({ type: "order-detail", id })} />
      <BomModal open={bomModal} onClose={() => setBomModal(false)} />
      <ReviseBomModal bom={reviseBom} onClose={() => setReviseBom(null)} />
      <AssignmentModal open={assignModal} onClose={() => setAssignModal(false)} onCreated={id => setView({ type: "cm-detail", id })} />
      <MaterialModal open={materialModal} onClose={() => setMaterialModal(false)} />
      <MaterialMovementModal open={Boolean(movementFor)} onClose={() => setMovementFor(null)} material={movementFor} />
      <ManufacturerModal open={manufacturerModal} onClose={() => setManufacturerModal(false)} />
    </div>
  );
}
