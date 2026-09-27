import type { BadgeTone } from "@/components/ui/Badge";
import type { BankMatchState, BankTransaction, TallyEntry, TallySyncStatus } from "@/types";

export const tallyStatusTone: Record<TallySyncStatus, BadgeTone> = {
  Pending: "amber",
  Synced: "emerald",
  Failed: "danger",
  Retry: "gold",
};

export const bankMatchTone: Record<BankMatchState, BadgeTone> = {
  Matched: "emerald",
  Unmatched: "danger",
  "Partially Matched": "amber", Adjusted: "royal",
};

/* The prototype represents the accounting posting, not a live Tally connection:
   every entry carries the Dr/Cr pair a real voucher would create. Every voucher
   type resolves to a real ledger pair — nothing falls through to Suspense. */
export const ledgerFor = (voucher: TallyEntry["voucherType"], method: string) => {
  const bank = method.toLowerCase().includes("cash") ? "Cash in Hand" : "HDFC Current A/c";
  switch (voucher) {
    case "Sales": return { debit: "Sundry Debtors", credit: "Sales — Finished Goods" };
    case "Purchase": return { debit: "Purchases — Raw Materials", credit: "Sundry Creditors" };
    case "Receipt": return { debit: bank, credit: "Sundry Debtors" };
    case "Payment": return { debit: "Sundry Creditors", credit: bank };
    case "Expense": return { debit: "Indirect Expenses", credit: bank };
    case "Refund": return { debit: "Sales Returns", credit: bank };
    case "Credit Note": return { debit: "Sales Returns", credit: "Sundry Debtors" };
    case "Debit Note": return { debit: "Sundry Creditors", credit: "Purchase Returns" };
    default: return { debit: "Suspense", credit: "Suspense" };
  }
};

/** Plain-language explanation of a voucher, shown above the posting preview. */
export const voucherNarrative: Record<TallyEntry["voucherType"], string> = {
  Sales: "A sales invoice raises what the customer owes and books the revenue.",
  Purchase: "A supplier bill books the material cost and raises what we owe the supplier.",
  Receipt: "Money received from a customer increases the bank and clears part of their balance.",
  Payment: "Money paid to a supplier clears part of their balance and reduces the bank.",
  Expense: "An overhead paid from the bank is booked to indirect expenses.",
  Refund: "A refund to a customer is booked against sales returns and paid from the bank.",
  "Credit Note": "A credit note reduces what the customer owes and books the sales return.",
  "Debit Note": "A debit note reduces what we owe the supplier against a purchase return.",
  Journal: "A manual adjustment between two ledgers.",
};

export const seedTallyEntries: TallyEntry[] = [
  {
    id: "TLY-2601", transactionId: "RC-26140", voucherType: "Receipt", tallyRef: "TLY/RCPT/26/0411",
    party: "Aarav Mehta Distributors", reference: "SO-260184", amount: 200000, date: "08 Mar 2026",
    debitLedger: "HDFC Current A/c", creditLedger: "Sundry Debtors",
    status: "Synced", lastSync: "08 Mar 2026, 11:20 AM", attempts: 1,
    timeline: [{ text: "Posted to the accounting queue · attempt 1", time: "Earlier today" }, { text: "Queued from the ledger", time: "Earlier today" }],
  },
  {
    id: "TLY-2602", transactionId: "INV-26097", voucherType: "Sales", tallyRef: "TLY/SALE/26/0388",
    party: "Aarav Mehta Distributors", reference: "SO-260184", amount: 485000, date: "08 Mar 2026",
    debitLedger: "Sundry Debtors", creditLedger: "Sales — Finished Goods",
    status: "Synced", lastSync: "08 Mar 2026, 10:50 AM", attempts: 1,
    timeline: [{ text: "Posted to the accounting queue · attempt 1", time: "Earlier today" }, { text: "Queued from the ledger", time: "Earlier today" }],
  },
  {
    id: "TLY-2603", transactionId: "SP-2608", voucherType: "Payment",
    party: "Shakti Oils & Chemicals", reference: "PO-260081", amount: 700000, date: "21 Feb 2026",
    debitLedger: "Sundry Creditors", creditLedger: "HDFC Current A/c",
    status: "Failed", lastSync: "08 Mar 2026, 9:05 AM", attempts: 2,
    error: "Ledger “Shakti Oils & Chemicals” does not exist in the Tally company. Create the party ledger and retry.",
    timeline: [{ text: "Posting failed on attempt 2 — party ledger missing in the Tally company", time: "9:05 AM" }, { text: "Queued for retry · attempt 2", time: "8:40 AM" }, { text: "Posting failed on attempt 1 — party ledger missing in the Tally company", time: "Yesterday" }, { text: "Queued from the ledger", time: "Yesterday" }],
  },
  {
    id: "TLY-2604", transactionId: "CN-2602", voucherType: "Credit Note",
    party: "Nisha Reddy Enterprises", reference: "RT-260004", amount: 86500, date: "05 Mar 2026",
    debitLedger: "Sales Returns", creditLedger: "Sundry Debtors",
    status: "Pending", attempts: 0,
    timeline: [{ text: "Queued from the ledger — waiting to post", time: "Earlier today" }],
  },
  {
    id: "TLY-2605", transactionId: "ADV-2601", voucherType: "Receipt",
    party: "Rashmi Bhatia Agencies", reference: "PI-2601", amount: 244800, date: "08 Mar 2026",
    debitLedger: "HDFC Current A/c", creditLedger: "Advance from Customers",
    status: "Pending", attempts: 0,
    timeline: [{ text: "Queued from the ledger — waiting to post", time: "Earlier today" }],
  },
];

export const seedBankTransactions: BankTransaction[] = [
  {
    id: "BNK-8841", date: "08 Mar 2026", valueDate: "08 Mar 2026",
    narration: "NEFT CR AARAV MEHTA DISTRIBUTORS HDFC0000123", utr: "UTR-88240311",
    direction: "Credit", amount: 200000, balance: 4162400,
    matchState: "Matched", matchedTo: "RC-26140", matchedAmount: 200000,
  },
  {
    id: "BNK-8840", date: "08 Mar 2026", valueDate: "08 Mar 2026",
    narration: "RTGS CR RASHMI BHATIA AGENCIES ICIC0000441", utr: "UTR-88240117",
    direction: "Credit", amount: 244800, balance: 3962400,
    matchState: "Matched", matchedTo: "ADV-2601", matchedAmount: 244800,
  },
  {
    id: "BNK-8839", date: "07 Mar 2026", valueDate: "07 Mar 2026",
    narration: "IMPS CR SANYA OBEROI RETAIL 704411882299", utr: "UTR-88239902",
    direction: "Credit", amount: 50000, balance: 3717600,
    matchState: "Unmatched",
  },
  {
    id: "BNK-8838", date: "06 Mar 2026", valueDate: "06 Mar 2026",
    narration: "NEFT DR SHAKTI OILS AND CHEMICALS SBIN0004411", utr: "UTR-88238811",
    direction: "Debit", amount: 700000, balance: 3667600,
    matchState: "Partially Matched", matchedTo: "SP-2608", matchedAmount: 650000,
    remarks: "₹50,000 held back against deviation DEV-2601 — bank shows the full transfer.",
  },
  {
    id: "BNK-8837", date: "05 Mar 2026", valueDate: "05 Mar 2026",
    narration: "CHQ DR 000418 VAPI PLANT RENT", utr: "CHQ-000418",
    direction: "Debit", amount: 185000, balance: 4367600,
    matchState: "Matched", matchedTo: "EXP-2609", matchedAmount: 185000,
  },
  {
    id: "BNK-8836", date: "04 Mar 2026", valueDate: "04 Mar 2026",
    narration: "UPI CR DEVANSH AGARWAL TRADING 402299118844", utr: "UTR-88236644",
    direction: "Credit", amount: 890000, balance: 4552600,
    matchState: "Matched", matchedTo: "RC-26132", matchedAmount: 890000,
  },
  {
    id: "BNK-8835", date: "03 Mar 2026", valueDate: "03 Mar 2026",
    narration: "BANK CHARGES QTR MAINT", utr: "CHG-2603",
    direction: "Debit", amount: 1180, balance: 3662600,
    matchState: "Unmatched",
  },
];
