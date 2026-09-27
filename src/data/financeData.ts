import type { BadgeTone } from "@/components/ui/Badge";
import type {
  AccountKind,
  CustomOrder,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  FinanceDoc,
  FinanceDocLine,
  FinanceDocType,
  FinanceTransaction,
  PaymentState,
  PiStatus,
  PurchaseOrder,
  RepairJob,
  ReturnCase,
  SalesOrder,
  TransactionKind,
} from "@/types";

export const docTypeTone: Record<FinanceDocType, BadgeTone> = {
  "Proforma Invoice": "neutral",
  "GST Invoice": "gold",
  "Payment Receipt": "emerald",
  "Credit Note": "amber",
  "Debit Note": "danger",
  "Refund Receipt": "royal",
};

export const paymentStateTone: Record<PaymentState, BadgeTone> = {
  Paid: "emerald",
  Partial: "amber",
  Pending: "royal",
  Overdue: "danger",
  Refunded: "neutral",
};

export const piStatusTone: Record<PiStatus, BadgeTone> = {
  Draft: "neutral",
  "Pending Approval": "amber",
  Approved: "emerald",
  Rejected: "danger",
  Revised: "royal",
  Superseded: "neutral",
};

export const standardCommercialTerms = [
  "Prices are inclusive of 18% GST.",
  "40% advance confirms the order; balance before dispatch.",
  "Delivery within 10 working days of advance realisation.",
  "Every batch ships with its lab report and batch certificate.",
  "Prices valid for 7 days from PI date.",
];

export const expenseStatusTone: Record<ExpenseStatus, BadgeTone> = {
  Recorded: "royal",
  "Pending Approval": "amber",
  Approved: "emerald",
  Rejected: "danger",
};

export const txnKindTone: Record<TransactionKind, BadgeTone> = {
  Receipt: "emerald",
  Payment: "royal",
  Expense: "amber",
  Refund: "danger",
};

export const expenseCategories: ExpenseCategory[] = [
  "Rent", "Salary", "Electricity", "Courier", "Marketing", "Packaging", "Other",
];

export const docTypes: FinanceDocType[] = [
  "Proforma Invoice", "GST Invoice", "Payment Receipt", "Credit Note", "Debit Note", "Refund Receipt",
];

/* Expenses above this need manager approval before they post to the ledger. */
export const EXPENSE_APPROVAL_LIMIT = 50000;

export const openingBalances: Record<AccountKind, number> = { Cash: 240000, Bank: 1850000 };

export const accountFor = (method: string): AccountKind => (method === "Cash" ? "Cash" : "Bank");

export const docTerms: Record<FinanceDocType, string> = {
  "Proforma Invoice": "Proforma for confirmation only — not a demand for payment. Prices inclusive of 18% GST; valid for 7 days from issue.",
  "GST Invoice": "Prices inclusive of 18% GST. Balance due before dispatch. Every batch ships with its lab report and batch certificate. E&OE.",
  "Payment Receipt": "Received with thanks. This receipt is system-generated against the referenced order and payment.",
  "Credit Note": "Adjustable against future purchases within the validity period. Not redeemable for cash.",
  "Debit Note": "Recoverable against the supplier's next bill or the balance payment on the referenced purchase order.",
  "Refund Receipt": "Refund completed to the customer's original payment method.",
};

export function docTotals(lines: FinanceDocLine[], gstPct: number) {
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = lines.reduce((s, l) => s + Math.round(l.price * l.qty * (1 - l.discountPct / 100)), 0);
  const discount = gross - total;
  const gstIncluded = Math.round((total * gstPct) / (100 + gstPct));
  return { gross, discount, total, gstIncluded };
}

/* Due dates for seeded receivables — overdue drives the Overdue payment state. */
export const receivableDue: Record<string, { due: string; overdue?: boolean }> = {
  "SO-260184": { due: "Before dispatch" },
  "SO-260181": { due: "At pickup" },
  "SO-260175": { due: "07 Mar 2026", overdue: true },
};

/* Sortable rank for the display-string dates used across the prototype. */
const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function dateRank(value: string): number {
  const v = value.trim();
  if (/^just now/i.test(v)) return 9e9;
  if (/^today/i.test(v)) return 8e9;
  if (/^yesterday/i.test(v)) return 7e9;
  const m = v.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*(?:\s+(\d{4}))?/);
  if (!m) return 0;
  const month = monthIndex.indexOf(m[2].slice(0, 3));
  const year = m[3] ? Number(m[3]) : 2026;
  return year * 10000 + (month + 1) * 100 + Number(m[1]);
}

/* ---------- Live document derivation ----------
   GST invoices, payment receipts, credit notes and refund receipts are derived
   from the module stores so billing stays a single source of truth: generate an
   invoice in Sales, record a payment anywhere, or process a refund in Quality
   and the document materialises here. */

export function invoiceDocsFromSales(orders: SalesOrder[]): FinanceDoc[] {
  return orders
    .filter(o => o.invoiceId)
    .map(o => ({
      id: o.invoiceId!,
      type: "GST Invoice" as const,
      partyKind: "Customer" as const,
      partyId: o.customerId,
      partyName: o.customerName,
      reference: o.id,
      lines: o.lines.map(l => ({ name: l.name, sku: l.sku, qty: l.qty, price: l.price, discountPct: l.discountPct })),
      gstPct: o.gstPct,
      date: o.created,
      dueDate: receivableDue[o.id]?.due ?? "Before dispatch",
      terms: docTerms["GST Invoice"],
      state: "Pending" as const,
      paid: 0,
      createdBy: o.executive,
      timeline: [{ text: `Generated from sales order ${o.id}`, time: o.created }],
    }));
}

export function invoiceDocsFromWorkshop(customOrders: CustomOrder[]): FinanceDoc[] {
  return customOrders
    .filter(o => o.finalInvoiceId)
    .map(o => ({
      id: o.finalInvoiceId!,
      type: "GST Invoice" as const,
      partyKind: "Customer" as const,
      partyId: o.customerId,
      partyName: o.customerName,
      reference: o.id,
      lines: [{ name: `Private label ${o.productType} — ${o.gemstone}`, sku: o.id, qty: 1, price: o.quotedAmount ?? o.estimatedCost, discountPct: 0 }],
      gstPct: 18,
      date: o.payments.length ? o.payments[o.payments.length - 1].date : o.deliveryDate,
      dueDate: "Settled at billing",
      terms: docTerms["GST Invoice"],
      state: "Paid" as const,
      paid: o.payments.reduce((s, p) => s + p.amount, 0),
      createdBy: "Workshop",
      timeline: [{ text: `Final bill for custom order ${o.id}`, time: o.payments.length ? o.payments[o.payments.length - 1].date : o.deliveryDate }],
    }));
}

export function receiptDocs(orders: SalesOrder[], customOrders: CustomOrder[], repairs: RepairJob[]): FinanceDoc[] {
  const receipt = (
    p: { id: string; date: string; method: string; amount: number },
    partyId: string,
    partyName: string,
    reference: string,
    against: string,
  ): FinanceDoc => ({
    id: p.id,
    type: "Payment Receipt",
    partyKind: "Customer",
    partyId,
    partyName,
    reference,
    lines: [{ name: `Payment received against ${against}`, qty: 1, price: p.amount, discountPct: 0 }],
    gstPct: 0,
    date: p.date,
    terms: docTerms["Payment Receipt"],
    state: "Paid",
    paid: p.amount,
    method: p.method,
    createdBy: "Accounts",
    timeline: [{ text: `${p.method} payment recorded against ${against}`, time: p.date }],
  });
  return [
    ...orders.flatMap(o => o.payments.map(p => receipt(p, o.customerId, o.customerName, o.id, o.invoiceId ?? o.id))),
    ...customOrders.flatMap(o => o.payments.map(p => receipt(p, o.customerId, o.customerName, o.id, o.finalInvoiceId ?? o.id))),
    ...repairs.flatMap(r => r.payments.map(p => receipt(p, r.customerId, r.customerName, r.id, r.id))),
  ];
}

export function docsFromReturns(returns: ReturnCase[]): FinanceDoc[] {
  const creditNotes: FinanceDoc[] = returns
    .filter(r => r.creditNote)
    .map(r => ({
      id: r.creditNote!.id,
      type: "Credit Note" as const,
      partyKind: "Customer" as const,
      partyId: r.customerId,
      partyName: r.customerName,
      reference: r.id,
      lines: [{ name: `${r.product} — return credit`, sku: r.sku, qty: 1, price: r.creditNote!.amount, discountPct: 0 }],
      gstPct: 0,
      date: r.creditNote!.issuedAt,
      dueDate: `Valid until ${r.creditNote!.validUntil}`,
      terms: docTerms["Credit Note"],
      state: "Pending" as const,
      paid: 0,
      createdBy: "Quality & Returns",
      timeline: [{ text: `Issued against return ${r.id}`, time: r.creditNote!.issuedAt }],
    }));
  const refunds: FinanceDoc[] = returns
    .filter(r => r.refund)
    .map(r => ({
      id: `RF-${r.id.slice(3)}`,
      type: "Refund Receipt" as const,
      partyKind: "Customer" as const,
      partyId: r.customerId,
      partyName: r.customerName,
      reference: r.id,
      lines: [{ name: `Refund — ${r.product}`, sku: r.sku, qty: 1, price: r.refund!.amount, discountPct: 0 }],
      gstPct: 0,
      date: r.refund!.completedAt,
      terms: docTerms["Refund Receipt"],
      state: "Refunded" as const,
      paid: r.refund!.amount,
      method: r.refund!.method,
      notes: `${r.refund!.reference} · approved by ${r.refund!.approvedBy}`,
      createdBy: r.refund!.approvedBy,
      timeline: [{ text: `Refund completed — ${r.refund!.reference}`, time: r.refund!.completedAt }],
    }));
  return [...creditNotes, ...refunds];
}

/* Resolve an invoice-style doc's paid/balance/state live against the sales store. */
export function resolveDoc(doc: FinanceDoc, orders: SalesOrder[]) {
  const totals = docTotals(doc.lines, doc.gstPct);
  let paid = doc.paid;
  if (doc.type === "GST Invoice" && doc.reference?.startsWith("SO-")) {
    const order = orders.find(o => o.id === doc.reference);
    if (order) paid = order.payments.reduce((s, p) => s + p.amount, 0);
  }
  const balance = totals.total - paid;
  let state: PaymentState = doc.state;
  if (doc.type === "Payment Receipt") state = "Paid";
  else if (doc.type === "Refund Receipt") state = "Refunded";
  else if (doc.type === "Proforma Invoice" || doc.type === "GST Invoice") {
    state = balance <= 0
      ? "Paid"
      : paid > 0
        ? "Partial"
        : doc.reference && receivableDue[doc.reference]?.overdue
          ? "Overdue"
          : "Pending";
  }
  return { ...totals, paid, balance, state };
}

/* ---------- Unified transactions ledger ---------- */

export function buildTransactions(args: {
  orders: SalesOrder[];
  customOrders: CustomOrder[];
  repairs: RepairJob[];
  pos: PurchaseOrder[];
  returns: ReturnCase[];
  expenses: Expense[];
  /** Authored finance docs — manual refund receipts post to the ledger from here. */
  docs?: FinanceDoc[];
}): FinanceTransaction[] {
  const { orders, customOrders, repairs, pos, returns, expenses, docs = [] } = args;
  const rows: FinanceTransaction[] = [
    ...orders.flatMap(o =>
      o.payments.map(p => ({
        id: p.id, date: p.date, kind: "Receipt" as const, account: accountFor(p.method),
        method: p.method, party: o.customerName, reference: o.id, amount: p.amount,
      })),
    ),
    ...customOrders.flatMap(o =>
      o.payments.map(p => ({
        id: p.id, date: p.date, kind: "Receipt" as const, account: accountFor(p.method),
        method: p.method, party: o.customerName, reference: o.id, amount: p.amount,
      })),
    ),
    ...repairs.flatMap(r =>
      r.payments.map(p => ({
        id: p.id, date: p.date, kind: "Receipt" as const, account: accountFor(p.method),
        method: p.method, party: r.customerName, reference: r.id, amount: p.amount,
      })),
    ),
    ...pos.flatMap(po =>
      po.payments.map(p => ({
        id: p.id, date: p.date, kind: "Payment" as const, account: accountFor(p.method),
        method: p.method, party: po.supplierName, reference: po.id, amount: p.amount,
      })),
    ),
    ...returns
      .filter(r => r.refund)
      .map(r => ({
        id: r.refund!.reference, date: r.refund!.completedAt, kind: "Refund" as const,
        account: accountFor(r.refund!.method), method: r.refund!.method,
        party: r.customerName, reference: r.id, amount: r.refund!.amount,
      })),
    ...expenses
      .filter(e => e.status === "Recorded" || e.status === "Approved")
      .map(e => ({
        id: e.id, date: e.date, kind: "Expense" as const, account: accountFor(e.method),
        method: e.method, party: e.category, amount: e.amount, note: e.description,
      })),
    ...docs
      .filter(d => d.type === "Refund Receipt" && !d.voided)
      .map(d => ({
        id: d.id, date: d.date, kind: "Refund" as const, account: accountFor(d.method ?? "Bank transfer"),
        method: d.method ?? "Bank transfer", party: d.partyName, reference: d.reference, amount: d.paid,
      })),
    /* PI-linked customer advances recorded in Accounts. */
    ...docs
      .filter(d => d.type === "Payment Receipt" && !d.voided)
      .map(d => ({
        id: d.id, date: d.date, kind: "Receipt" as const, account: accountFor(d.method ?? "Bank transfer"),
        method: d.method ?? "Bank transfer", party: d.partyName, reference: d.reference, amount: d.paid,
        note: d.txnRef ? `Ref ${d.txnRef}` : undefined,
      })),
  ];
  return rows.sort((a, b) => dateRank(b.date) - dateRank(a.date));
}

/* Supplier bills are accrual vouchers, not cash movements, so they are kept out
   of the cash book and offered to Tally separately: Dr Purchases, Cr the supplier.
   One bill per purchase order that has actually received material. */
export function purchaseVouchers(pos: PurchaseOrder[]): FinanceTransaction[] {
  return pos
    .filter(po => ["Partially Received", "Received", "Closed"].includes(po.status))
    .map(po => ({
      id: `BILL-${po.id.replace(/\D/g, "")}`,
      date: po.deliveryDate ?? po.created,
      kind: "Payment" as const,
      account: "Bank" as const,
      method: "Supplier bill",
      party: po.supplierName,
      reference: po.id,
      amount: po.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
      note: `Goods received against ${po.id}`,
    }))
    .sort((a, b) => dateRank(b.date) - dateRank(a.date));
}

export function accountBalances(transactions: FinanceTransaction[]): Record<AccountKind, number> {
  const balances: Record<AccountKind, number> = { ...openingBalances };
  for (const t of transactions) {
    balances[t.account] += t.kind === "Receipt" ? t.amount : -t.amount;
  }
  return balances;
}

/* ---------- Seeds (authored documents & expenses) ---------- */

export const seedDocs: FinanceDoc[] = [
  {
    id: "PI-2602", type: "Proforma Invoice", partyKind: "Customer",
    partyId: "cust-1041", partyName: "Vikram Sethi Stores", reference: "QT-260180",
    lines: [{ name: "Maharaja Ubtan Luxury Soap · 125 g", sku: "MS-PREM-0071", qty: 1, price: 637500, discountPct: 4 }],
    gstPct: 18, date: "05 Mar 2026", dueDate: "Valid until 12 Mar 2026",
    terms: docTerms["Proforma Invoice"], state: "Pending", paid: 0,
    notes: "Awaiting manager approval before it is shared for advance.",
    createdBy: "Rohan Iyer",
    pi: {
      status: "Pending Approval", version: 1, baseId: "PI-2602",
      specifications: [
        "Premium 125 g bars · 72 per carton",
        "Triple milled · saffron & sandal · 125 g",
        "NABL lab report for every batch",
        "Hard delivery deadline 20 March 2026",
      ],
      commercialTerms: standardCommercialTerms,
      payment: { advancePct: 40, balanceOn: "Before dispatch" },
      delivery: { mode: "FOR destination", leadTimeDays: 14, destination: "Customer warehouse", freight: "Included" },
      validUntil: "22 Mar 2026",
      submittedAt: "05 Mar, 5:15 PM",
    },
    timeline: [
      { text: "Submitted for manager approval", time: "05 Mar, 5:15 PM" },
      { text: "Proforma created from QT-260180", time: "05 Mar, 5:02 PM" },
    ],
  },
  {
    id: "PI-2601-V1", type: "Proforma Invoice", partyKind: "Customer",
    partyId: "cust-1019", partyName: "Shagun Hotels (Pooja Trivedi)", reference: "CO-26012",
    lines: [{ name: "Shagun Hotels private-label run — guest soap & handwash programme", sku: "CO-26012", qty: 1, price: 1200000, discountPct: 0 }],
    gstPct: 18, date: "27 Feb 2026", dueDate: "Superseded by version 2",
    terms: docTerms["Proforma Invoice"], state: "Pending", paid: 0,
    notes: "First estimate before the premium fragrance upgrade.",
    createdBy: "Priya Nair",
    pi: {
      status: "Superseded", version: 1, baseId: "PI-2601",
      specifications: [
        "Guest soap programme — 25 g bar, 30 ml handwash, 30 ml shampoo",
        "Triple-milled base · 25 g per bar",
        "Custom fragrance blend, embossed hotel crest",
      ],
      commercialTerms: standardCommercialTerms,
      payment: { advancePct: 40, balanceOn: "Before dispatch" },
      delivery: { mode: "FOR destination", leadTimeDays: 14, destination: "Customer warehouse", freight: "Included" },
      validUntil: "22 Mar 2026",
      submittedAt: "27 Feb, 6:05 PM",
    },
    timeline: [
      { text: "Superseded by PI-2601 (version 2)", time: "28 Feb" },
      { text: "Revision requested — customer upgraded to South Sea pearls", time: "27 Feb, 7:20 PM" },
      { text: "Submitted for manager approval", time: "27 Feb, 6:05 PM" },
    ],
  },
  {
    id: "PI-2601", type: "Proforma Invoice", partyKind: "Customer",
    partyId: "cust-1019", partyName: "Shagun Hotels (Pooja Trivedi)", reference: "CO-26012",
    lines: [{ name: "Shagun Hotels private-label run — guest soap & handwash programme", sku: "CO-26012", qty: 1, price: 1250000, discountPct: 0 }],
    gstPct: 18, date: "28 Feb 2026", dueDate: "40% advance to start production",
    terms: docTerms["Proforma Invoice"], state: "Partial", paid: 500000,
    notes: "Advance of ₹5,00,000 received against the custom order.",
    createdBy: "Priya Nair",
    txnRef: "UTR-88240117",
    pi: {
      status: "Approved", version: 2, baseId: "PI-2601", previousVersionId: "PI-2601-V1",
      specifications: [
        "Guest soap programme — 25 g bar, 30 ml handwash, 30 ml shampoo",
        "Triple-milled base · 25 g bar · 30 ml handwash · 30 ml shampoo",
        "Custom fragrance blend, foil-embossed hotel crest",
        "Reference design board set #3",
      ],
      commercialTerms: standardCommercialTerms,
      payment: { advancePct: 40, balanceOn: "Before dispatch" },
      delivery: { mode: "FOR destination", leadTimeDays: 14, destination: "Customer warehouse", freight: "Included" },
      validUntil: "22 Mar 2026",
      submittedAt: "28 Feb, 10:10 AM",
      approvedBy: "Arjun Sharma", approvedAt: "28 Feb, 11:05 AM",
      approvalRemarks: "Pearl upgrade priced correctly; margin holds. Approved for 40% advance.",
      lockedAt: "28 Feb, 11:05 AM",
    },
    timeline: [
      { text: "Advance ₹5,00,000 received — bank transfer · UTR-88240117", time: "28 Feb" },
      { text: "Approved by Arjun Sharma — version locked", time: "28 Feb, 11:05 AM" },
      { text: "Version 2 created after the fragrance upgrade", time: "28 Feb, 10:10 AM" },
    ],
  },
  {
    id: "DN-2601", type: "Debit Note", partyKind: "Supplier",
    partyId: "sup-02", partyName: "Shakti Oils & Chemicals", reference: "PO-260081",
    lines: [{ name: "Short shipment — 2 drums not received", qty: 2, price: 58000, discountPct: 0 }],
    gstPct: 0, date: "08 Mar 2026", dueDate: "Adjust in balance payment",
    terms: docTerms["Debit Note"], state: "Pending", paid: 0,
    notes: "GRN-260081 verified 22 of 24 drums. Supplier informed on call.",
    createdBy: "Arjun Sharma",
    timeline: [
      { text: "Debit note shared with supplier", time: "08 Mar, 11:20 AM" },
      { text: "Raised from GRN-260081 shortfall", time: "08 Mar, 11:05 AM" },
    ],
  },
];

export const seedExpenses: Expense[] = [
  {
    id: "EXP-2611", category: "Salary", description: "March payroll — 6 staff",
    amount: 340000, date: "01 Mar 2026", method: "Bank transfer",
    attachment: "payroll-mar26.xlsx", status: "Approved",
    recordedBy: "Kavita Shah", approvedBy: "Arjun Sharma",
  },
  {
    id: "EXP-2610", category: "Rent", description: "Vapi depot sample room rent — March",
    amount: 125000, date: "03 Mar 2026", method: "Bank transfer",
    attachment: "rent-receipt-mar.pdf", status: "Approved",
    recordedBy: "Kavita Shah", approvedBy: "Arjun Sharma",
  },
  {
    id: "EXP-2609", category: "Marketing", description: "Festive-season campaign — print & trade",
    amount: 68000, date: "07 Mar 2026", method: "Online",
    notes: "Includes the festive range catalogue shoot. Needs manager sign-off.",
    status: "Pending Approval", recordedBy: "Priya Nair",
  },
  {
    id: "EXP-2608", category: "Electricity", description: "BSES bill — February cycle",
    amount: 18400, date: "05 Mar 2026", method: "Online", status: "Recorded",
    recordedBy: "Kavita Shah",
  },
  {
    id: "EXP-2607", category: "Packaging", description: "Rigid boxes & pouches restock",
    amount: 22300, date: "04 Mar 2026", method: "UPI",
    attachment: "pkg-invoice-118.pdf", status: "Recorded", recordedBy: "Rohan Iyer",
  },
  {
    id: "EXP-2606", category: "Courier", description: "Sequel Logistics — February invoices",
    amount: 4850, date: "02 Mar 2026", method: "Cash", status: "Recorded",
    recordedBy: "Rohan Iyer",
  },
];
