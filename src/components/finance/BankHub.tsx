import { useEffect, useState } from "react";
import EmptyState from "@/components/data-display/EmptyState";
import Timeline from "@/components/data-display/Timeline";
import Drawer from "@/components/feedback/Drawer";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { bankMatchTone } from "@/data/integrationData";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { useAdmin } from "@/hooks/useAdmin";
import { useFinance } from "@/hooks/useFinance";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { BankAdjustment, BankTransaction, FinanceTransaction } from "@/types";
import { formatINR } from "@/utils";

function MatchModal({
  bank,
  transactions,
  open,
  onClose,
}: {
  bank: BankTransaction;
  transactions: FinanceTransaction[];
  open: boolean;
  onClose: () => void;
}) {
  const { matchBank } = useFinance();
  const { currentUser } = useAdmin();
  const { logAudit } = useTeam();
  const toast = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState(String(bank.amount));
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setTransactionId(transactions[0]?.id ?? "");
      setAmount(String(bank.amount));
      setRemarks("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bank.id]);

  const value = parseInt(amount || "0", 10);

  const submit = () => {
    if (!transactionId) {
      setError("Pick the system transaction this bank line belongs to.");
      return;
    }
    if (value <= 0 || value > bank.amount) {
      setError(`Matched amount must be between ₹1 and ${formatINR(bank.amount)} — the bank line cannot be over-matched.`);
      return;
    }
    if (value < bank.amount && !remarks.trim()) {
      setError("A partial match needs remarks explaining the difference.");
      return;
    }
    matchBank(bank.id, transactionId, value, remarks.trim() || undefined, currentUser);
    logAudit({
      user: currentUser, action: value >= bank.amount ? "Bank line matched" : "Bank line partially matched", module: "Payments",
      record: `${bank.id} ↔ ${transactionId}`, newValue: `${formatINR(value)} of ${formatINR(bank.amount)}`,
    });
    toast({
      tone: "success",
      title: value >= bank.amount ? "Matched" : "Partially matched",
      message: `${bank.id} ↔ ${transactionId} · ${formatINR(value)}.`,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="bank-match-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="wallet" /></div>
      <h2 id="bank-match-title">Match {bank.id}</h2>
      <p>{bank.narration} · {bank.direction} {formatINR(bank.amount)} · {bank.date} · {bank.utr}</p>
      {error && <Alert tone="danger" title="Check the match">{error}</Alert>}
      <SelectField label="System transaction" value={transactionId} onChange={e => setTransactionId(e.target.value)}>
        <option value="">Select a transaction…</option>
        {transactions.map(t => (
          <option key={t.id} value={t.id}>{t.id} · {t.party} · {formatINR(t.amount)} · {t.date}</option>
        ))}
      </SelectField>
      <TextField
        label="Amount to match"
        inputMode="numeric"
        helper={`Bank line is ${formatINR(bank.amount)}. A smaller amount records a partial match.`}
        value={amount}
        onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
      />
      <TextAreaField
        label={value < bank.amount ? "Remarks * (required for a partial match)" : "Remarks"}
        placeholder="Charges deducted, part settlement, hold-back against a deviation…"
        value={remarks}
        onChange={e => setRemarks(e.target.value)}
      />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Record match</Button>
      </div>
    </Modal>
  );
}

export default function BankHub({ transactions }: { transactions: FinanceTransaction[] }) {
  const { bankTransactions, unmatchBank, annotateBank, adjustBank, queueTally } = useFinance();
  const { can, activeRole, currentUser } = useAdmin();
  const { logAudit } = useTeam();
  const toast = useToast();
  const [matchTarget, setMatchTarget] = useState<BankTransaction | null>(null);
  const [noteTarget, setNoteTarget] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<BankTransaction | null>(null);
  const [note, setNote] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [unmatchTarget, setUnmatchTarget] = useState<BankTransaction | null>(null);
  const [unmatchReason, setUnmatchReason] = useState("");
  const [unmatchError, setUnmatchError] = useState<string>();

  const canReconcile = can("Payments", "Edit");
  const matched = bankTransactions.filter(b => b.matchState === "Matched");
  const partial = bankTransactions.filter(b => b.matchState === "Partially Matched");
  const unmatched = bankTransactions.filter(b => b.matchState === "Unmatched");
  const adjusted = bankTransactions.filter(b => b.matchState === "Adjusted");
  const credits = bankTransactions.filter(b => b.direction === "Credit").reduce((s, b) => s + b.amount, 0);
  const debits = bankTransactions.filter(b => b.direction === "Debit").reduce((s, b) => s + b.amount, 0);
  const reconciledValue = bankTransactions.reduce((s, b) => s + (b.matchedAmount ?? 0), 0);
  const bankValue = bankTransactions.reduce((s, b) => s + b.amount, 0);
  const matchedSystemIds = new Set(bankTransactions.map(b => b.matchedTo).filter(Boolean) as string[]);
  const unmatchedSystem = transactions.filter(t => !matchedSystemIds.has(t.id));
  const detail = bankTransactions.find(b => b.id === detailId) ?? null;
  const detailTxn = detail?.matchedTo ? transactions.find(t => t.id === detail.matchedTo) : undefined;

  /* Statement balances read from the running balance on each line: the newest
     line carries the closing balance, the oldest reveals the opening one. */
  const closingBalance = bankTransactions[0]?.balance ?? 0;
  const oldest = bankTransactions[bankTransactions.length - 1];
  const openingBalance = oldest ? oldest.balance - (oldest.direction === "Credit" ? oldest.amount : -oldest.amount) : 0;
  /* Book balance is the bank balance adjusted for everything not yet reconciled. */
  const unreconciledValue = bankTransactions.reduce(
    (sum, b) => sum + (b.amount - (b.matchedAmount ?? 0)) * (b.direction === "Credit" ? 1 : -1),
    0,
  );
  const bookBalance = closingBalance - unreconciledValue;

  const confirmUnmatch = () => {
    if (!unmatchTarget) return;
    if (!unmatchReason.trim()) return setUnmatchError("Give a reason — it stays on the statement line and the audit trail.");
    const previous = unmatchTarget.matchedTo;
    unmatchBank(unmatchTarget.id, currentUser);
    annotateBank(unmatchTarget.id, `Unmatched — ${unmatchReason.trim()}`, currentUser);
    logAudit({
      user: currentUser, action: "Bank line unmatched", module: "Payments",
      record: unmatchTarget.id, oldValue: `Matched to ${previous ?? "—"}`, newValue: unmatchReason.trim(),
    });
    toast({ tone: "info", title: "Unmatched", message: `${unmatchTarget.id} is back in the unmatched queue.` });
    setUnmatchTarget(null);
    setUnmatchReason("");
    setUnmatchError(undefined);
  };

  return (
    <div className="page-stack">
      <div className="integration-head">
        <div>
          <p className="kicker">BANKING</p>
          <h2>Bank reconciliation</h2>
          <p className="muted-line">
            Match every line on the bank statement to the receipt, payment or expense it belongs to, and explain
            whatever is left over.
          </p>
        </div>
        <div className="integration-status">
          <Badge tone="gold">Integration prototype</Badge>
          <span><i className="dot-idle" aria-hidden="true" /> No bank connection configured</span>
          <small>Statement is local sample data</small>
        </div>
      </div>

      <div className="identity-card">
        <div>
          <span>Bank</span>
          <strong>HDFC Bank</strong>
          <small>Vapi GIDC branch</small>
        </div>
        <div>
          <span>Account name</span>
          <strong>MAHARAJA SOAP INDUSTRIES</strong>
          <small>Current Account</small>
        </div>
        <div><span>Account number</span><strong>XXXX XXXX 4821</strong><small>Masked — demo data only</small></div>
        <div><span>IFSC</span><strong>HDFC0004821</strong><small>Prototype · no bank connection</small></div>
      </div>

      <div className="balance-strip">
        <div><span>Opening balance</span><strong>{formatINR(openingBalance)}</strong></div>
        <div><span>Closing balance (bank)</span><strong>{formatINR(closingBalance)}</strong></div>
        <div><span>Book balance</span><strong>{formatINR(bookBalance)}</strong></div>
        <div>
          <span>Difference</span>
          <strong className={closingBalance - bookBalance ? "warning-text" : "up-text"}>{formatINR(closingBalance - bookBalance)}</strong>
        </div>
      </div>

      <Alert tone="info" title="Integration prototype — no bank is connected">
        The statement below stands in for an imported bank feed. Reconciliation, matching and adjustments behave exactly
        as they would against a live feed, but no bank API is called and no statement is fetched — the lines are local
        sample data.
      </Alert>

      <div className="stat-chips">
        <div className="stat-chip"><span>Statement lines</span><strong>{bankTransactions.length}</strong><small>{formatINR(bankValue)} moved</small></div>
        <div className="stat-chip"><span>Matched</span><strong className="up-text">{matched.length}</strong><small>Fully reconciled</small></div>
        <div className="stat-chip"><span>Partially matched</span><strong className={partial.length ? "warning-text" : undefined}>{partial.length}</strong><small>Difference explained in remarks</small></div>
        <div className="stat-chip"><span>Unmatched</span><strong className={unmatched.length ? "warning-text" : undefined}>{unmatched.length}</strong><small>Need a system transaction</small></div>
      </div>

      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">BANK STATEMENT</p><h2>HDFC Current A/c · {formatINR(credits)} in, {formatINR(debits)} out</h2></div>
          {!canReconcile && <Badge tone="neutral">{activeRole} · read-only</Badge>}
        </div>
        {bankTransactions.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="No statement lines"
            description="Import or seed a bank statement to begin reconciling it against the ledger."
            mini
          />
        ) : (
        <div className="table-wrap op-table">
          <table>
            <thead>
              <tr><th>Line</th><th>Date</th><th>Value date</th><th>Narration</th><th>UTR / reference</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Matched to</th><th>State</th><th /></tr>
            </thead>
            <tbody>
              {bankTransactions.map(b => (
                <tr key={b.id}>
                  <td><button type="button" className="link-btn" onClick={() => setDetailId(b.id)}>{b.id}</button></td>
                  <td>{b.date}</td>
                  <td>{b.valueDate}</td>
                  <td className="note-cell">{b.narration}{b.remarks && <><br /><small className="muted">{b.remarks}</small></>}</td>
                  <td className="note-cell">{b.utr}</td>
                  <td className="warning-text">{b.direction === "Debit" ? formatINR(b.amount) : "—"}</td>
                  <td className="up-text">{b.direction === "Credit" ? formatINR(b.amount) : "—"}</td>
                  <td>{formatINR(b.balance)}</td>
                  <td>
                    {b.matchedTo ? (
                      <button type="button" className="link-btn" onClick={() => setDetailId(b.id)}>
                        {b.matchedTo}{b.matchedAmount && b.matchedAmount < b.amount ? ` · ${formatINR(b.matchedAmount)}` : ""}
                      </button>
                    ) : "—"}
                  </td>
                  <td><Badge tone={bankMatchTone[b.matchState]}>{b.matchState}</Badge></td>
                  <td>
                    {canReconcile && (
                      <div className="table-actions">
                        {b.matchState === "Unmatched" ? (
                          <Button variant="secondary" onClick={() => setMatchTarget(b)}>Match</Button>
                        ) : (
                          <>
                            <Button variant="secondary" onClick={() => setMatchTarget(b)}>Re-match</Button>
                            <Button variant="ghost" onClick={() => { setUnmatchTarget(b); setUnmatchReason(""); setUnmatchError(undefined); }}>
                              Unmatch
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" onClick={() => { setNoteTarget(b.id); setNote(b.remarks ?? ""); }}>Remarks</Button>
                        {b.matchState === "Unmatched" && canReconcile && (
                          <Button variant="ghost" onClick={() => setAdjustTarget(b)}>Adjust</Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="section-head"><div><p className="kicker">SYSTEM TRANSACTIONS</p><h2>{unmatchedSystem.length} not seen on the statement</h2></div></div>
          {unmatchedSystem.length === 0 ? (
            <p className="muted">Every system transaction has a matching bank line.</p>
          ) : (
            <div className="detail-list">
              {unmatchedSystem.slice(0, 10).map(t => (
                <div key={t.id}>
                  <span>{t.id} · {t.party}{t.reference ? ` · ${t.reference}` : ""} · {t.date}</span>
                  <strong>{formatINR(t.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">RECONCILIATION SUMMARY</p><h2>Where the books and the bank differ</h2></div></div>
          <div className="detail-list">
            <div><span>Statement total</span><strong>{formatINR(bankValue)}</strong></div>
            <div><span>Reconciled against the books</span><strong className="up-text">{formatINR(reconciledValue)}</strong></div>
            <div><span>Difference</span><strong className={bankValue - reconciledValue ? "warning-text" : undefined}>{formatINR(bankValue - reconciledValue)}</strong></div>
            <div><span>Unmatched bank lines</span><strong>{unmatched.length}</strong></div>
            <div><span>Partially matched</span><strong>{partial.length}</strong></div>
            <div><span>System transactions without a bank line</span><strong>{unmatchedSystem.length}</strong></div>
          </div>
          {partial.length > 0 && (
            <Alert tone="warning" title="Partial matches carry an explanation">
              {partial.map(p => `${p.id}: ${p.remarks ?? "no remarks"}`).join(" · ")}
            </Alert>
          )}
        </section>
      </div>

      {matchTarget && (
        <MatchModal bank={matchTarget} transactions={transactions} open onClose={() => setMatchTarget(null)} />
      )}

      <Drawer open={Boolean(detail)} onClose={() => setDetailId(null)} title={detail ? `Statement line ${detail.id}` : ""}>
        {detail && (
          <div className="page-stack">
            <div className="detail-list">
              <div><span>Narration</span><strong>{detail.narration}</strong></div>
              <div><span>UTR / reference</span><strong>{detail.utr}</strong></div>
              <div><span>Date</span><strong>{detail.date}</strong></div>
              <div><span>Value date</span><strong>{detail.valueDate}</strong></div>
              <div><span>Direction</span><strong>{detail.direction}</strong></div>
              <div><span>Amount</span><strong>{formatINR(detail.amount)}</strong></div>
              <div><span>Running balance</span><strong>{formatINR(detail.balance)}</strong></div>
              <div><span>State</span><strong>{detail.matchState}</strong></div>
            </div>
            {detailTxn ? (
              <section className="panel">
                <div className="section-head"><div><p className="kicker">MATCHED RECORD</p><h2>{detailTxn.id}</h2></div></div>
                <div className="detail-list">
                  <div><span>{detailTxn.kind}</span><strong>{formatINR(detailTxn.amount)}</strong></div>
                  <div><span>Party</span><strong>{detailTxn.party}</strong></div>
                  {detailTxn.reference && <div><span>Against</span><strong>{detailTxn.reference}</strong></div>}
                  <div><span>Method</span><strong>{detailTxn.method}</strong></div>
                  <div><span>Date</span><strong>{detailTxn.date}</strong></div>
                  <div><span>Matched amount</span><strong>{formatINR(detail.matchedAmount ?? 0)}</strong></div>
                  {detail.matchedAmount !== undefined && detail.matchedAmount < detail.amount && (
                    <div><span>Unreconciled</span><strong className="warning-text">{formatINR(detail.amount - detail.matchedAmount)}</strong></div>
                  )}
                </div>
              </section>
            ) : (
              <Alert tone="warning" title="Not matched yet">
                This line has no system transaction against it. Use Match to pick the receipt, payment or expense it belongs to.
              </Alert>
            )}
            {detail.remarks && <Alert tone="info" title="Remarks">{detail.remarks}</Alert>}
            <section className="panel">
              <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Reconciliation trail</h2></div></div>
              <Timeline
                items={[
                  { title: `Line imported · ${formatINR(detail.amount)} ${detail.direction.toLowerCase()}`, meta: detail.date, state: "done" },
                  detail.matchedTo
                    ? { title: `${detail.matchState} against ${detail.matchedTo}`, meta: detail.adjustedBy ?? "Accounts", state: "current" as const }
                    : { title: "Awaiting a match", meta: "Unreconciled", state: "pending" as const },
                  ...(detail.remarks ? [{ title: detail.remarks, meta: detail.adjustedBy ?? "Accounts", state: "done" as const }] : []),
                ]}
              />
            </section>
          </div>
        )}
      </Drawer>

      {unmatchTarget && (
        <ConfirmModal
          open
          danger
          onClose={() => setUnmatchTarget(null)}
          title={`Unmatch ${unmatchTarget.id}?`}
          message={
            <>
              <p>
                {unmatchTarget.id} is currently {unmatchTarget.matchState.toLowerCase()} against{" "}
                <strong>{unmatchTarget.matchedTo}</strong>. Unmatching returns it to the unreconciled queue and changes
                the reconciliation difference.
              </p>
              <TextAreaField
                label="Reason for unmatching" required
                placeholder="e.g. Matched to the wrong receipt — belongs to RC-26132"
                value={unmatchReason}
                onChange={e => { setUnmatchReason(e.target.value); setUnmatchError(undefined); }}
                error={unmatchError}
              />
            </>
          }
          confirmLabel="Unmatch line"
          onConfirm={confirmUnmatch}
        />
      )}

      {adjustTarget && (
        <AdjustmentModal
          line={adjustTarget}
          actor={currentUser}
          onClose={() => setAdjustTarget(null)}
          onConfirm={(adjustment, postToAccounting) => {
            adjustBank(adjustTarget.id, adjustment);
            let queuedId: string | undefined;
            if (postToAccounting) {
              const res = queueTally({
                transactionId: adjustTarget.id,
                voucherType: "Journal",
                party: adjustment.reason,
                reference: adjustTarget.utr,
                amount: adjustment.amount,
                date: adjustTarget.date,
                debitLedger: adjustment.debitLedger,
                creditLedger: adjustment.creditLedger,
                timeline: [],
              });
              if (res.ok) queuedId = res.entry?.id;
            }
            logAudit({
              user: currentUser,
              action: "Bank line adjusted",
              module: "Payments",
              record: `${adjustTarget.id} · ${adjustTarget.utr}`,
              oldValue: `Unmatched · ${formatINR(adjustTarget.amount)}`,
              newValue: `${adjustment.reason} · ${formatINR(adjustment.amount)} · Dr ${adjustment.debitLedger} / Cr ${adjustment.creditLedger}${queuedId ? ` · ${queuedId}` : ""}`,
            });
            setAdjustTarget(null);
            toast({
              tone: "success",
              title: "Adjustment recorded",
              message: queuedId
                ? `${adjustTarget.id} reconciled · journal voucher ${queuedId} queued for accounting.`
                : `${adjustTarget.id} reconciled. No accounting voucher was raised.`,
            });
          }}
        />
      )}

      {noteTarget && (
        <Modal open onClose={() => setNoteTarget(null)} labelledBy="bank-note-title">
          <h2 id="bank-note-title">Manual adjustment remarks — {noteTarget}</h2>
          <p>Remarks stay on the statement line and in the reconciliation summary.</p>
          <TextAreaField label="Remarks" value={note} onChange={e => setNote(e.target.value)} />
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                annotateBank(noteTarget, note.trim(), currentUser);
                logAudit({
                  user: currentUser, action: "Bank line adjustment remarks", module: "Payments",
                  record: noteTarget, newValue: note.trim() || "cleared",
                });
                toast({ tone: "success", title: "Remarks saved", message: noteTarget });
                setNoteTarget(null);
              }}
            >
              Save remarks
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* A manual adjustment is the accountant saying "the bank is right, our books are
   missing this entry". It therefore needs an amount and a ledger pair — remarks
   alone leave the reconciliation difference exactly where it was. */
const ADJUSTMENT_LEDGERS: Record<BankAdjustment["reason"], { debit: string; credit: string }> = {
  "Bank charges": { debit: "Bank Charges", credit: "HDFC Current A/c" },
  "Interest credited": { debit: "HDFC Current A/c", credit: "Interest Received" },
  "Direct debit": { debit: "Sundry Creditors", credit: "HDFC Current A/c" },
  "Rounding difference": { debit: "Rounding Off", credit: "HDFC Current A/c" },
  Other: { debit: "Suspense A/c", credit: "HDFC Current A/c" },
};

function AdjustmentModal({
  line,
  actor,
  onClose,
  onConfirm,
}: {
  line: BankTransaction;
  actor: string;
  onClose: () => void;
  onConfirm: (adjustment: BankAdjustment, postToAccounting: boolean) => void;
}) {
  const defaultReason: BankAdjustment["reason"] =
    line.direction === "Credit" ? "Interest credited" : /CHG|CHARGE/i.test(line.narration) ? "Bank charges" : "Direct debit";
  const [reason, setReason] = useState<BankAdjustment["reason"]>(defaultReason);
  const [amount, setAmount] = useState(String(line.amount));
  const [narration, setNarration] = useState("");
  const [post, setPost] = useState(true);
  const [error, setError] = useState<string>();

  const value = parseInt(amount.replace(/\D/g, "") || "0", 10);
  const ledgers = ADJUSTMENT_LEDGERS[reason];

  return (
    <Modal open onClose={onClose} labelledBy="bank-adjust-title">
      <div className="modal-icon"><Icon name="wallet" /></div>
      <h2 id="bank-adjust-title">Manual adjustment — {line.id}</h2>
      <p>
        {line.narration} · {line.direction} {formatINR(line.amount)} · {line.date} · {line.utr}
      </p>
      {error && <Alert tone="danger" title="Check the adjustment">{error}</Alert>}
      <SelectField
        label="What is this line?"
        helper="The reason decides which ledgers the adjustment posts to."
        value={reason}
        onChange={e => { setReason(e.target.value as BankAdjustment["reason"]); setError(undefined); }}
      >
        <option>Bank charges</option>
        <option>Interest credited</option>
        <option>Direct debit</option>
        <option>Rounding difference</option>
        <option>Other</option>
      </SelectField>
      <TextField
        label="Amount to adjust" required inputMode="numeric"
        helper={`The statement line is ${formatINR(line.amount)}. A smaller amount leaves the remainder unreconciled.`}
        value={amount}
        onChange={e => { setAmount(e.target.value.replace(/\D/g, "")); setError(undefined); }}
      />
      <TextAreaField
        label="Narration" required
        placeholder="How this should read in the books"
        value={narration}
        onChange={e => { setNarration(e.target.value); setError(undefined); }}
      />
      <div className="adjust-preview">
        <h4>Ledger effect</h4>
        <div className="table-wrap op-table">
          <table>
            <thead><tr><th>Ledger</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
              <tr><td className="note-cell">{ledgers.debit}</td><td><strong>{formatINR(value)}</strong></td><td>—</td></tr>
              <tr><td className="note-cell">{ledgers.credit}</td><td>—</td><td><strong>{formatINR(value)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted-line">
          Reconciliation difference on this line falls from {formatINR(line.amount)} to{" "}
          {formatINR(Math.max(0, line.amount - value))} once the adjustment is saved.
        </p>
      </div>
      <label className="check">
        <input type="checkbox" className="sr-input" checked={post} onChange={e => setPost(e.target.checked)} />
        <i aria-hidden="true"><Icon name="check" size={12} /></i>
        Also queue a journal voucher for accounting
      </label>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (value <= 0) return setError("Enter the amount being adjusted.");
            if (value > line.amount) return setError(`Cannot adjust more than the statement line of ${formatINR(line.amount)}.`);
            if (!narration.trim()) return setError("Enter a narration — it becomes the ledger description.");
            onConfirm(
              {
                amount: value,
                reason,
                debitLedger: ledgers.debit,
                creditLedger: ledgers.credit,
                narration: narration.trim(),
                adjustedBy: actor,
                adjustedOn: "Just now",
              },
              post,
            );
          }}
        >
          Record adjustment
        </Button>
      </div>
    </Modal>
  );
}
