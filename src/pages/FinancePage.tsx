import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import SegmentBar from "@/components/data-display/SegmentBar";
import { SendTemplateModal } from "@/components/dispatch/CommunicationCenter";
import BankHub from "@/components/finance/BankHub";
import DocumentView from "@/components/finance/DocumentView";
import TallyHub, { voucherFor } from "@/components/finance/TallyHub";
import { AdvanceModal, DocCreateModal, ExpenseModal, HoldModal, PiCompareModal, type DocCreateMode } from "@/components/finance/FinanceModals";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import { AmountMethodModal } from "@/components/workshop/WorkshopModals";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { chartColors } from "@/data/dashboardData";
import {
  accountBalances,
  buildTransactions,
  purchaseVouchers,
  dateRank,
  docsFromReturns,
  docTerms,
  docTotals,
  docTypes,
  docTypeTone,
  expenseStatusTone,
  invoiceDocsFromSales,
  invoiceDocsFromWorkshop,
  paymentStateTone,
  piStatusTone,
  receiptDocs,
  receivableDue,
  resolveDoc,
  standardCommercialTerms,
  txnKindTone,
} from "@/data/financeData";
import { poPaid, poTotals } from "@/data/purchaseData";
import { paidAmount, saleTotals } from "@/data/salesData";
import { useAdmin } from "@/hooks/useAdmin";
import { commTemplates } from "@/data/dispatchData";
import { ledgerFor, voucherNarrative } from "@/data/integrationData";
import { useFinance } from "@/hooks/useFinance";
import { useTeam } from "@/hooks/useTeam";
import { usePurchase } from "@/hooks/usePurchase";
import { useQuality } from "@/hooks/useQuality";
import { useSales } from "@/hooks/useSales";
import { useToast } from "@/hooks/useToast";
import { useWorkshop } from "@/hooks/useWorkshop";
import type { CommTemplate, Expense, FinanceDoc, FinanceTransaction, SalesOrder, SalesQuotation, TransactionKind } from "@/types";
import { formatINR } from "@/utils";

export type FinanceIntent = "new-expense" | "new-invoice" | "record-payment";

type FinanceView =
  | { type: "overview" }
  | { type: "documents" }
  | { type: "approvals" }
  | { type: "receivables" }
  | { type: "payables" }
  | { type: "expenses" }
  | { type: "transactions" }
  | { type: "tally" }
  | { type: "bank" }
  | { type: "doc"; id: string };

interface ReceivableRow {
  kind: "order" | "custom";
  id: string;
  customerId: string;
  customer: string;
  invoiceId?: string;
  detail: string;
  total: number;
  paid: number;
  balance: number;
  due: string;
  overdue: boolean;
}

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;
const tabNames = ["Overview", "Documents", "PI Approvals", "Receivables", "Payables", "Expenses", "Transactions", "Tally", "Bank"] as const;

export default function FinancePage({
  initialTab,
  onTabHandled,
  intent,
  onIntentHandled,
  focusDocId,
  onFocusHandled,
  onOpenCustomer,
  onOpenOrder,
  onOpenQuotation,
  onOpenReturn,
  onOpenRepair,
  onOpenCustomOrder,
}: {
  initialTab?: string | null;
  onTabHandled?: () => void;
  intent: FinanceIntent | null;
  onIntentHandled: () => void;
  focusDocId: string | null;
  onFocusHandled: () => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenQuotation: (quotationId: string) => void;
  onOpenReturn: (returnId: string) => void;
  onOpenRepair: (repairId: string) => void;
  onOpenCustomOrder: (customOrderId: string) => void;
}) {
  const { logAudit } = useTeam();
  const toast = useToast();
  const { docs, expenses, addDoc, updateDoc, addExpense, updateExpense, submitPi, decidePi, createPiRevision, recordAdvance, holds, setHold, tallyEntries, queueTally, syncTally } = useFinance();
  const { can, activeRole, currentUser } = useAdmin();
  const { orders, addPayment, updateOrder, nextInvoiceId } = useSales();
  const { customOrders, repairs, addCustomPayment, updateCustomOrder } = useWorkshop();
  const { pos, addPOPayment, updatePO } = usePurchase();
  const { returns, nextCreditNoteId } = useQuality();

  const [view, setView] = useState<FinanceView>({ type: "overview" });

  useEffect(() => {
    if (!initialTab) return;
    const map: Record<string, FinanceView> = {
      Overview: { type: "overview" }, Documents: { type: "documents" }, "PI Approvals": { type: "approvals" },
      Receivables: { type: "receivables" }, Payables: { type: "payables" }, Expenses: { type: "expenses" },
      Transactions: { type: "transactions" }, Tally: { type: "tally" }, Bank: { type: "bank" },
    };
    const target = map[initialTab];
    if (target) setView(target);
    onTabHandled?.();
  }, [initialTab, onTabHandled]);

  const [docQuery, setDocQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("All types");
  const [txnQuery, setTxnQuery] = useState("");
  const [txnKind, setTxnKind] = useState<"All" | TransactionKind>("All");
  const [txnAccount, setTxnAccount] = useState<"All" | "Cash" | "Bank">("All");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [docMode, setDocMode] = useState<DocCreateMode | null>(null);
  const [payTarget, setPayTarget] = useState<ReceivableRow | null>(null);
  const [poPayTarget, setPoPayTarget] = useState<string | null>(null);
  const [docPayTarget, setDocPayTarget] = useState<FinanceDoc | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<FinanceDoc | null>(null);
  const [holdTarget, setHoldTarget] = useState<FinanceDoc | null>(null);
  const [sendCtx, setSendCtx] = useState<{ template: CommTemplate; partyId?: string; reference?: string } | null>(null);
  const [compareTarget, setCompareTarget] = useState<{ current: FinanceDoc; previous: FinanceDoc } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; withRemarks?: boolean; remarksRequired?: boolean; action: (remarks?: string) => void } | null>(null);

  useEffect(() => {
    if (!intent) return;
    if (intent === "new-expense") {
      setView({ type: "expenses" });
      setExpenseOpen(true);
    } else if (intent === "new-invoice") {
      setView({ type: "documents" });
      setDocMode("proforma");
    } else {
      setView({ type: "receivables" });
    }
    onIntentHandled();
  }, [intent, onIntentHandled]);

  useEffect(() => {
    if (focusDocId) {
      setView({ type: "doc", id: focusDocId });
      onFocusHandled();
    }
  }, [focusDocId, onFocusHandled]);

  /* ---------- Live registry: authored docs + documents derived from the module stores ---------- */
  const authoredIds = useMemo(() => new Set(docs.map(d => d.id)), [docs]);
  const allDocs = useMemo(() => {
    const derived = [
      ...invoiceDocsFromSales(orders),
      ...invoiceDocsFromWorkshop(customOrders),
      ...receiptDocs(orders, customOrders, repairs),
      ...docsFromReturns(returns),
    ];
    return [...docs, ...derived.filter(d => !authoredIds.has(d.id))]
      .map(d => (holds[d.id] ? { ...d, hold: holds[d.id] } : d))
      .sort((a, b) => dateRank(b.date) - dateRank(a.date));
  }, [docs, authoredIds, orders, customOrders, repairs, returns, holds]);

  const transactions = useMemo(
    () => buildTransactions({ orders, customOrders, repairs, pos, returns, expenses, docs }),
    [orders, customOrders, repairs, pos, returns, expenses, docs],
  );
  /* Supplier bills are accrual vouchers: postable to accounting, but deliberately
     outside the cash book so account balances stay cash-accurate. */
  const supplierBills = useMemo(() => purchaseVouchers(pos), [pos]);
  const balances = useMemo(() => accountBalances(transactions), [transactions]);

  const receivables = useMemo<ReceivableRow[]>(() => {
    const fromOrders = orders
      .filter(o => !["Cancelled", "Draft"].includes(o.status))
      .map(o => {
        const total = saleTotals(o.lines, o.gstPct).total;
        const paid = paidAmount(o);
        return {
          kind: "order" as const,
          id: o.id,
          customerId: o.customerId,
          customer: o.customerName,
          invoiceId: o.invoiceId,
          detail: o.lines[0]?.name ?? o.id,
          total,
          paid,
          balance: total - paid,
          due: receivableDue[o.id]?.due ?? "Before dispatch",
          overdue: receivableDue[o.id]?.overdue ?? false,
        };
      })
      .filter(r => r.balance > 0);
    const fromCustom = customOrders
      .filter(o => o.stage !== "Cancelled" && o.quotedAmount)
      .map(o => {
        const paid = o.payments.reduce((s, p) => s + p.amount, 0);
        return {
          kind: "custom" as const,
          id: o.id,
          customerId: o.customerId,
          customer: o.customerName,
          invoiceId: o.finalInvoiceId,
          detail: `Custom ${o.productType}`,
          total: o.quotedAmount!,
          paid,
          balance: o.quotedAmount! - paid,
          due: o.deliveryDate,
          overdue: false,
        };
      })
      .filter(r => r.balance > 0);
    return [...fromOrders, ...fromCustom];
  }, [orders, customOrders]);

  const payables = useMemo(
    () =>
      pos
        .filter(po => !["Draft", "Cancelled"].includes(po.status))
        .map(po => ({ po, total: poTotals(po).total, paid: poPaid(po), balance: poTotals(po).total - poPaid(po) }))
        .filter(r => r.balance > 0),
    [pos],
  );

  const receivableTotal = receivables.reduce((s, r) => s + r.balance, 0);
  const payableTotal = payables.reduce((s, r) => s + r.balance, 0);
  const activeExpenses = expenses.filter(e => e.status === "Recorded" || e.status === "Approved");
  const pendingExpenses = expenses.filter(e => e.status === "Pending Approval");

  const refNav = (ref?: string): (() => void) | undefined => {
    if (!ref) return undefined;
    if (ref.startsWith("SO-") && orders.some(o => o.id === ref)) return () => onOpenOrder(ref);
    if (ref.startsWith("CO-") && customOrders.some(o => o.id === ref)) return () => onOpenCustomOrder(ref);
    if (ref.startsWith("RJ-") && repairs.some(r => r.id === ref)) return () => onOpenRepair(ref);
    if (ref.startsWith("RT-") && returns.some(r => r.id === ref)) return () => onOpenReturn(ref);
    if (ref.startsWith("QT-")) return () => onOpenQuotation(ref);
    return undefined;
  };

  /* ---------- Financial actions ---------- */

  const settleOrderPayment = (order: SalesOrder, amount: number, method: string) => {
    const receipt = addPayment(order.id, { amount, method });
    const balance = saleTotals(order.lines, order.gstPct).total - paidAmount(order) - amount;
    let patch: Partial<SalesOrder> = {};
    if (["Confirmed", "Payment Pending", "Partially Paid"].includes(order.status)) {
      patch = { status: balance <= 0 ? "Processing" : "Partially Paid" };
    }
    updateOrder(order.id, patch, `${receipt.id} · ${formatINR(amount)} received — ${method.toLowerCase()}`);
    return receipt;
  };

  const recordReceivable = (row: ReceivableRow, amount: number, method: string) => {
    if (row.kind === "order") {
      const order = orders.find(o => o.id === row.id);
      if (!order) return;
      const receipt = settleOrderPayment(order, amount, method);
      toast({ tone: "success", title: `Receipt ${receipt.id}`, message: `${formatINR(amount)} from ${row.customer} against ${row.id}.` });
    } else {
      const payment = addCustomPayment(row.id, { amount, method });
      updateCustomOrder(row.id, {}, `${payment.id} · ${formatINR(amount)} received — ${method.toLowerCase()}`);
      toast({ tone: "success", title: `Receipt ${payment.id}`, message: `${formatINR(amount)} from ${row.customer} against ${row.id}.` });
    }
    setPayTarget(null);
  };

  const paySupplier = (poId: string, amount: number, method: string) => {
    const po = pos.find(p => p.id === poId);
    if (!po) return;
    const payment = addPOPayment(po.id, { amount, method });
    updatePO(po.id, {}, `${payment.id} · ${formatINR(amount)} paid — ${method.toLowerCase()}`);
    toast({ tone: "success", title: "Supplier paid", message: `${payment.id} · ${formatINR(amount)} to ${po.supplierName}.` });
    setPoPayTarget(null);
  };

  const recordDocPayment = (doc: FinanceDoc, amount: number, method: string) => {
    if (doc.reference?.startsWith("SO-")) {
      const order = orders.find(o => o.id === doc.reference);
      if (order) {
        const receipt = settleOrderPayment(order, amount, method);
        if (authoredIds.has(doc.id)) updateDoc(doc.id, {}, `${receipt.id} · ${formatINR(amount)} received`);
        toast({ tone: "success", title: `Receipt ${receipt.id}`, message: `${formatINR(amount)} recorded against ${doc.id}.` });
        setDocPayTarget(null);
        return;
      }
    }
    updateDoc(doc.id, { paid: doc.paid + amount }, `${formatINR(amount)} received — ${method.toLowerCase()}`);
    toast({ tone: "success", title: "Payment recorded", message: `${formatINR(amount)} against ${doc.id}.` });
    setDocPayTarget(null);
  };

  const convertProforma = (doc: FinanceDoc) =>
    setConfirm({
      title: `Convert ${doc.id} to a GST invoice?`,
      message: <>Creates a numbered GST invoice for {doc.partyName} with the same lines. The proforma stays on file for the audit trail.</>,
      confirmLabel: "Convert",
      action: () => {
        const invoiceId = nextInvoiceId();
        addDoc(
          {
            id: invoiceId, type: "GST Invoice", partyKind: "Customer",
            partyId: doc.partyId, partyName: doc.partyName, reference: doc.reference,
            lines: doc.lines, gstPct: doc.gstPct || 3, date: "Just now", dueDate: "Before dispatch",
            terms: docTerms["GST Invoice"], state: "Pending", paid: doc.paid, createdBy: "Arjun Sharma",
          },
          `Converted from proforma ${doc.id}`,
        );
        updateDoc(doc.id, {}, `Converted to GST invoice ${invoiceId}`);
        setConfirm(null);
        setView({ type: "doc", id: invoiceId });
        toast({ tone: "success", title: `Invoice ${invoiceId}`, message: `Created from ${doc.id}.` });
      },
    });

  const voidDoc = (doc: FinanceDoc) =>
    setConfirm({
      title: `Void ${doc.id}?`,
      danger: true,
      message: <>It stops counting toward balances but stays on file. Manager authorisation required — you are signed in as Arjun Sharma (Approving Manager).</>,
      confirmLabel: "Void document",
      action: () => {
        updateDoc(doc.id, { voided: true }, "Document voided by Arjun Sharma (Approving Manager)");
        setConfirm(null);
        toast({ tone: "warning", title: "Document voided", message: doc.id });
      },
    });

  const approveExpense = (e: Expense) =>
    setConfirm({
      title: `Approve ${e.id}?`,
      message: <>{formatINR(e.amount)} · {e.category} — “{e.description}”. Manager authorisation as Arjun Sharma; it posts to the ledger on approval.</>,
      confirmLabel: "Approve expense",
      action: () => {
        updateExpense(e.id, { status: "Approved", approvedBy: "Arjun Sharma" });
        setConfirm(null);
        toast({ tone: "success", title: "Expense approved", message: `${e.id} · ${formatINR(e.amount)} posted to the ledger.` });
      },
    });

  const rejectExpense = (e: Expense) =>
    setConfirm({
      title: `Reject ${e.id}?`,
      danger: true,
      message: <>{formatINR(e.amount)} for {e.category} will not post to the ledger. The record stays for the audit trail.</>,
      confirmLabel: "Reject expense",
      action: () => {
        updateExpense(e.id, { status: "Rejected", approvedBy: "Arjun Sharma" });
        setConfirm(null);
        toast({ tone: "warning", title: "Expense rejected", message: e.id });
      },
    });

  const createProformaFromQuote = (quote: SalesQuotation) => {
    const created = addDoc(
      {
        type: "Proforma Invoice", partyKind: "Customer",
        partyId: quote.customerId, partyName: quote.customerName, reference: quote.id,
        lines: quote.lines.map(l => ({ name: l.name, sku: l.sku, qty: l.qty, price: l.price, discountPct: l.discountPct })),
        gstPct: quote.gstPct, date: "Just now", dueDate: `Valid until ${quote.validUntil}`,
        terms: docTerms["Proforma Invoice"], state: "Pending", paid: 0, createdBy: "Arjun Sharma",
      },
      `Proforma created from ${quote.id}`,
    );
    updateDoc(created.id, {
      pi: {
        status: "Draft",
        version: 1,
        baseId: created.id,
        specifications: [
          ...quote.lines.map(l => `${l.name} · qty ${l.qty}${l.sku ? ` · ${l.sku}` : ""}`),
          "Certification and batch coding as per catalogue record.",
        ],
        commercialTerms: standardCommercialTerms,
        payment: { advancePct: 40, balanceOn: "Before dispatch" },
        delivery: { mode: "FOR destination", leadTimeDays: 14, destination: "Customer warehouse", freight: "Included" },
        validUntil: "22 Mar 2026",
      },
    });
    setDocMode(null);
    setView({ type: "doc", id: created.id });
    toast({ tone: "success", title: `Proforma ${created.id} drafted`, message: `v1 for ${quote.customerName} — submit it for manager approval.` });
  };

  const createPartyDoc = (args: { mode: Exclude<DocCreateMode, "proforma">; partyId: string; partyName: string; amount: number; reason: string; method: string }) => {
    const base = {
      partyId: args.partyId,
      partyName: args.partyName,
      lines: [{ name: args.reason, qty: 1, price: args.amount, discountPct: 0 }],
      gstPct: 0,
      date: "Just now",
      createdBy: "Arjun Sharma",
    };
    let created: FinanceDoc;
    if (args.mode === "credit-note") {
      created = addDoc(
        { ...base, id: nextCreditNoteId(), type: "Credit Note", partyKind: "Customer", dueDate: "Valid 6 months from issue", terms: docTerms["Credit Note"], state: "Pending", paid: 0 },
        "Credit note issued by Arjun Sharma",
      );
    } else if (args.mode === "debit-note") {
      created = addDoc(
        { ...base, type: "Debit Note", partyKind: "Supplier", dueDate: "Adjust in next payment", terms: docTerms["Debit Note"], state: "Pending", paid: 0 },
        "Debit note raised by Arjun Sharma",
      );
    } else {
      created = addDoc(
        { ...base, type: "Refund Receipt", partyKind: "Customer", terms: docTerms["Refund Receipt"], state: "Refunded", paid: args.amount, method: args.method },
        "Refund authorised by Arjun Sharma (Approving Manager)",
      );
    }
    setDocMode(null);
    setView({ type: "doc", id: created.id });
    toast({ tone: "success", title: created.id, message: `${created.type} for ${args.partyName} · ${formatINR(args.amount)}.` });
  };

  /* ---------- Shared modals ---------- */
  const modals = (
    <>
      <ExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSubmit={draft => {
          const created = addExpense(draft);
          setExpenseOpen(false);
          toast(
            created.status === "Pending Approval"
              ? { tone: "info", title: "Sent for approval", message: `${created.id} · ${formatINR(created.amount)} awaits the manager.` }
              : { tone: "success", title: "Expense recorded", message: `${created.id} · ${formatINR(created.amount)} posted to the ledger.` },
          );
        }}
      />
      <DocCreateModal mode={docMode} onClose={() => setDocMode(null)} onCreateProforma={createProformaFromQuote} onCreateParty={createPartyDoc} />
      {payTarget && (
        <AmountMethodModal
          open
          onClose={() => setPayTarget(null)}
          title={`Record payment — ${payTarget.id}`}
          message={<>{payTarget.customer} owes {formatINR(payTarget.balance)} of {formatINR(payTarget.total)}. The receipt lands in Documents and the ledger.</>}
          defaultAmount={payTarget.balance}
          max={payTarget.balance}
          confirmLabel="Record payment"
          onConfirm={(amount, method) => recordReceivable(payTarget, amount, method)}
        />
      )}
      {poPayTarget && (() => {
        const row = payables.find(r => r.po.id === poPayTarget);
        return row ? (
          <AmountMethodModal
            open
            onClose={() => setPoPayTarget(null)}
            title={`Pay supplier — ${row.po.id}`}
            message={<>{row.po.supplierName} · {formatINR(row.balance)} outstanding on terms “{row.po.paymentTerms}”.</>}
            defaultAmount={row.balance}
            max={row.balance}
            confirmLabel="Pay supplier"
            onConfirm={(amount, method) => paySupplier(row.po.id, amount, method)}
          />
        ) : null;
      })()}
      {docPayTarget && (
        <AmountMethodModal
          open
          onClose={() => setDocPayTarget(null)}
          title={`Record payment — ${docPayTarget.id}`}
          message={<>Balance {formatINR(resolveDoc(docPayTarget, orders).balance)} due from {docPayTarget.partyName}.</>}
          defaultAmount={resolveDoc(docPayTarget, orders).balance}
          max={resolveDoc(docPayTarget, orders).balance}
          confirmLabel="Record payment"
          onConfirm={(amount, method) => recordDocPayment(docPayTarget, amount, method)}
        />
      )}
      <AdvanceModal
        doc={advanceTarget}
        total={advanceTarget ? docTotals(advanceTarget.lines, advanceTarget.gstPct).total : 0}
        onClose={() => setAdvanceTarget(null)}
        onSubmit={args => {
          if (!advanceTarget) return undefined;
          const result = recordAdvance(advanceTarget.id, args);
          if (!result.ok) return result.error;
          setAdvanceTarget(null);
          toast({ tone: "success", title: `Advance ${result.receipt?.id} recorded`, message: `${formatINR(args.amount)} against ${advanceTarget.id} · ${args.txnRef}.` });
          return undefined;
        }}
      />
      <SendTemplateModal
        template={sendCtx?.template ?? null}
        presetPartyId={sendCtx?.partyId}
        presetReference={sendCtx?.reference}
        onClose={() => setSendCtx(null)}
      />
      <HoldModal
        doc={holdTarget}
        onClose={() => setHoldTarget(null)}
        onConfirm={reason => {
          if (!holdTarget) return;
          const hold = { reason, heldBy: currentUser, heldAt: "Just now" };
          /* Authored docs keep the hold on the document; derived invoices use the overlay. */
          updateDoc(holdTarget.id, { hold }, `Payment placed on hold — ${reason}`);
          setHold(holdTarget.id, hold);
          logAudit({ user: currentUser, action: "Payment hold placed", module: "Payments", record: holdTarget.id, newValue: reason });
          setHoldTarget(null);
          toast({ tone: "warning", title: "Payment on hold", message: `${holdTarget.id} · ${reason}` });
        }}
      />
      <PiCompareModal
        current={compareTarget?.current ?? null}
        previous={compareTarget?.previous ?? null}
        onClose={() => setCompareTarget(null)}
      />
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          danger={confirm.danger}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          withRemarks={confirm.withRemarks}
          remarksRequired={confirm.remarksRequired}
          onConfirm={confirm.action}
        />
      )}
    </>
  );

  /* ---------- Document detail ---------- */
  /* One document → one Tally voucher. The posting preview and status shown on a
     document come from the same queue the Tally tab works from. */
  const accountingFor = (doc: FinanceDoc, total: number) => {
    const entry = tallyEntries.find(e => e.transactionId.toLowerCase() === doc.id.toLowerCase());
    const voucherType = entry?.voucherType ?? voucherFor({
      id: doc.id, date: doc.date, kind: doc.type === "Payment Receipt" ? "Receipt" : doc.type === "Refund Receipt" ? "Refund" : "Receipt",
      account: "Bank", method: doc.method ?? "Bank transfer", party: doc.partyName, reference: doc.reference, amount: total,
    });
    const ledgers = entry
      ? { debit: entry.debitLedger, credit: entry.creditLedger }
      : ledgerFor(voucherType, doc.method ?? "Bank transfer");
    return {
      status: (entry?.status ?? "Pending") as "Pending" | "Queued" | "Synced" | "Failed" | "Retry",
      voucherType,
      debitLedger: ledgers.debit,
      creditLedger: ledgers.credit,
      narrative: voucherNarrative[voucherType],
      tallyRef: entry?.tallyRef,
      lastSync: entry?.lastSync,
      error: entry?.error,
      canPost: can("Payments", "Edit"),
      onOpenTally: () => setView({ type: "tally" }),
      onPost: () => {
        let id = entry?.id;
        if (!entry) {
          const res = queueTally({
            transactionId: doc.id, voucherType, party: doc.partyName, reference: doc.reference,
            amount: total, date: doc.date, debitLedger: ledgers.debit, creditLedger: ledgers.credit,
            timeline: [],
          });
          if (!res.ok) {
            toast({ tone: "error", title: "Already queued", message: res.error ?? "" });
            return;
          }
          id = res.entry?.id;
        }
        if (!id) return;
        syncTally(id);
        logAudit({
          user: currentUser, action: "Document posted to accounting", module: "Payments",
          record: doc.id, newValue: `${voucherType} · ${formatINR(total)}`,
        });
        toast({ tone: "success", title: "Posted to Tally", message: `${doc.id} now carries a voucher reference (simulated).` });
      },
    };
  };

  /* Which template a document is sent with. */
  const sendTemplateFor = (doc: FinanceDoc) =>
    commTemplates.find(t => t.id === (doc.type === "Payment Receipt" ? "tpl-invoice" : doc.type === "Proforma Invoice" ? "tpl-quotation" : "tpl-invoice"));

  if (view.type === "doc") {
    const doc = allDocs.find(d => d.id === view.id);
    if (!doc) {
      setView({ type: "documents" });
      return null;
    }
    const resolved = resolveDoc(doc, orders);
    const derived = !authoredIds.has(doc.id);
    const isInvoice = doc.type === "Proforma Invoice" || doc.type === "GST Invoice";
    const held = Boolean(doc.hold && !doc.hold.resolvedAt);
    const canApprove = can("Billing", "Approve");
    const versions = doc.pi
      ? allDocs.filter(d => d.pi?.baseId === doc.pi!.baseId).sort((a, b) => (a.pi!.version - b.pi!.version))
      : undefined;
    const previousVersion = doc.pi?.previousVersionId ? allDocs.find(d => d.id === doc.pi!.previousVersionId) : undefined;

    const piActions = doc.pi ? (
      <>
        {doc.pi.status === "Draft" && (
          <Button onClick={() => {
            submitPi(doc.id);
            toast({ tone: "info", title: "Submitted for approval", message: `${doc.id} is in the manager's PI approval queue.` });
          }}>
            <Icon name="send" /> Submit for approval
          </Button>
        )}
        {doc.pi.status === "Pending Approval" && canApprove && (
          <>
            <Button onClick={() =>
              setConfirm({
                title: `Approve ${doc.id}?`,
                message: <>Version {doc.pi!.version} becomes the locked, approved PI. Any previously approved version is superseded.</>,
                confirmLabel: "Approve PI",
                withRemarks: true,
                action: remarks => {
                  decidePi(doc.id, "approve", "Arjun Sharma", remarks);
                  setConfirm(null);
                  toast({ tone: "success", title: "PI approved", message: `${doc.id} v${doc.pi!.version} is locked. Advance can now be collected.` });
                },
              })
            }>
              <Icon name="check" /> Approve
            </Button>
            <Button variant="secondary" onClick={() =>
              setConfirm({
                title: `Request revision on ${doc.id}?`,
                message: "The sales team drafts the next version against your remarks.",
                confirmLabel: "Request revision",
                withRemarks: true,
                remarksRequired: true,
                action: remarks => {
                  decidePi(doc.id, "revise", "Arjun Sharma", remarks);
                  setConfirm(null);
                  toast({ tone: "info", title: "Revision requested", message: doc.id });
                },
              })
            }>
              Request revision
            </Button>
            <Button variant="danger" onClick={() =>
              setConfirm({
                title: `Reject ${doc.id}?`,
                danger: true,
                message: "The PI is closed with your remarks. A fresh version can still be drafted.",
                confirmLabel: "Reject PI",
                withRemarks: true,
                remarksRequired: true,
                action: remarks => {
                  decidePi(doc.id, "reject", "Arjun Sharma", remarks);
                  setConfirm(null);
                  toast({ tone: "warning", title: "PI rejected", message: doc.id });
                },
              })
            }>
              Reject
            </Button>
          </>
        )}
        {doc.pi.status === "Pending Approval" && !canApprove && (
          <Button variant="secondary" disabled>Awaiting manager approval</Button>
        )}
        {doc.pi.status === "Approved" && resolved.balance > 0 && !held && (
          <Button onClick={() => setAdvanceTarget(doc)}><Icon name="wallet" /> Record advance</Button>
        )}
        {["Approved", "Rejected", "Revised"].includes(doc.pi.status) && (
          <Button variant="secondary" onClick={() => {
            const revision = createPiRevision(doc.id);
            if (revision) {
              toast({ tone: "success", title: `Version ${revision.pi?.version} drafted`, message: `${revision.id} — edit and submit for approval.` });
              setView({ type: "doc", id: revision.id });
            }
          }}>
            New version
          </Button>
        )}
        {previousVersion && (
          <Button variant="secondary" onClick={() => setCompareTarget({ current: doc, previous: previousVersion })}>
            <Icon name="columns" /> Compare v{previousVersion.pi?.version}
          </Button>
        )}
      </>
    ) : undefined;

    return (
      <>
        <DocumentView
          doc={doc}
          resolved={resolved}
          derived={derived}
          versions={versions}
          extraActions={piActions}
          onBack={() => setView(doc.pi?.status === "Pending Approval" ? { type: "approvals" } : { type: "documents" })}
          onOpenParty={doc.partyKind === "Customer" && doc.partyId ? () => onOpenCustomer(doc.partyId!) : undefined}
          onOpenReference={refNav(doc.reference)}
          onOpenVersion={id => setView({ type: "doc", id })}
          accounting={doc.voided ? undefined : accountingFor(doc, resolved.total)}
          onSend={
            doc.partyKind === "Customer" && doc.partyId
              ? () => {
                  const template = sendTemplateFor(doc);
                  if (template) setSendCtx({ template, partyId: doc.partyId, reference: doc.id });
                }
              : undefined
          }
          onRecordPayment={isInvoice && resolved.balance > 0 && !held && !doc.pi ? () => setDocPayTarget(doc) : undefined}
          onConvert={doc.type === "Proforma Invoice" && !derived && (!doc.pi || doc.pi.status === "Approved") ? () => convertProforma(doc) : undefined}
          onVoid={derived || doc.pi?.status === "Approved" ? undefined : () => voidDoc(doc)}
          onToggleHold={
            doc.type === "GST Invoice" && can("Payments", "Approve")
              ? held
                ? () =>
                    setConfirm({
                      title: `Release the hold on ${doc.id}?`,
                      message: <>Held by {doc.hold!.heldBy} — “{doc.hold!.reason}”. Releasing re-enables payments; your remarks become the resolution.</>,
                      confirmLabel: "Release hold",
                      withRemarks: true,
                      remarksRequired: true,
                      action: remarks => {
                        const released = { ...doc.hold!, resolvedBy: currentUser, resolvedAt: "Just now", resolution: remarks };
                        updateDoc(doc.id, { hold: released }, `Payment hold released — ${remarks}`);
                        setHold(doc.id, released);
                        logAudit({ user: currentUser, action: "Payment hold released", module: "Payments", record: doc.id, newValue: remarks ?? "" });
                        setConfirm(null);
                        toast({ tone: "success", title: "Hold released", message: doc.id });
                      },
                    })
                : () => setHoldTarget(doc)
              : undefined
          }
        />
        {modals}
      </>
    );
  }

  /* ---------- Registers ---------- */

  const filteredDocs = allDocs.filter(d => {
    if (docTypeFilter !== "All types" && d.type !== docTypeFilter) return false;
    const q = docQuery.trim().toLowerCase();
    return !q || `${d.id} ${d.type} ${d.partyName} ${d.reference ?? ""}`.toLowerCase().includes(q);
  });

  const docColumns: Column<FinanceDoc>[] = [
    {
      key: "id", label: "Document", sortable: true, hideable: false, sortValue: d => d.id,
      render: d => (
        <button type="button" className="table-product" onClick={() => setView({ type: "doc", id: d.id })}>
          <span><b className="link">{d.id}</b><small>{d.lines[0]?.name}</small></span>
        </button>
      ),
    },
    { key: "type", label: "Type", sortable: true, sortValue: d => d.type, render: d => <Badge tone={docTypeTone[d.type]}>{d.type}</Badge> },
    {
      key: "party", label: "Party", sortable: true, sortValue: d => d.partyName,
      render: d =>
        d.partyKind === "Customer" && d.partyId ? (
          <button type="button" className="cell-link" onClick={() => onOpenCustomer(d.partyId!)}>{d.partyName}</button>
        ) : (
          d.partyName
        ),
    },
    { key: "reference", label: "Reference", defaultHidden: true, render: d => d.reference ?? "—" },
    { key: "date", label: "Date", sortable: true, sortValue: d => dateRank(d.date), render: d => d.date },
    {
      key: "amount", label: "Amount", sortable: true, align: "right", sortValue: d => docTotals(d.lines, d.gstPct).total,
      render: d => <strong>{formatINR(docTotals(d.lines, d.gstPct).total)}</strong>,
    },
    {
      key: "state", label: "State",
      render: d =>
        d.voided ? (
          <Badge tone="danger">Voided</Badge>
        ) : d.pi ? (
          <span className="row-actions">
            <Badge tone={piStatusTone[d.pi.status]}>{d.pi.status}</Badge>
            {d.hold && !d.hold.resolvedAt && <Badge tone="danger">Hold</Badge>}
          </span>
        ) : (
          <span className="row-actions">
            <Badge tone={paymentStateTone[resolveDoc(d, orders).state]}>{resolveDoc(d, orders).state}</Badge>
            {d.hold && !d.hold.resolvedAt && <Badge tone="danger">Hold</Badge>}
          </span>
        ),
    },
  ];

  const receivableColumns: Column<ReceivableRow>[] = [
    {
      key: "id", label: "Reference", sortable: true, hideable: false, sortValue: r => r.id,
      render: r => (
        <button
          type="button"
          className="table-product"
          onClick={() => (r.kind === "order" ? onOpenOrder(r.id) : onOpenCustomOrder(r.id))}
        >
          <span><b className="link">{r.id}</b><small>{r.detail}</small></span>
        </button>
      ),
    },
    {
      key: "customer", label: "Customer", sortable: true, sortValue: r => r.customer,
      render: r => <button type="button" className="cell-link" onClick={() => onOpenCustomer(r.customerId)}>{r.customer}</button>,
    },
    {
      key: "invoice", label: "Invoice", defaultHidden: true,
      render: r =>
        r.invoiceId ? (
          <button type="button" className="cell-link" onClick={() => setView({ type: "doc", id: r.invoiceId! })}>{r.invoiceId}</button>
        ) : (
          "—"
        ),
    },
    { key: "total", label: "Total", sortable: true, align: "right", sortValue: r => r.total, render: r => formatINR(r.total) },
    { key: "paid", label: "Paid", align: "right", render: r => (r.paid ? formatINR(r.paid) : "—") },
    { key: "balance", label: "Balance", sortable: true, align: "right", sortValue: r => r.balance, render: r => <strong className="warning-text">{formatINR(r.balance)}</strong> },
    {
      key: "due", label: "Due",
      render: r => (r.overdue ? <Badge tone="danger">Overdue · {r.due}</Badge> : r.due),
    },
    {
      key: "action", label: "", hideable: false,
      render: r => {
        const heldInvoice = r.invoiceId
          ? allDocs.find(d => d.id === r.invoiceId && d.hold && !d.hold.resolvedAt)
          : allDocs.find(d => d.reference === r.id && d.type === "GST Invoice" && d.hold && !d.hold.resolvedAt);
        if (heldInvoice) {
          return (
            <span className="row-actions">
              <Badge tone="danger">Payment Hold</Badge>
              <button type="button" className="link-btn" onClick={() => setView({ type: "doc", id: heldInvoice.id })}>View</button>
            </span>
          );
        }
        return (
          <span className="row-actions">
            <Button variant="secondary" onClick={() => setPayTarget(r)}>Record payment</Button>
            <Button
              variant="ghost"
              onClick={() => {
                const template = commTemplates.find(t => t.id === "tpl-payment-reminder");
                if (template) setSendCtx({ template, partyId: r.customerId, reference: r.invoiceId ?? r.id });
              }}
            >
              <Icon name="mail" /> Reminder
            </Button>
          </span>
        );
      },
    },
  ];

  const payableColumns: Column<(typeof payables)[number]>[] = [
    {
      key: "po", label: "Purchase order", sortable: true, hideable: false, sortValue: r => r.po.id,
      render: r => <span className="table-product"><span><b>{r.po.id}</b><small>{r.po.lines[0]?.description}</small></span></span>,
    },
    { key: "supplier", label: "Supplier", sortable: true, sortValue: r => r.po.supplierName, render: r => r.po.supplierName },
    { key: "terms", label: "Terms", defaultHidden: true, render: r => r.po.paymentTerms },
    { key: "total", label: "Total", sortable: true, align: "right", sortValue: r => r.total, render: r => formatINR(r.total) },
    { key: "paid", label: "Paid", align: "right", render: r => (r.paid ? formatINR(r.paid) : "—") },
    {
      key: "balance", label: "Outstanding", sortable: true, align: "right", sortValue: r => r.balance,
      render: r => {
        const dn = docs.find(d => d.type === "Debit Note" && !d.voided && d.reference === r.po.id && resolveDoc(d, orders).state === "Pending");
        return (
          <span>
            <strong className="warning-text">{formatINR(r.balance)}</strong>
            {dn && <small className="note-cell">{dn.id} · {formatINR(docTotals(dn.lines, dn.gstPct).total)} recoverable</small>}
          </span>
        );
      },
    },
    {
      key: "action", label: "", hideable: false,
      render: r => <Button variant="secondary" onClick={() => setPoPayTarget(r.po.id)}>Pay supplier</Button>,
    },
  ];

  const expenseColumns: Column<Expense>[] = [
    {
      key: "id", label: "Expense", sortable: true, hideable: false, sortValue: e => e.id,
      render: e => <span className="table-product"><span><b>{e.id}</b><small>{e.description}</small></span></span>,
    },
    { key: "category", label: "Category", sortable: true, sortValue: e => e.category, render: e => e.category },
    { key: "amount", label: "Amount", sortable: true, align: "right", sortValue: e => e.amount, render: e => <strong>{formatINR(e.amount)}</strong> },
    { key: "date", label: "Date", sortable: true, sortValue: e => dateRank(e.date), render: e => e.date },
    { key: "method", label: "Method", defaultHidden: true, render: e => e.method },
    {
      key: "attachment", label: "Attachment", defaultHidden: true,
      render: e => (e.attachment ? <span className="pref-chip"><Icon name="component" size={12} /> {e.attachment}</span> : "—"),
    },
    { key: "status", label: "Status", sortable: true, sortValue: e => e.status, render: e => <Badge tone={expenseStatusTone[e.status]}>{e.status}</Badge> },
    {
      key: "actions", label: "", hideable: false,
      render: e =>
        e.status === "Pending Approval" ? (
          <span className="row-actions">
            <Button variant="secondary" onClick={() => approveExpense(e)}>Approve</Button>
            <button type="button" className="link-btn danger-link" onClick={() => rejectExpense(e)}>Reject</button>
          </span>
        ) : (
          <small className="muted">{e.approvedBy ? `by ${e.approvedBy}` : e.recordedBy}</small>
        ),
    },
  ];

  const filteredTxns = transactions.filter(t => {
    if (txnKind !== "All" && t.kind !== txnKind) return false;
    if (txnAccount !== "All" && t.account !== txnAccount) return false;
    const q = txnQuery.trim().toLowerCase();
    return !q || `${t.id} ${t.party} ${t.reference ?? ""} ${t.method} ${t.note ?? ""}`.toLowerCase().includes(q);
  });

  const txnColumns: Column<FinanceTransaction>[] = [
    {
      key: "id", label: "Transaction", sortable: true, hideable: false, sortValue: t => t.id,
      render: t => <span className="table-product"><span><b>{t.id}</b>{t.note && <small>{t.note}</small>}</span></span>,
    },
    { key: "date", label: "Date", sortable: true, sortValue: t => dateRank(t.date), render: t => t.date },
    { key: "kind", label: "Type", sortable: true, sortValue: t => t.kind, render: t => <Badge tone={txnKindTone[t.kind]}>{t.kind}</Badge> },
    { key: "party", label: "Party", sortable: true, sortValue: t => t.party, render: t => t.party },
    {
      key: "reference", label: "Reference",
      render: t => {
        const nav = refNav(t.reference);
        return t.reference ? (nav ? <button type="button" className="cell-link" onClick={nav}>{t.reference}</button> : t.reference) : "—";
      },
    },
    { key: "method", label: "Method", defaultHidden: true, render: t => t.method },
    { key: "account", label: "Account", render: t => t.account },
    {
      key: "amount", label: "Amount", sortable: true, align: "right", sortValue: t => (t.kind === "Receipt" ? t.amount : -t.amount),
      render: t => (
        <strong className={t.kind === "Receipt" ? "up-text" : "warning-text"}>
          {t.kind === "Receipt" ? "+" : "−"} {formatINR(t.amount)}
        </strong>
      ),
    },
  ];

  /* ---------- Overview data ---------- */
  const invoiceStates = allDocs.filter(d => (d.type === "GST Invoice" || d.type === "Proforma Invoice") && !d.voided).map(d => resolveDoc(d, orders).state);
  const stateSegments = [
    { label: "Paid", value: invoiceStates.filter(s => s === "Paid").length, color: chartColors.emerald },
    { label: "Partial", value: invoiceStates.filter(s => s === "Partial").length, color: chartColors.gold },
    { label: "Pending", value: invoiceStates.filter(s => s === "Pending").length, color: chartColors.royal },
    { label: "Overdue", value: invoiceStates.filter(s => s === "Overdue").length, color: chartColors.red },
  ].filter(s => s.value > 0);

  const expenseByCategory = expenseCategoriesWithTotals(activeExpenses);
  const docTypeCounts = docTypes
    .map(t => ({ label: t, value: allDocs.filter(d => d.type === t && !d.voided).length, display: String(allDocs.filter(d => d.type === t && !d.voided).length) }))
    .filter(x => x.value > 0);

  const activeTab =
    view.type === "overview" ? "Overview"
      : view.type === "documents" ? "Documents"
        : view.type === "approvals" ? "PI Approvals"
          : view.type === "receivables" ? "Receivables"
            : view.type === "payables" ? "Payables"
              : view.type === "expenses" ? "Expenses"
                : view.type === "tally" ? "Tally"
                  : view.type === "bank" ? "Bank"
                    : "Transactions";

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">ACCOUNTS · BILLING, PAYMENTS & EXPENSES</p>
          <h1>Every rupee, accounted for.</h1>
          <p>Invoices, receipts, credit and debit notes from every module in one registry — with receivables, payables, expenses and a full transactions ledger.</p>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" onClick={() => setExpenseOpen(true)}><Icon name="wallet" /> New expense</Button>
          <Button onClick={() => { setView({ type: "documents" }); setDocMode("proforma"); }}><Icon name="plus" /> New document</Button>
        </div>
      </div>
      <Tabs
        tabs={[...tabNames]}
        active={activeTab}
        onChange={t => setView({ type: (t === "PI Approvals" ? "approvals" : t.toLowerCase()) as "overview" })}
        label="Accounts views"
      />

      {view.type === "overview" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Receivables" value={lakh(receivableTotal)} note={`${receivables.length} open · sales & custom orders`} noteTone={receivables.some(r => r.overdue) ? "warning" : "muted"} icon="target" iconTone="royal" onClick={() => setView({ type: "receivables" })} />
            <KpiCard label="Payables" value={lakh(payableTotal)} note={`${payables.length} supplier bills open`} icon="building" iconTone="gold" onClick={() => setView({ type: "payables" })} />
            <KpiCard label="Cash in hand" value={formatINR(balances.Cash)} note="Opening + recorded cash movements" icon="wallet" iconTone="emerald" onClick={() => setView({ type: "transactions" })} />
            <KpiCard label="Bank balance" value={lakh(balances.Bank)} note="All non-cash methods" icon="shield" iconTone="royal" onClick={() => setView({ type: "transactions" })} />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">INVOICES</p><h2>Payment states</h2></div></div>
              <SegmentBar segments={stateSegments} />
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">EXPENSES</p><h2>{formatINR(activeExpenses.reduce((s, e) => s + e.amount, 0))} this period</h2></div>
                {pendingExpenses.length > 0 && <Badge tone="amber">{pendingExpenses.length} awaiting approval</Badge>}
              </div>
              <BarList items={expenseByCategory} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">LEDGER</p><h2>Latest transactions</h2></div>
                <button type="button" className="link-btn" onClick={() => setView({ type: "transactions" })}>View all</button>
              </div>
              <div className="feed">
                {transactions.slice(0, 5).map(t => (
                  <button key={`${t.id}-${t.reference ?? ""}`} type="button" onClick={() => setView({ type: "transactions" })}>
                    <span className={`feed-icon ${t.kind === "Receipt" ? "emerald" : t.kind === "Expense" ? "gold" : "royal"}`}><Icon name={t.kind === "Receipt" ? "check" : t.kind === "Expense" ? "wallet" : "building"} size={15} /></span>
                    <span className="feed-body">
                      <strong>{t.id} · {t.party}</strong>
                      <small>{t.method} · {t.account} · {t.date}</small>
                    </span>
                    <strong className={t.kind === "Receipt" ? "up-text" : "warning-text"}>{t.kind === "Receipt" ? "+" : "−"} {formatINR(t.amount)}</strong>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">REGISTRY</p><h2>Documents by type</h2></div>
                <button type="button" className="link-btn" onClick={() => setView({ type: "documents" })}>Open registry</button>
              </div>
              <BarList items={docTypeCounts} />
            </section>
          </div>
        </>
      )}

      {view.type === "documents" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">DOCUMENT REGISTRY</p><h2>{filteredDocs.length} documents</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search documents" aria-label="Search documents" value={docQuery} onChange={e => setDocQuery(e.target.value)} />
              </div>
              <select aria-label="Filter by document type" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
                <option>All types</option>
                {docTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <Button variant="secondary" onClick={() => setDocMode("proforma")}>Proforma</Button>
              <Button variant="secondary" onClick={() => setDocMode("credit-note")}>Credit note</Button>
              <Button variant="secondary" onClick={() => setDocMode("debit-note")}>Debit note</Button>
              <Button variant="secondary" onClick={() => setDocMode("refund-receipt")}>Refund</Button>
            </div>
          </div>
          <DataTable
            columns={docColumns}
            rows={filteredDocs}
            rowKey={d => d.id}
            pageSize={9}
            emptyState={<EmptyState icon="component" title="No matching documents" description="Adjust the search or type filter, or create a document." mini />}
          />
        </section>
      )}

      {view.type === "approvals" && (() => {
        const pending = allDocs.filter(d => d.pi?.status === "Pending Approval");
        const decided = allDocs.filter(d => d.pi && ["Approved", "Rejected", "Revised", "Superseded"].includes(d.pi.status));
        return (
          <>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">MANAGER APPROVAL QUEUE</p><h2>{pending.length} PIs awaiting decision</h2></div>
                {!can("Billing", "Approve") && <Badge tone="amber">Read-only — {activeRole} cannot approve</Badge>}
              </div>
              {pending.length === 0 ? (
                <EmptyState icon="check" title="Queue is clear" description="Submitted proforma invoices appear here for approval." mini />
              ) : (
                <div className="task-list">
                  {pending.map(d => (
                    <div key={d.id} className="task-row">
                      <div className="task-body">
                        <button type="button" className="link-btn" onClick={() => setView({ type: "doc", id: d.id })}>{d.id} · v{d.pi!.version}</button>
                        <small>{d.partyName} · {formatINR(docTotals(d.lines, d.gstPct).total)} · submitted {d.pi!.submittedAt}</small>
                        <small className="muted">{d.pi!.specifications[0]}</small>
                      </div>
                      <Badge tone={piStatusTone[d.pi!.status]}>{d.pi!.status}</Badge>
                      <Button variant="secondary" onClick={() => setView({ type: "doc", id: d.id })}>Review</Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">DECIDED</p><h2>Recent decisions</h2></div></div>
              <div className="task-list">
                {decided.slice(0, 6).map(d => (
                  <div key={d.id} className="task-row">
                    <div className="task-body">
                      <button type="button" className="link-btn" onClick={() => setView({ type: "doc", id: d.id })}>{d.id} · v{d.pi!.version}</button>
                      <small>
                        {d.partyName}
                        {d.pi!.approvedBy ? ` · ${d.pi!.status.toLowerCase()} by ${d.pi!.approvedBy} · ${d.pi!.approvedAt}` : ""}
                      </small>
                      {d.pi!.approvalRemarks && <small className="muted">“{d.pi!.approvalRemarks}”</small>}
                    </div>
                    <Badge tone={piStatusTone[d.pi!.status]}>{d.pi!.status}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
      })()}

      {view.type === "receivables" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">RECEIVABLES · OUTSTANDING</p><h2>{formatINR(receivableTotal)} to collect</h2></div>
            {receivables.some(r => r.overdue) && <Badge tone="danger">{receivables.filter(r => r.overdue).length} overdue</Badge>}
          </div>
          <DataTable
            columns={receivableColumns}
            rows={receivables}
            rowKey={r => r.id}
            pageSize={8}
            emptyState={<EmptyState icon="check" title="Nothing outstanding" description="Every order is fully collected." mini />}
          />
        </section>
      )}

      {view.type === "payables" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">PAYABLES · SUPPLIERS</p><h2>{formatINR(payableTotal)} owed</h2></div>
          </div>
          <DataTable
            columns={payableColumns}
            rows={payables}
            rowKey={r => r.po.id}
            pageSize={8}
            emptyState={<EmptyState icon="check" title="No supplier dues" description="All purchase orders are settled." mini />}
          />
        </section>
      )}

      {view.type === "expenses" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">EXPENSES</p><h2>{formatINR(activeExpenses.reduce((s, e) => s + e.amount, 0))} recorded</h2></div>
            <div className="table-actions">
              {pendingExpenses.length > 0 && <Badge tone="amber">{pendingExpenses.length} awaiting approval</Badge>}
              <Button variant="secondary" onClick={() => setExpenseOpen(true)}><Icon name="plus" /> New expense</Button>
            </div>
          </div>
          <DataTable
            columns={expenseColumns}
            rows={expenses}
            rowKey={e => e.id}
            pageSize={8}
            emptyState={<EmptyState icon="wallet" title="No expenses" description="Record the first expense for this period." mini />}
          />
        </section>
      )}

      {view.type === "tally" && <TallyHub transactions={transactions} accruals={supplierBills} />}

      {view.type === "bank" && <BankHub transactions={transactions} />}

      {view.type === "transactions" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">TRANSACTIONS · ALL ACCOUNTS</p><h2>{filteredTxns.length} entries</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search ledger" aria-label="Search transactions" value={txnQuery} onChange={e => setTxnQuery(e.target.value)} />
              </div>
              <select aria-label="Filter by type" value={txnKind} onChange={e => setTxnKind(e.target.value as typeof txnKind)}>
                <option>All</option><option>Receipt</option><option>Payment</option><option>Expense</option><option>Refund</option>
              </select>
              <select aria-label="Filter by account" value={txnAccount} onChange={e => setTxnAccount(e.target.value as typeof txnAccount)}>
                <option>All</option><option>Cash</option><option>Bank</option>
              </select>
            </div>
          </div>
          <div className="stat-chips">
            <div className="stat-chip"><span>Cash in hand</span><strong>{formatINR(balances.Cash)}</strong></div>
            <div className="stat-chip"><span>Bank balance</span><strong>{formatINR(balances.Bank)}</strong></div>
            <div className="stat-chip"><span>Money in</span><strong className="up-text">{formatINR(filteredTxns.filter(t => t.kind === "Receipt").reduce((s, t) => s + t.amount, 0))}</strong></div>
            <div className="stat-chip"><span>Money out</span><strong className="warning-text">{formatINR(filteredTxns.filter(t => t.kind !== "Receipt").reduce((s, t) => s + t.amount, 0))}</strong></div>
          </div>
          <DataTable
            columns={txnColumns}
            rows={filteredTxns}
            rowKey={t => `${t.id}-${t.reference ?? t.date}`}
            pageSize={10}
            emptyState={<EmptyState icon="search" title="No matching entries" description="Try another filter or keyword." mini />}
          />
        </section>
      )}

      {modals}
    </div>
  );
}

function expenseCategoriesWithTotals(expenses: Expense[]) {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, display: formatINR(value) }));
}
