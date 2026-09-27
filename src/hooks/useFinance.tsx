import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { docTerms, EXPENSE_APPROVAL_LIMIT, seedDocs, seedExpenses } from "@/data/financeData";
import { seedBankTransactions, seedTallyEntries } from "@/data/integrationData";
import type {
  BankAdjustment,
  BankTransaction,
  Expense,
  FinanceDoc,
  PaymentHold,
  TallyEntry,
} from "@/types";

interface FinanceStore {
  docs: FinanceDoc[];
  expenses: Expense[];
  /** Adds an authored document. Pass `id` for externally numbered docs
      (GST invoices from the sales counter, credit notes from the quality counter,
      receipts carrying their RC- id); Proforma / Debit Note / Refund Receipt
      ids are generated here when omitted. */
  addDoc: (doc: Omit<FinanceDoc, "id" | "timeline"> & { id?: string }, firstEvent: string) => FinanceDoc;
  updateDoc: (id: string, patch: Partial<FinanceDoc>, event?: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "status" | "recordedBy">) => Expense;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  /** PI lifecycle: Draft → Pending Approval. */
  submitPi: (id: string) => void;
  /** Manager decision. Approving supersedes any previously approved version of the same base PI. */
  decidePi: (id: string, decision: "approve" | "reject" | "revise", approver: string, remarks?: string) => void;
  /** Creates the next Draft version of a PI and returns it. */
  createPiRevision: (id: string) => FinanceDoc | undefined;
  /** Records a customer advance against an approved PI with duplicate-reference protection. */
  recordAdvance: (docId: string, args: { amount: number; method: string; txnRef: string; remarks?: string }) => { ok: boolean; error?: string; receipt?: FinanceDoc };
  /* Holds apply to derived documents too (GST invoices generated from sales
     orders are not stored here), so they live in their own overlay map. */
  holds: Record<string, PaymentHold>;
  setHold: (docId: string, hold: PaymentHold | null) => void;
  /* Accounting integration (prototype representation, not a live connection). */
  tallyEntries: TallyEntry[];
  queueTally: (draft: Omit<TallyEntry, "id" | "status" | "attempts">) => { ok: boolean; error?: string; entry?: TallyEntry };
  syncTally: (id: string) => void;
  /** Marks a posting attempt as failed with the reason Tally would give. */
  failTally: (id: string, error: string) => void;
  retryTally: (id: string) => void;
  bankTransactions: BankTransaction[];
  matchBank: (bankId: string, transactionId: string, amount: number, remarks?: string, actor?: string) => void;
  unmatchBank: (bankId: string, actor?: string) => void;
  annotateBank: (bankId: string, remarks: string, actor?: string) => void;
  /** Records a manual adjustment on a statement line and marks it reconciled. */
  adjustBank: (bankId: string, adjustment: BankAdjustment) => void;
}

const FinanceContext = createContext<FinanceStore | null>(null);

export function useFinance(): FinanceStore {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<FinanceDoc[]>(seedDocs);
  const [holds, setHolds] = useState<Record<string, PaymentHold>>({});
  const [tallyEntries, setTallyEntries] = useState<TallyEntry[]>(seedTallyEntries);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(seedBankTransactions);
  const tallyCounter = useRef(2606);
  const tallyRefCounter = useRef(412);
  const [expenses, setExpenses] = useState<Expense[]>(seedExpenses);
  const piCounter = useRef(2603);
  const dnCounter = useRef(2602);
  const rfCounter = useRef(2601);
  const expCounter = useRef(2612);

  const addDoc = useCallback<FinanceStore["addDoc"]>((doc, firstEvent) => {
    const id =
      doc.id ??
      (doc.type === "Proforma Invoice"
        ? `PI-${piCounter.current++}`
        : doc.type === "Debit Note"
          ? `DN-${dnCounter.current++}`
          : `RF-${rfCounter.current++}`);
    const full: FinanceDoc = { ...doc, id, timeline: [{ text: firstEvent, time: "Just now" }] };
    setDocs(list => [full, ...list]);
    return full;
  }, []);

  const updateDoc = useCallback((id: string, patch: Partial<FinanceDoc>, event?: string) => {
    setDocs(list =>
      list.map(d =>
        d.id === id
          ? { ...d, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...d.timeline] : d.timeline }
          : d,
      ),
    );
  }, []);

  const addExpense = useCallback<FinanceStore["addExpense"]>(expense => {
    const full: Expense = {
      ...expense,
      id: `EXP-${expCounter.current++}`,
      status: expense.amount > EXPENSE_APPROVAL_LIMIT ? "Pending Approval" : "Recorded",
      recordedBy: "Arjun Sharma",
    };
    setExpenses(list => [full, ...list]);
    return full;
  }, []);

  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setExpenses(list => list.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const submitPi = useCallback((id: string) => {
    setDocs(list =>
      list.map(d =>
        d.id === id && d.pi
          ? {
              ...d,
              pi: { ...d.pi, status: "Pending Approval", submittedAt: "Just now" },
              timeline: [{ text: "Submitted for manager approval", time: "Just now" }, ...d.timeline],
            }
          : d,
      ),
    );
  }, []);

  const decidePi = useCallback((id: string, decision: "approve" | "reject" | "revise", approver: string, remarks?: string) => {
    setDocs(list => {
      const target = list.find(d => d.id === id);
      if (!target?.pi) return list;
      const baseId = target.pi.baseId;
      return list.map(d => {
        if (d.id === id && d.pi) {
          const status = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Revised";
          const event =
            decision === "approve"
              ? `Approved by ${approver} — version ${d.pi.version} locked`
              : decision === "reject"
                ? `Rejected by ${approver}`
                : `Revision requested by ${approver}`;
          return {
            ...d,
            pi: {
              ...d.pi,
              status,
              approvedBy: approver,
              approvedAt: "Just now",
              approvalRemarks: remarks,
              lockedAt: decision === "approve" ? "Just now" : d.pi.lockedAt,
            },
            timeline: [{ text: remarks ? `${event} · “${remarks}”` : event, time: "Just now" }, ...d.timeline],
          };
        }
        if (decision === "approve" && d.pi && d.pi.baseId === baseId && d.id !== id && d.pi.status === "Approved") {
          return {
            ...d,
            pi: { ...d.pi, status: "Superseded" },
            timeline: [{ text: `Superseded by ${id}`, time: "Just now" }, ...d.timeline],
          };
        }
        return d;
      });
    });
  }, []);

  const createPiRevision = useCallback((id: string): FinanceDoc | undefined => {
    let created: FinanceDoc | undefined;
    setDocs(list => {
      const source = list.find(d => d.id === id);
      if (!source?.pi) return list;
      const baseId = source.pi.baseId;
      const nextVersion = Math.max(...list.filter(d => d.pi?.baseId === baseId).map(d => d.pi!.version)) + 1;
      created = {
        ...source,
        id: `${baseId}-R${nextVersion}`,
        date: "Just now",
        paid: 0,
        state: "Pending",
        txnRef: undefined,
        hold: undefined,
        terms: docTerms["Proforma Invoice"],
        pi: {
          ...source.pi,
          status: "Draft",
          version: nextVersion,
          previousVersionId: source.id,
          submittedAt: undefined,
          approvedBy: undefined,
          approvedAt: undefined,
          approvalRemarks: undefined,
          lockedAt: undefined,
        },
        timeline: [{ text: `Version ${nextVersion} drafted from ${source.id}`, time: "Just now" }],
      };
      return [created, ...list];
    });
    return created;
  }, []);

  const advCounter = useRef(2601);
  const recordAdvance = useCallback<FinanceStore["recordAdvance"]>((docId, args) => {
    let result: { ok: boolean; error?: string; receipt?: FinanceDoc } = { ok: false, error: "PI not found" };
    setDocs(list => {
      const doc = list.find(d => d.id === docId);
      if (!doc) return list;
      const duplicate = list.find(d => d.txnRef && d.txnRef.toLowerCase() === args.txnRef.toLowerCase());
      if (duplicate) {
        result = { ok: false, error: `Reference ${args.txnRef} is already recorded on ${duplicate.id} — duplicate advance blocked.` };
        return list;
      }
      const receipt: FinanceDoc = {
        id: `ADV-${advCounter.current++}`,
        type: "Payment Receipt",
        partyKind: "Customer",
        partyId: doc.partyId,
        partyName: doc.partyName,
        reference: doc.id,
        lines: [{ name: `Customer advance against ${doc.id}`, qty: 1, price: args.amount, discountPct: 0 }],
        gstPct: 0,
        date: "Just now",
        terms: docTerms["Payment Receipt"],
        state: "Paid",
        paid: args.amount,
        method: args.method,
        txnRef: args.txnRef,
        notes: args.remarks,
        createdBy: "Accounts",
        timeline: [{ text: `Advance received · ${args.method} · ${args.txnRef}`, time: "Just now" }],
      };
      result = { ok: true, receipt };
      return [
        receipt,
        ...list.map(d =>
          d.id === docId
            ? {
                ...d,
                paid: d.paid + args.amount,
                txnRef: d.txnRef ?? args.txnRef,
                timeline: [{ text: `${receipt.id} · advance of ${args.amount.toLocaleString("en-IN")} received · ${args.txnRef}`, time: "Just now" }, ...d.timeline],
              }
            : d,
        ),
      ];
    });
    return result;
  }, []);

  const setHold = useCallback<FinanceStore["setHold"]>((docId, hold) => {
    setHolds(map => {
      const next = { ...map };
      if (hold) next[docId] = hold;
      else delete next[docId];
      return next;
    });
  }, []);

  /* Duplicate protection: one accounting entry per source transaction. */
  const queueTally = useCallback<FinanceStore["queueTally"]>(draft => {
    let result: { ok: boolean; error?: string; entry?: TallyEntry } = { ok: true };
    setTallyEntries(list => {
      const existing = list.find(e => e.transactionId.toLowerCase() === draft.transactionId.toLowerCase());
      if (existing) {
        result = { ok: false, error: `${draft.transactionId} is already in the accounting queue as ${existing.id} (${existing.status}). Duplicate entries are blocked.` };
        return list;
      }
      const entry: TallyEntry = {
        ...draft,
        id: `TLY-${tallyCounter.current++}`,
        status: "Pending",
        attempts: 0,
        timeline: [{ text: `Queued as a ${draft.voucherType} voucher · Dr ${draft.debitLedger} / Cr ${draft.creditLedger}`, time: "Just now" }],
      };
      result = { ok: true, entry };
      return [entry, ...list];
    });
    return result;
  }, []);

  const syncTally = useCallback<FinanceStore["syncTally"]>(id => {
    setTallyEntries(list =>
      list.map(e =>
        e.id === id
          ? {
              ...e,
              status: "Synced",
              tallyRef: e.tallyRef ?? `TLY/${e.voucherType.slice(0, 4).toUpperCase()}/26/${tallyRefCounter.current++}`,
              lastSync: "08 Mar 2026, Just now",
              attempts: e.attempts + 1,
              error: undefined,
              timeline: [
                { text: `Posted to the accounting queue · attempt ${e.attempts + 1}`, time: "Just now" },
                ...e.timeline,
              ],
            }
          : e,
      ),
    );
  }, []);

  const failTally = useCallback<FinanceStore["failTally"]>((id, error) => {
    setTallyEntries(list =>
      list.map(e =>
        e.id === id
          ? {
              ...e,
              status: "Failed",
              attempts: e.attempts + 1,
              lastSync: "08 Mar 2026, Just now",
              error,
              timeline: [{ text: `Posting failed on attempt ${e.attempts + 1} — ${error}`, time: "Just now" }, ...e.timeline],
            }
          : e,
      ),
    );
  }, []);

  const retryTally = useCallback<FinanceStore["retryTally"]>(id => {
    setTallyEntries(list =>
      list.map(e =>
        e.id === id
          ? {
              ...e,
              status: "Retry",
              attempts: e.attempts + 1,
              timeline: [{ text: `Queued for retry · attempt ${e.attempts + 1}`, time: "Just now" }, ...e.timeline],
            }
          : e,
      ),
    );
  }, []);

  const matchBank = useCallback<FinanceStore["matchBank"]>((bankId, transactionId, amount, remarks, actor) => {
    setBankTransactions(list =>
      list.map(b =>
        b.id === bankId
          ? {
              ...b,
              matchedTo: transactionId,
              matchedAmount: amount,
              matchState: amount >= b.amount ? "Matched" : "Partially Matched",
              remarks: remarks ?? b.remarks,
              adjustedBy: actor ?? "Accounts",
            }
          : b,
      ),
    );
  }, []);

  const unmatchBank = useCallback<FinanceStore["unmatchBank"]>((bankId, actor) => {
    setBankTransactions(list =>
      list.map(b =>
        b.id === bankId
          ? { ...b, matchedTo: undefined, matchedAmount: undefined, matchState: "Unmatched", adjustedBy: actor ?? "Accounts" }
          : b,
      ),
    );
  }, []);

  const adjustBank = useCallback<FinanceStore["adjustBank"]>((bankId, adjustment) => {
    setBankTransactions(list =>
      list.map(b =>
        b.id === bankId
          ? {
              ...b,
              adjustment,
              /* An adjusted line is reconciled: the books now carry the entry the
                 statement was showing, so it stops counting as a difference. */
              matchState: "Adjusted",
              matchedAmount: adjustment.amount,
              remarks: adjustment.narration,
              adjustedBy: adjustment.adjustedBy,
            }
          : b,
      ),
    );
  }, []);

  const annotateBank = useCallback<FinanceStore["annotateBank"]>((bankId, remarks, actor) => {
    setBankTransactions(list => list.map(b => (b.id === bankId ? { ...b, remarks, adjustedBy: actor ?? "Accounts" } : b)));
  }, []);

  const value = useMemo(
    () => ({
      docs, expenses, addDoc, updateDoc, addExpense, updateExpense, submitPi, decidePi, createPiRevision, recordAdvance,
      holds, setHold,
      tallyEntries, queueTally, syncTally, failTally, retryTally, bankTransactions, matchBank, unmatchBank, annotateBank, adjustBank,
    }),
    [
      docs, expenses, addDoc, updateDoc, addExpense, updateExpense, submitPi, decidePi, createPiRevision, recordAdvance,
      holds, setHold,
      tallyEntries, queueTally, syncTally, failTally, retryTally, bankTransactions, matchBank, unmatchBank, annotateBank, adjustBank,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
