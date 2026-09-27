import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Switch from "@/components/forms/Switch";
import EmptyState from "@/components/data-display/EmptyState";
import Timeline from "@/components/data-display/Timeline";
import { useSendComm } from "@/components/dispatch/useSendComm";
import { commTemplates } from "@/data/dispatchData";
import { deviationStatusTone, poPaid, poStatusTone, poTotals } from "@/data/purchaseData";
import { useDispatch } from "@/hooks/useDispatch";
import { usePurchase } from "@/hooks/usePurchase";
import { useToast } from "@/hooks/useToast";
import type { Supplier } from "@/types";
import { formatINR } from "@/utils";

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

export default function SupplierProfile({
  supplier,
  onBack,
  onEdit,
  onOpenPO,
  onNewPO,
  onOpenDeviation,
}: {
  supplier: Supplier;
  onBack: () => void;
  onEdit: () => void;
  onOpenPO: (poId: string) => void;
  onNewPO: () => void;
  onOpenDeviation?: () => void;
}) {
  const { pos, updateSupplier, quotations, deviations } = usePurchase();
  const { messages } = useDispatch();
  const sendComm = useSendComm();
  const toast = useToast();
  const supplierPOs = pos.filter(po => po.supplierId === supplier.id && po.status !== "Cancelled");
  const totalBusiness = supplierPOs.reduce((s, po) => s + poTotals(po).total, 0);
  const totalPaid = supplierPOs.reduce((s, po) => s + poPaid(po), 0);
  const outstanding = totalBusiness - totalPaid;
  const payments = supplierPOs
    .flatMap(po => po.payments.map(p => ({ ...p, poId: po.id })))
    .reverse();

  const initials = supplier.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  /* Coordination: every message that went to this supplier, plus their open
     quotations and deviations — one place to run the relationship from. */
  const supplierMessages = messages.filter(m => m.partyKind === "Supplier" && (m.partyId === supplier.id || m.partyName === supplier.name));
  const supplierQuotations = quotations.filter(q => q.supplierId === supplier.id);
  const supplierDeviations = deviations.filter(d => d.supplierId === supplier.id || d.supplierName === supplier.name);
  const latestPO = supplierPOs[supplierPOs.length - 1];

  const coordinate = (templateId: string, label: string) => {
    const template = commTemplates.find(t => t.id === templateId);
    if (!template) return;
    sendComm({
      channel: template.channels[0],
      templateName: template.name,
      body: template.body,
      partyKind: "Supplier",
      partyId: supplier.id,
      partyName: supplier.name,
      reference: latestPO?.id,
    });
    toast({ tone: "success", title: `${label} sent`, message: `${supplier.name} · logged on ${latestPO ? latestPO.id : "the supplier record"}.` });
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All suppliers</button>

      <section className="panel profile-head">
        <div className="profile-identity">
          <div className="avatar large profile-avatar" aria-hidden="true">{initials}</div>
          <div>
            <div className="detail-title">
              <h1>{supplier.name}</h1>
              <Badge tone={supplier.active ? "emerald" : "neutral"}>{supplier.active ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="muted-line">
              {supplier.contact} · +91 {supplier.phone} · {supplier.email} · {supplier.city}
              {supplier.gstin && <> · GSTIN {supplier.gstin}</>}
            </p>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {supplier.speciality.map(s => <span className="pref-chip" key={s}><Icon name="gem" size={13} /> {s}</span>)}
            </div>
          </div>
          <div className="detail-actions">
            <Switch
              on={supplier.active}
              label={`${supplier.name} active`}
              onChange={on => {
                updateSupplier(supplier.id, { active: on });
                toast({ tone: on ? "success" : "info", title: `Supplier ${on ? "activated" : "deactivated"}`, message: on ? "Available on new purchase orders." : "Hidden from new purchase orders." });
              }}
            />
            <Button variant="secondary" onClick={onEdit}><Icon name="edit" /> Edit</Button>
            <Button onClick={onNewPO}><Icon name="plus" /> New purchase order</Button>
          </div>
        </div>
        <div className="stat-chips profile-stats">
          <div className="stat-chip"><span>Total business</span><strong>{lakh(totalBusiness)}</strong><small>{supplierPOs.length} purchase orders</small></div>
          <div className="stat-chip"><span>Paid</span><strong>{lakh(totalPaid)}</strong><small>Across all POs</small></div>
          <div className="stat-chip"><span>Outstanding payable</span><strong className={outstanding > 0 ? "warning-text" : undefined}>{formatINR(outstanding)}</strong><small>{outstanding > 0 ? "Due per PO terms" : "Nothing due"}</small></div>
          <div className="stat-chip"><span>Partner since</span><strong>{supplier.since}</strong><small>{supplier.city}</small></div>
        </div>
      </section>

      {supplier.notes && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">NOTES</p><h2>Working notes</h2></div></div>
          <p className="requirement-quote">“{supplier.notes}”</p>
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <div className="section-head"><div><p className="kicker">PURCHASE ORDERS</p><h2>{supplierPOs.length} orders</h2></div></div>
          {supplierPOs.length === 0 ? (
            <EmptyState icon="building" title="No purchase orders yet" description="Raise the first PO to start the relationship ledger." mini action={<Button variant="secondary" onClick={onNewPO}>New purchase order</Button>} />
          ) : (
            <div className="related-list">
              {supplierPOs.map(po => {
                const totals = poTotals(po);
                const balance = totals.total - poPaid(po);
                return (
                  <button key={po.id} type="button" onClick={() => onOpenPO(po.id)}>
                    <span className="doc-icon"><Icon name="building" /></span>
                    <span>
                      <strong>{po.id} · {formatINR(totals.total)}</strong>
                      <small>{po.created} · {balance > 0 ? `${formatINR(balance)} payable` : "paid in full"} · due {po.deliveryDate}</small>
                    </span>
                    <Badge tone={poStatusTone[po.status]}>{po.status}</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">PAYMENT HISTORY</p><h2>{payments.length} payments</h2></div></div>
          {payments.length === 0 ? (
            <EmptyState icon="check" title="No payments yet" description="Supplier payments recorded on POs appear here." mini />
          ) : (
            <div className="detail-list">
              {payments.map(p => (
                <div key={p.id}><span>{p.id} · {p.poId} · {p.method} · {p.date}</span><strong>{formatINR(p.amount)}</strong></div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">COORDINATION</p><h2>Supplier communication</h2></div>
            <Badge tone={supplierMessages.length ? "royal" : "neutral"}>{supplierMessages.length} message{supplierMessages.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            <Button variant="secondary" onClick={() => coordinate("tpl-po", "Purchase order")}><Icon name="mail" /> Send PO</Button>
            <Button variant="secondary" onClick={() => coordinate("tpl-grn", "GRN update")}><Icon name="layers" /> GRN update</Button>
            <Button variant="secondary" onClick={() => coordinate("tpl-supplier-payment", "Payment update")}><Icon name="check" /> Payment update</Button>
          </div>
          {supplierMessages.length === 0 ? (
            <EmptyState icon="mail" title="No messages yet" description="Purchase orders, GRN updates and payment notes sent to this supplier appear here." mini />
          ) : (
            <Timeline
              items={supplierMessages.slice(0, 8).map((m, i) => ({
                title: `${m.templateName}${m.reference ? ` · ${m.reference}` : ""}`,
                meta: `${m.channel} · ${m.time}`,
                state: i === 0 ? "current" : "done",
              }))}
            />
          )}
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">SOURCING RECORD</p><h2>Quotations & deviations</h2></div></div>
          {supplierQuotations.length === 0 && supplierDeviations.length === 0 ? (
            <EmptyState icon="building" title="No sourcing history" description="Quotations collected against purchase requests and any GRN deviations show here." mini />
          ) : (
            <>
              {supplierQuotations.length > 0 && (
                <div className="detail-list">
                  {supplierQuotations.map(q => (
                    <div key={q.id}>
                      <span>{q.id} · {q.prId} · {q.deliveryDays} days · {q.creditDays} days credit</span>
                      <strong>{formatINR(q.price)}{q.selected ? " · selected" : ""}</strong>
                    </div>
                  ))}
                </div>
              )}
              {supplierDeviations.length > 0 && (
                <div className="related-list" style={{ marginTop: 12 }}>
                  {supplierDeviations.map(d => (
                    <button key={d.id} type="button" onClick={() => onOpenDeviation?.()}>
                      <span className="doc-icon"><Icon name="warning" /></span>
                      <span>
                        <strong>{d.id} · {d.grnId}</strong>
                        <small>{d.rejectedQty} of {d.receivedQty} rejected · {d.deviationPct}%</small>
                      </span>
                      <Badge tone={deviationStatusTone[d.status]}>{d.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
