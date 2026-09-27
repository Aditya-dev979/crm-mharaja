import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { docTypeTone, paymentStateTone, piStatusTone } from "@/data/financeData";
import { useToast } from "@/hooks/useToast";
import type { FinanceDoc, PaymentState } from "@/types";
import { downloadCsv, formatINR } from "@/utils";

export interface ResolvedDoc {
  gross: number;
  discount: number;
  total: number;
  gstIncluded: number;
  paid: number;
  balance: number;
  state: PaymentState;
}

export default function DocumentView({
  doc,
  resolved,
  derived,
  versions,
  extraActions,
  onBack,
  onOpenParty,
  onOpenReference,
  onOpenVersion,
  onRecordPayment,
  onConvert,
  onVoid,
  onToggleHold,
  accounting,
  onSend,
}: {
  doc: FinanceDoc;
  resolved: ResolvedDoc;
  derived: boolean;
  /** All versions of this PI's base, oldest first. */
  versions?: FinanceDoc[];
  /** Page-composed PI lifecycle actions rendered in the header. */
  extraActions?: React.ReactNode;
  onBack: () => void;
  onOpenParty?: () => void;
  onOpenReference?: () => void;
  onOpenVersion?: (id: string) => void;
  onRecordPayment?: () => void;
  onConvert?: () => void;
  onVoid?: () => void;
  onToggleHold?: () => void;
  /** Simulated Tally posting state for this document. */
  accounting?: {
    status: "Pending" | "Queued" | "Synced" | "Failed" | "Retry";
    voucherType: string;
    debitLedger: string;
    creditLedger: string;
    narrative: string;
    tallyRef?: string;
    lastSync?: string;
    error?: string;
    canPost: boolean;
    onPost?: () => void;
    onOpenTally?: () => void;
  };
  /** Sends this document to the party on WhatsApp or email. */
  onSend?: () => void;
}) {
  const toast = useToast();
  const isInvoice = doc.type === "Proforma Invoice" || doc.type === "GST Invoice";
  const isMoneyDoc = doc.type === "Payment Receipt" || doc.type === "Refund Receipt";

  const details: Array<[string, React.ReactNode | undefined]> = [
    ["Document type", doc.type],
    ["Party", onOpenParty
      ? <button type="button" className="link-btn" onClick={onOpenParty}>{doc.partyName}</button>
      : doc.partyName],
    ["Reference", doc.reference
      ? onOpenReference
        ? <button type="button" className="link-btn" onClick={onOpenReference}>{doc.reference}</button>
        : doc.reference
      : undefined],
    ["Date", doc.date],
    ["Due / validity", doc.dueDate],
    ["Method", doc.method],
    ["Created by", doc.createdBy],
  ];

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All documents</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{doc.id}</h1>
            <Badge tone={docTypeTone[doc.type]}>{doc.type}</Badge>
            {doc.pi && <Badge tone={piStatusTone[doc.pi.status]}>{doc.pi.status}</Badge>}
            {doc.pi && <Badge tone="neutral">v{doc.pi.version}</Badge>}
            {doc.hold && !doc.hold.resolvedAt && <Badge tone="danger">Payment Hold</Badge>}
            {doc.voided ? <Badge tone="danger">Voided</Badge> : <Badge tone={paymentStateTone[resolved.state]}>{resolved.state}</Badge>}
          </div>
          <p className="muted-line">{doc.partyName} · {doc.date}{doc.reference ? ` · against ${doc.reference}` : ""}</p>
        </div>
        <div className="detail-actions">
          {extraActions}
          {!doc.voided && onConvert && (
            <Button onClick={onConvert}><Icon name="component" /> Convert to GST invoice</Button>
          )}
          {!doc.voided && onRecordPayment && (
            <Button onClick={onRecordPayment}><Icon name="check" /> Record payment</Button>
          )}
          {!doc.voided && onToggleHold && (
            <Button variant={doc.hold && !doc.hold.resolvedAt ? "primary" : "danger"} onClick={onToggleHold}>
              {doc.hold && !doc.hold.resolvedAt ? "Release hold" : "Hold payment"}
            </Button>
          )}
          {!doc.voided && onSend && (
            <Button variant="secondary" onClick={onSend}><Icon name="mail" /> Send to {doc.partyKind.toLowerCase()}</Button>
          )}
          {/* A real file lands on disk. PDF rendering needs a print pipeline this
              prototype does not have, so the download is the document's own data
              as CSV — and the label says so rather than promising a PDF. */}
          <Button
            variant="secondary"
            onClick={() => {
              const count = downloadCsv(
                `${doc.id}.csv`,
                ["Document", "Type", "Date", "Party", "Line", "SKU", "Qty", "Rate", "Discount %", "Line total"],
                doc.lines.map(l => [
                  doc.id,
                  doc.type,
                  doc.date,
                  doc.partyName,
                  l.name,
                  l.sku ?? "",
                  l.qty,
                  l.price,
                  l.discountPct ?? 0,
                  Math.round(l.qty * l.price * (1 - (l.discountPct ?? 0) / 100)),
                ]),
              );
              toast({ tone: "success", title: "File downloaded", message: `${doc.id}.csv · ${count} line(s).` });
            }}
          >
            <Icon name="upload" /> Download data
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Sent to printer", message: `${doc.id} queued for printing (demo).` })}>
            Print
          </Button>
          {!doc.voided && onVoid && (
            <Button variant="danger" onClick={onVoid}>Void</Button>
          )}
        </div>
      </div>

      {accounting && (
        <section className="panel accounting-panel">
          <div className="section-head">
            <div>
              <p className="kicker">ACCOUNTING · TALLY</p>
              <h2>{accounting.voucherType} voucher</h2>
              <p className="muted-line">{accounting.narrative}</p>
            </div>
            <div className="release-status">
              <Badge tone={accounting.status === "Synced" ? "emerald" : accounting.status === "Failed" ? "danger" : "amber"}>
                {accounting.status === "Synced" ? "Posted to Tally" : accounting.status === "Pending" ? "Not posted" : accounting.status}
              </Badge>
              <Badge tone="gold">Integration prototype</Badge>
            </div>
          </div>
          {accounting.error && <Alert tone="danger" title="Last posting error">{accounting.error}</Alert>}
          <div className="table-wrap op-table">
            <table>
              <thead><tr><th>Ledger</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                <tr><td className="note-cell">{accounting.debitLedger}</td><td><strong>{formatINR(resolved.total)}</strong></td><td>—</td></tr>
                <tr><td className="note-cell">{accounting.creditLedger}</td><td>—</td><td><strong>{formatINR(resolved.total)}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <div className="detail-list">
            <div><span>Tally reference</span><strong>{accounting.tallyRef ?? "Assigned on posting"}</strong></div>
            <div><span>Last posted</span><strong>{accounting.lastSync ?? "Never"}</strong></div>
          </div>
          <div className="note-actions">
            {accounting.canPost && accounting.onPost && accounting.status !== "Synced" && (
              <Button variant="secondary" onClick={accounting.onPost}><Icon name="component" /> Post to Tally</Button>
            )}
            {accounting.onOpenTally && (
              <Button variant="ghost" onClick={accounting.onOpenTally}>View in Tally queue</Button>
            )}
          </div>
        </section>
      )}

      {doc.voided && (
        <Alert tone="danger" title="This document is void">
          It no longer counts toward balances. The action is recorded on the document trail below.
        </Alert>
      )}
      {doc.hold && !doc.hold.resolvedAt && (
        <Alert tone="danger" title={`Payment on hold — ${doc.hold.reason}`}>
          Held by {doc.hold.heldBy} · {doc.hold.heldAt}. Payments stay blocked until the hold is released with authorisation.
        </Alert>
      )}
      {doc.pi?.lockedAt && doc.pi.status === "Approved" && (
        <Alert tone="success" title={`Approved version — locked since ${doc.pi.lockedAt}`}>
          Approved by {doc.pi.approvedBy} · {doc.pi.approvedAt}
          {doc.pi.approvalRemarks ? <> · “{doc.pi.approvalRemarks}”</> : null}. Edits require a new version — the approved document cannot be changed.
        </Alert>
      )}
      {doc.pi?.status === "Rejected" && (
        <Alert tone="danger" title={`Rejected by ${doc.pi.approvedBy ?? "manager"}`}>
          {doc.pi.approvalRemarks ? <>“{doc.pi.approvalRemarks}” · </> : null}Create a revision to address the remarks and resubmit.
        </Alert>
      )}
      {doc.pi?.status === "Revised" && (
        <Alert tone="warning" title="Revision requested">
          {doc.pi.approvalRemarks ? <>“{doc.pi.approvalRemarks}” · </> : null}Draft the next version to continue.
        </Alert>
      )}

      <div className="two-col doc-view-grid">
        <section className="panel">
          <div className="invoice-doc">
            <div className="invoice-head">
              <Brand />
              <div className="invoice-meta">
                <strong>{doc.id}</strong>
                <small>{doc.type} · {doc.date}</small>
                {doc.reference && <small>Against {doc.reference}</small>}
                <small>GSTIN 08AAKCM4021R1ZP · Vapi Plant</small>
              </div>
            </div>
            <div className="invoice-billto">
              <p className="mini-title">{doc.partyKind === "Supplier" ? "ISSUED TO" : "BILLED TO"}</p>
              <strong>{doc.partyName}</strong>
              {doc.dueDate && <small>{doc.dueDate}</small>}
            </div>
            <div className="table-wrap op-table">
              <table>
                <thead>
                  <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {doc.lines.map((line, i) => (
                    <tr key={i}>
                      <td>
                        <b>{line.name}</b>
                        {line.sku && <div className="note-cell">{line.sku}</div>}
                      </td>
                      <td>{line.qty}</td>
                      <td>{formatINR(line.price)}</td>
                      <td>{line.discountPct ? `${line.discountPct}%` : "—"}</td>
                      <td><strong>{formatINR(Math.round(line.price * line.qty * (1 - line.discountPct / 100)))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="quote-totals invoice-totals">
              {resolved.discount > 0 && <div><span>Discount</span><strong>− {formatINR(resolved.discount)}</strong></div>}
              {doc.gstPct > 0 && <div><span>GST ({doc.gstPct}% included)</span><strong>{formatINR(resolved.gstIncluded)}</strong></div>}
              <div className="quote-grand"><span>{doc.type === "Refund Receipt" ? "Refund total" : "Document total"}</span><strong>{formatINR(resolved.total)}</strong></div>
              {isInvoice && (
                <>
                  <div><span>Paid</span><strong className="up-text">{formatINR(resolved.paid)}</strong></div>
                  <div><span>Balance due</span><strong className={resolved.balance > 0 ? "warning-text" : "up-text"}>{formatINR(Math.max(resolved.balance, 0))}</strong></div>
                </>
              )}
              {isMoneyDoc && doc.method && (
                <div><span>Method</span><strong>{doc.method}</strong></div>
              )}
            </div>
            {doc.pi && (
              <>
                <p className="mini-title">PRODUCT SPECIFICATIONS</p>
                <ul className="pi-list">
                  {doc.pi.specifications.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                {(doc.pi.payment || doc.pi.delivery || doc.pi.validUntil) && (
                  <>
                    <p className="mini-title">PAYMENT & DELIVERY TERMS</p>
                    <div className="detail-list terms-grid">
                      {doc.pi.payment && (
                        <>
                          <div><span>Advance</span><strong>{doc.pi.payment.advancePct}% with the order</strong></div>
                          <div>
                            <span>Balance</span>
                            <strong>
                              {doc.pi.payment.balanceOn}
                              {doc.pi.payment.creditDays ? ` · ${doc.pi.payment.creditDays} days` : ""}
                            </strong>
                          </div>
                        </>
                      )}
                      {doc.pi.delivery && (
                        <>
                          <div><span>Delivery</span><strong>{doc.pi.delivery.mode}</strong></div>
                          <div><span>Lead time</span><strong>{doc.pi.delivery.leadTimeDays} days from advance</strong></div>
                          {doc.pi.delivery.destination && <div><span>Destination</span><strong>{doc.pi.delivery.destination}</strong></div>}
                          {doc.pi.delivery.freight && <div><span>Freight</span><strong>{doc.pi.delivery.freight}</strong></div>}
                        </>
                      )}
                      {doc.pi.validUntil && <div><span>Quotation validity</span><strong>{doc.pi.validUntil}</strong></div>}
                    </div>
                  </>
                )}
                <p className="mini-title">COMMERCIAL TERMS</p>
                <ul className="pi-list">
                  {doc.pi.commercialTerms.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </>
            )}
            {doc.pi && (doc.pi.approvedBy || doc.pi.submittedAt) && (
              <>
                <p className="mini-title">APPROVAL TRAIL</p>
                <div className="detail-list">
                  {doc.pi.submittedAt && <div><span>Submitted</span><strong>{doc.pi.submittedAt}</strong></div>}
                  {doc.pi.approvedBy && (
                    <div>
                      <span>{doc.pi.status === "Rejected" ? "Rejected by" : doc.pi.status === "Revised" ? "Revision asked by" : "Approved by"}</span>
                      <strong>{doc.pi.approvedBy} · {doc.pi.approvedAt}</strong>
                    </div>
                  )}
                  {doc.pi.approvalRemarks && <div><span>Remarks</span><strong>{doc.pi.approvalRemarks}</strong></div>}
                  {doc.pi.lockedAt && <div><span>Terms locked</span><strong>{doc.pi.lockedAt} · v{doc.pi.version}</strong></div>}
                </div>
              </>
            )}
            <div className="invoice-status-row">
              <Badge tone={doc.voided ? "danger" : paymentStateTone[resolved.state]}>{doc.voided ? "Voided" : resolved.state}</Badge>
            </div>
            <p className="muted invoice-terms">{doc.terms}</p>
          </div>
        </section>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">DETAILS</p><h2>{doc.id}</h2></div></div>
            <div className="detail-list">
              {details.filter(([, v]) => v).map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            {doc.notes && <p className="requirement-quote">“{doc.notes}”</p>}
            {derived && (
              <p className="muted">
                <Icon name="info" size={13} /> System-generated from its source record — it updates live and can only be reversed there.
              </p>
            )}
          </section>
          {versions && versions.length > 1 && (
            <section className="panel">
              <div className="section-head"><div><p className="kicker">VERSION HISTORY</p><h2>{versions.length} versions</h2></div></div>
              <div className="task-list">
                {versions.slice().reverse().map(v => (
                  <div key={v.id} className="task-row">
                    <div className="task-body">
                      {v.id === doc.id ? (
                        <strong>{v.id} · v{v.pi?.version}</strong>
                      ) : (
                        <button type="button" className="link-btn" onClick={() => onOpenVersion?.(v.id)}>{v.id} · v{v.pi?.version}</button>
                      )}
                      <small>{formatINR(v.lines.reduce((s, l) => s + Math.round(l.price * l.qty * (1 - l.discountPct / 100)), 0))} · {v.date}{v.pi?.approvedBy ? ` · ${v.pi.status === "Approved" ? "approved" : "decided"} by ${v.pi.approvedBy}` : ""}</small>
                    </div>
                    {v.pi && <Badge tone={piStatusTone[v.pi.status]}>{v.pi.status}</Badge>}
                    {v.id === doc.id && <Badge tone="royal">Viewing</Badge>}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="panel">
            <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Document trail</h2></div></div>
            <Timeline items={doc.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
          </section>
        </div>
      </div>
    </div>
  );
}
