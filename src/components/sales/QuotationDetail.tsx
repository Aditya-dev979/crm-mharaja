import { useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { TextAreaField } from "@/components/forms/Field";
import GemImage from "@/components/products/GemImage";
import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { lineTotal, quoteStatusTone, saleTotals } from "@/data/salesData";
import { useAdmin } from "@/hooks/useAdmin";
import { useSales } from "@/hooks/useSales";
import { useSendComm } from "@/components/dispatch/useSendComm";
import { useTeam } from "@/hooks/useTeam";
import { commTemplates } from "@/data/dispatchData";
import { useToast } from "@/hooks/useToast";
import type { SalesQuotation } from "@/types";
import { formatINR } from "@/utils";

export default function QuotationDetail({
  quote,
  onBack,
  onEdit,
  onConvert,
  onDuplicate,
  onOpenCustomer,
  onOpenOrder,
  onOpenProduct,
  onOpenQuotation,
}: {
  quote: SalesQuotation;
  onBack: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onDuplicate: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
}) {
  const { updateQuotation, reviseQuotation, quotations } = useSales();
  const { addNotification, logAudit } = useTeam();
  const { currentUser } = useAdmin();
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseReason, setReviseReason] = useState("");
  const [reviseError, setReviseError] = useState<string>();

  /* Every revision of a quotation shares a baseId, so the chain can be shown
     oldest-first with the live version called out. */
  const baseId = quote.baseId ?? quote.id;
  const versions = quotations
    .filter(q => (q.baseId ?? q.id) === baseId)
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
  const isSuperseded = Boolean(quote.supersededById);
  const latest = versions[versions.length - 1];
  const sendComm = useSendComm();
  const toast = useToast();
  const totals = saleTotals(quote.lines, quote.gstPct);

  /* Resending records a real message against the quotation, so the customer's
     communication history and the quote timeline both show it. */
  const resend = () => {
    const template = commTemplates.find(t => t.id === "tpl-quotation");
    if (!template) return;
    sendComm({
      channel: "WhatsApp",
      templateName: template.name,
      body: template.body,
      partyKind: "Customer",
      partyId: quote.customerId,
      partyName: quote.customerName,
      reference: quote.id,
    });
    updateQuotation(quote.id, {}, `Quotation re-shared with ${quote.customerName}`);
    toast({ tone: "success", title: "Quotation re-sent", message: `${quote.id} → ${quote.customerName} · logged in communication history.` });
  };

  const setStatus = (status: SalesQuotation["status"], event: string, tone: "success" | "info" = "success") => {
    updateQuotation(quote.id, { status }, event);
    addNotification({
      type: "Quotation Update",
      priority: status === "Accepted" || status === "Rejected" ? "High" : "Normal",
      title: `${quote.id} · ${status}`,
      message: `${quote.customerName} — ${event}`,
      reference: quote.id,
      recordRef: { kind: "quotation", id: quote.id },
    });
    toast({ tone, title: `Quotation ${status.toLowerCase()}`, message: `${quote.id} · ${quote.customerName}` });
  };

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All quotations</button>

      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{quote.id}</h1>
            <Badge tone={quoteStatusTone[quote.status]}>{quote.status}</Badge>
            {versions.length > 1 && <Badge tone="neutral">v{quote.version ?? 1}</Badge>}
            {isSuperseded && <Badge tone="amber">Superseded</Badge>}
            {!isSuperseded && versions.length > 1 && <Badge tone="emerald">Latest version</Badge>}
          </div>
          <p className="muted-line">
            <button type="button" className="link-btn" onClick={() => onOpenCustomer(quote.customerId)}>{quote.customerName}</button>
            {" "}· {quote.executive} · created {quote.created} · valid until {quote.validUntil}
          </p>
        </div>
        <div className="detail-actions">
          {quote.status === "Draft" && (
            <>
              <Button variant="secondary" onClick={onEdit}><Icon name="edit" /> Edit</Button>
              <Button onClick={() => setStatus("Sent", `Sent to ${quote.customerName}`)}><Icon name="mail" /> Send to customer</Button>
            </>
          )}
          {(quote.status === "Sent" || quote.status === "Negotiation") && (
            <>
              <Button variant="secondary" onClick={() => setReviseOpen(true)} disabled={isSuperseded}><Icon name="edit" /> Revise</Button>
              {quote.status === "Sent" && (
                <Button variant="secondary" onClick={() => setStatus("Negotiation", "Negotiation started", "info")}>Start negotiation</Button>
              )}
              <Button variant="secondary" onClick={resend}>
                <Icon name="phone" /> Resend
              </Button>
              <Button variant="danger" onClick={() => setStatus("Rejected", "Marked rejected by customer", "info")}>Reject</Button>
              <Button onClick={() => setStatus("Accepted", `Accepted by ${quote.customerName}`)}><Icon name="check" /> Mark accepted</Button>
            </>
          )}
          {quote.status === "Accepted" && (
            <Button onClick={onConvert}><Icon name="grid" /> Convert to order</Button>
          )}
          {(quote.status === "Rejected" || quote.status === "Expired") && (
            <Button variant="secondary" onClick={onDuplicate}><Icon name="component" /> Duplicate as draft</Button>
          )}
          {quote.status === "Converted" && quote.orderId && (
            <Button onClick={() => onOpenOrder(quote.orderId!)}>View order {quote.orderId} <Icon name="arrow" /></Button>
          )}
          <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Preparing PDF", message: `${quote.id}.pdf (demo)` })}>
            <Icon name="upload" /> PDF
          </Button>
        </div>
      </div>

      {quote.status === "Expired" && (
        <Alert tone="warning" title="This quotation has expired">Validity lapsed on {quote.validUntil}. Duplicate it as a draft to re-quote with current prices.</Alert>
      )}
      {quote.notes && <Alert tone="info" title="Internal note">{quote.notes}</Alert>}

      <div className="two-col quote-detail-grid">
        <section className="panel quote-doc">
          <div className="invoice-head">
            <Brand />
            <div className="invoice-meta">
              <strong>QUOTATION {quote.id}</strong>
              <small>{quote.created} · valid until {quote.validUntil}</small>
              <small>Prepared by {quote.executive} · Vapi Plant</small>
            </div>
          </div>
          <div className="invoice-billto">
            <p className="mini-title">PREPARED FOR</p>
            <strong>{quote.customerName}</strong>
          </div>
          <div className="quote-lines doc-lines">
            {quote.lines.map(line => (
              <div key={line.productId} className="quote-line">
                <button type="button" className="thumb-btn" onClick={() => onOpenProduct(line.productId)} aria-label={`View ${line.sku}`}>
                  <GemImage tone={line.tone} size="thumb" />
                </button>
                <div className="quote-line-name">
                  <strong>{line.name}</strong>
                  <small>{line.sku} · qty {line.qty}{line.discountPct ? ` · ${line.discountPct}% off` : ""}</small>
                </div>
                <strong className="quote-line-total">{formatINR(lineTotal(line))}</strong>
              </div>
            ))}
          </div>
          <div className="quote-totals">
            <div><span>Gross</span><strong>{formatINR(totals.gross)}</strong></div>
            <div><span>Discount</span><strong className={totals.discount ? "warning-text" : undefined}>− {formatINR(totals.discount)}</strong></div>
            <div><span>GST ({quote.gstPct}% included)</span><strong>{formatINR(totals.gstIncluded)}</strong></div>
            <div className="quote-grand"><span>Total</span><strong>{formatINR(totals.total)}</strong></div>
          </div>
          <p className="muted invoice-terms">{quote.terms}</p>
        </section>

        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">ACTIVITY</p><h2>Quotation timeline</h2></div>
          </div>
          <Timeline
            items={quote.timeline.map((event, i) => ({
              title: event.text,
              meta: event.time,
              state: i === 0 ? "current" : "done",
            }))}
          />
        </section>
      </div>
      {versions.length > 1 && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">REVISION HISTORY</p><h2>{versions.length} versions</h2></div>
            <Badge tone="gold">Live: {latest?.id}</Badge>
          </div>
          <div className="related-list">
            {versions.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => v.id !== quote.id && onOpenQuotation?.(v.id)}
              >
                <span className="doc-icon"><Icon name="component" /></span>
                <span>
                  <strong>v{v.version ?? 1} · {v.id}</strong>
                  <small>{formatINR(saleTotals(v.lines, v.gstPct).total)} · {v.created}</small>
                </span>
                {v.id === quote.id
                  ? <Badge tone="royal">Viewing</Badge>
                  : v.supersededById
                    ? <Badge tone="neutral">Superseded</Badge>
                    : <Badge tone="emerald">Latest</Badge>}
              </button>
            ))}
          </div>
        </section>
      )}

      {reviseOpen && (
        <ConfirmModal
          open
          onClose={() => setReviseOpen(false)}
          title={`Revise ${quote.id}?`}
          message={
            <>
              <p>
                Version {quote.version ?? 1} stays on record and is marked superseded. A new Draft version
                {" "}v{(quote.version ?? 1) + 1} is created for you to edit and re-send.
              </p>
              <TextAreaField
                label="Reason for revision" required
                placeholder="e.g. Customer asked for a revised slab rate on the 100 g pack."
                value={reviseReason}
                onChange={e => { setReviseReason(e.target.value); setReviseError(undefined); }}
                error={reviseError}
              />
            </>
          }
          confirmLabel={`Create v${(quote.version ?? 1) + 1}`}
          onConfirm={() => {
            if (!reviseReason.trim()) return setReviseError("Give a reason — it goes on both versions");
            const next = reviseQuotation(quote.id, {}, reviseReason.trim());
            logAudit({
              user: currentUser, action: "Quotation revised", module: "Sales",
              record: quote.id, oldValue: `v${quote.version ?? 1}`, newValue: `v${(quote.version ?? 1) + 1} · ${reviseReason.trim()}`,
            });
            setReviseOpen(false);
            setReviseReason("");
            toast({ tone: "success", title: `Version ${(quote.version ?? 1) + 1} created`, message: `${next?.id} is a Draft — edit and send it.` });
            if (next) onOpenQuotation?.(next.id);
          }}
        />
      )}
    </div>
  );
}
