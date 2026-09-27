import { useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { ledgerFor, tallyStatusTone, voucherNarrative } from "@/data/integrationData";
import { useAdmin } from "@/hooks/useAdmin";
import { useFinance } from "@/hooks/useFinance";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { FinanceTransaction, TallyEntry } from "@/types";
import { formatINR } from "@/utils";

/* Voucher type follows the source transaction. Document-numbered transactions
   are recognised by their prefix so an invoice posts as Sales and a credit note
   as a Credit Note, rather than everything collapsing into a Journal. */
export const voucherFor = (txn: FinanceTransaction): TallyEntry["voucherType"] => {
  if (/^INV-/i.test(txn.id)) return "Sales";
  if (/^CN-/i.test(txn.id)) return "Credit Note";
  if (/^DN-/i.test(txn.id)) return "Debit Note";
  if (/^(BILL|PB)-/i.test(txn.id)) return "Purchase";
  switch (txn.kind) {
    case "Receipt": return "Receipt";
    case "Payment": return "Payment";
    case "Expense": return "Expense";
    case "Refund": return "Refund";
    default: return "Journal";
  }
};

/* The prototype fails a posting the way Tally would: when the party has no
   ledger in the company. Kept deterministic so a demo can show failure → retry. */
const KNOWN_LEDGERS = ["Aarav Mehta", "Meera Kapoor", "Nisha Reddy", "Devansh Agarwal", "Sanya Oberoi", "Rashmi Bhatia", "Vikram Sethi", "Ratna Oleochemicals", "Vapi"];
const ledgerExists = (party: string) => KNOWN_LEDGERS.some(l => party.toLowerCase().includes(l.toLowerCase()));

export default function TallyHub({
  transactions,
  accruals = [],
}: {
  transactions: FinanceTransaction[];
  /** Accrual vouchers (supplier bills) — postable to accounting but not cash-book rows. */
  accruals?: FinanceTransaction[];
}) {
  const { tallyEntries, queueTally, syncTally, retryTally, failTally } = useFinance();
  const { can, activeRole, currentUser } = useAdmin();
  const actor = currentUser;
  const { logAudit } = useTeam();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(tallyEntries[0]?.id ?? null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; action: () => void } | null>(null);

  const canSync = can("Payments", "Edit");
  const entry = tallyEntries.find(e => e.id === openId) ?? tallyEntries[0];
  const pending = tallyEntries.filter(e => e.status === "Pending" || e.status === "Retry");
  const failed = tallyEntries.filter(e => e.status === "Failed");
  const synced = tallyEntries.filter(e => e.status === "Synced");
  const syncedValue = synced.reduce((s, e) => s + e.amount, 0);
  const ledgerValue = transactions.reduce((s, t) => s + t.amount, 0);
  /* Both cash-book rows and accrual vouchers are postable, so the queue looks at
     the two together. Only the cash book counts towards the ledger value above. */
  const postable = [...transactions, ...accruals];
  const unqueued = postable.filter(t => !tallyEntries.some(e => e.transactionId.toLowerCase() === t.id.toLowerCase()));

  const queueAll = () => {
    let queued = 0;
    let blocked = 0;
    unqueued.forEach(t => {
      const voucher = voucherFor(t);
      const ledgers = ledgerFor(voucher, t.method);
      const res = queueTally({
        transactionId: t.id, voucherType: voucher, party: t.party, reference: t.reference,
        amount: t.amount, date: t.date, debitLedger: ledgers.debit, creditLedger: ledgers.credit,
        timeline: [],
      });
      if (res.ok) queued++;
      else blocked++;
    });
    logAudit({
      user: actor, action: "Accounting entries queued", module: "Payments",
      record: "Tally sync queue", newValue: `${queued} queued, ${blocked} duplicates blocked`,
    });
    toast({
      tone: queued ? "success" : "info",
      title: queued ? `${queued} entries queued` : "Nothing new to queue",
      message: blocked ? `${blocked} duplicate${blocked === 1 ? "" : "s"} blocked — each transaction posts once.` : "Every ledger transaction now has an accounting entry.",
    });
  };

  const sync = (id: string) => {
    const target = tallyEntries.find(e => e.id === id);
    if (!target) return;
    setConfirm({
      title: `Post ${id} to Tally?`,
      message: (
        <>
          The voucher is written with a unique accounting reference. This prototype represents the posting — no live
          Tally connection is made.
        </>
      ),
      confirmLabel: "Post voucher",
      action: () => {
        /* A party with no ledger in the company fails, exactly as Tally would. */
        const ok = ledgerExists(target.party);
        setConfirm(null);
        /* Posting is not instant against a real company file, so the voucher shows
           as in flight before the outcome lands. */
        setPostingId(id);
        window.setTimeout(() => {
        setPostingId(null);
        if (ok) {
          syncTally(id);
          logAudit({ user: actor, action: "Accounting entry posted", module: "Payments", record: id, newValue: `${target.voucherType} · ${formatINR(target.amount)}` });
          toast({ tone: "success", title: "Posted to accounting", message: `${id} carries a unique voucher reference.` });
        } else {
          failTally(id, `Ledger “${target.party}” does not exist in the Tally company. Create the party ledger and retry.`);
          logAudit({ user: actor, action: "Accounting entry failed", module: "Payments", record: id, newValue: `Missing ledger — ${target.party}` });
          toast({ tone: "error", title: "Posting failed", message: `${id} — the party ledger is missing. Use Retry once it exists.` });
        }
        }, 800);
      },
    });
  };

  const retry = (id: string) => {
    const target = tallyEntries.find(e => e.id === id);
    retryTally(id);
    logAudit({ user: actor, action: "Accounting entry queued for retry", module: "Payments", record: id, oldValue: "Failed", newValue: "Retry" });
    toast({ tone: "info", title: "Marked for retry", message: `${id} is back in the queue — post it again once ${target?.party ?? "the party"} has a ledger.` });
  };

  /* An empty queue is a legitimate state, not a blank screen. */
  if (tallyEntries.length === 0) {
    return (
      <div className="page-stack">
        <Alert tone="info" title="Integration prototype — Tally is not connected">
          This dashboard shows how each transaction would post to Tally. No Tally API is called.
        </Alert>
        <EmptyState
          className="panel"
          icon="component"
          title="No accounting entries yet"
          description="Every receipt, payment, invoice and credit note in the ledger can be queued as a Tally voucher. Queue them to see the voucher type, Dr/Cr posting preview and unique reference."
          action={
            canSync && unqueued.length > 0 ? (
              <Button onClick={queueAll}><Icon name="plus" /> Queue {unqueued.length} ledger transaction{unqueued.length === 1 ? "" : "s"}</Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!entry) return null;

  const lastSyncedAt = synced.map(e => e.lastSync).filter(Boolean).slice(-1)[0];

  return (
    <div className="page-stack">
      <div className="integration-head">
        <div>
          <p className="kicker">ACCOUNTING INTEGRATION</p>
          <h2>Tally posting</h2>
          <p className="muted-line">
            Every receipt, payment, invoice and note in the ledger becomes a Tally voucher with a Dr/Cr posting and a
            unique reference. Review the posting here before a real integration is built.
          </p>
        </div>
        <div className="integration-status">
          <Badge tone="gold">Integration prototype</Badge>
          <span><i className="dot-idle" aria-hidden="true" /> Tally not connected</span>
          <small>Last simulated post · {lastSyncedAt ?? "never"}</small>
        </div>
      </div>

      <Alert tone="info" title="Integration prototype — Tally is not connected">
        This dashboard shows exactly how each transaction would post to Tally — voucher type, Dr/Cr ledgers, unique
        reference and sync state. No Tally API is called and nothing leaves this prototype; the sync states below are
        generated locally so the accounting workflow can be reviewed before a real integration is built.
      </Alert>

      <div className="identity-card">
        <div>
          <span>Company</span>
          <strong>MAHARAJA SOAP INDUSTRIES</strong>
          <small>Vapi Plant · Gujarat</small>
        </div>
        <div><span>Company code</span><strong>MSI-ERP-001</strong><small>Tally company identifier</small></div>
        <div><span>Environment</span><strong>Demo / Prototype</strong><small>No live company file</small></div>
        <div>
          <span>Connection</span>
          <strong className="warning-text">Not connected</strong>
          <small>Last simulated post · {lastSyncedAt ?? "never"}</small>
        </div>
      </div>

      <div className="stat-chips">
        <div className="stat-chip"><span>Ledger transactions</span><strong>{transactions.length}</strong><small>{formatINR(ledgerValue)} through the books</small></div>
        <div className="stat-chip"><span>Synced vouchers</span><strong className="up-text">{synced.length}</strong><small>{formatINR(syncedValue)} posted</small></div>
        <div className="stat-chip"><span>In the queue</span><strong className={pending.length ? "warning-text" : undefined}>{pending.length}</strong><small>Pending or retrying</small></div>
        <div className="stat-chip"><span>Failed</span><strong className={failed.length ? "warning-text" : undefined}>{failed.length}</strong><small>Need a correction then retry</small></div>
      </div>

      {failed.length > 0 && (
        <Alert tone="danger" title={`${failed.length} accounting entr${failed.length === 1 ? "y" : "ies"} failed`}>
          {failed[0].error}
        </Alert>
      )}

      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">SYNC QUEUE</p><h2>{tallyEntries.length} accounting entries</h2></div>
          {canSync ? (
            <Button variant="secondary" onClick={queueAll} disabled={unqueued.length === 0}>
              <Icon name="plus" /> Queue {unqueued.length} unposted transaction{unqueued.length === 1 ? "" : "s"}
            </Button>
          ) : (
            <Badge tone="neutral">{activeRole} · read-only</Badge>
          )}
        </div>
        <div className="table-wrap op-table">
          <table>
            <thead>
              <tr><th>Entry</th><th>Voucher</th><th>Source</th><th>Party</th><th>Reference</th><th>Amount</th><th>Accounting ref</th><th>Last sync</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {tallyEntries.map(e => (
                <tr key={e.id} className={e.id === entry.id ? "sq-selected" : undefined}>
                  <td><button type="button" className="link-btn" onClick={() => setOpenId(e.id)}>{e.id}</button></td>
                  <td>{e.voucherType}</td>
                  <td>{e.transactionId}</td>
                  <td className="note-cell">{e.party}</td>
                  <td>{e.reference ?? "—"}</td>
                  <td>{formatINR(e.amount)}</td>
                  <td className="note-cell">{e.tallyRef ?? "—"}</td>
                  <td className="note-cell">{e.lastSync ?? "Never"}</td>
                  <td><Badge tone={tallyStatusTone[e.status]}>{e.status}</Badge></td>
                  <td>
                    {canSync && e.status !== "Synced" && (
                      <div className="table-actions">
                        {e.status === "Failed" ? (
                          <Button variant="secondary" loading={postingId === e.id} onClick={() => retry(e.id)}>Retry</Button>
                        ) : (
                          <Button variant="secondary" loading={postingId === e.id} onClick={() => sync(e.id)}>Post</Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">{entry.id} · {entry.voucherType.toUpperCase()} VOUCHER</p>
              <h2>{formatINR(entry.amount)}</h2>
              <p className="muted-line">{entry.party}{entry.reference ? ` · ${entry.reference}` : ""} · {entry.date}</p>
            </div>
            <Badge tone={tallyStatusTone[entry.status]}>{entry.status}</Badge>
          </div>
          <p className="muted posting-note">{voucherNarrative[entry.voucherType]}</p>
          <div className="table-wrap op-table">
            <table>
              <thead><tr><th>Ledger</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                <tr><td className="note-cell">{entry.debitLedger}</td><td><strong>{formatINR(entry.amount)}</strong></td><td>—</td></tr>
                <tr><td className="note-cell">{entry.creditLedger}</td><td>—</td><td><strong>{formatINR(entry.amount)}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <div className="detail-list">
            <div><span>Source transaction</span><strong>{entry.transactionId}</strong></div>
            <div><span>Accounting reference</span><strong>{entry.tallyRef ?? "Assigned on posting"}</strong></div>
            <div><span>Attempts</span><strong>{entry.attempts}</strong></div>
            <div><span>Last sync</span><strong>{entry.lastSync ?? "Never"}</strong></div>
          </div>
          {entry.error && <Alert tone="danger" title="Last error">{entry.error}</Alert>}
          {entry.timeline.length > 0 && (
            <>
              <h4 className="detail-subhead">Posting history</h4>
              <Timeline
                items={entry.timeline.map((ev, i) => ({
                  title: ev.text,
                  meta: ev.time,
                  state: i === 0 ? ("current" as const) : ("done" as const),
                }))}
              />
            </>
          )}
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">RECONCILIATION</p><h2>Books versus accounting</h2></div></div>
          <div className="detail-list">
            <div><span>Transactions in the ledger</span><strong>{transactions.length} · {formatINR(ledgerValue)}</strong></div>
            <div><span>Entries created</span><strong>{tallyEntries.length}</strong></div>
            <div><span>Posted to accounting</span><strong className="up-text">{synced.length} · {formatINR(syncedValue)}</strong></div>
            <div><span>Not yet posted</span><strong className={pending.length + failed.length ? "warning-text" : undefined}>{pending.length + failed.length}</strong></div>
            <div><span>Never queued</span><strong className={unqueued.length ? "warning-text" : undefined}>{unqueued.length}</strong></div>
          </div>
          <Timeline
            items={[
              { title: `${synced.length} vouchers posted with unique references`, meta: "Accounting", state: "done" },
              { title: `${pending.length} waiting in the queue`, meta: "Pending", state: pending.length ? "current" : "done" },
              { title: `${failed.length} failed and awaiting correction`, meta: "Failed", state: failed.length ? "current" : "done" },
              { title: `${unqueued.length} ledger transactions never queued`, meta: "Books", state: unqueued.length ? "pending" : "done" },
            ]}
          />
        </section>
      </div>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} />
      )}
    </div>
  );
}
