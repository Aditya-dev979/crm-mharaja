import type { BadgeTone } from "@/components/ui/Badge";
import type {
  DeviationStatus,
  Grn,
  GrnDeviation,
  GrnStatus,
  POStatus,
  PRPriority,
  PRStatus,
  PurchaseOrder,
  PurchaseRequest,
  Supplier,
  SupplierQuotation,
} from "@/types";

export const prStatusTone: Record<PRStatus, BadgeTone> = {
  "Pending Approval": "amber",
  Approved: "emerald",
  Rejected: "danger",
  Ordered: "royal",
};

export const prPriorityTone: Record<PRPriority, BadgeTone> = {
  High: "danger",
  Medium: "amber",
  Low: "neutral",
};

export const poStatusTone: Record<POStatus, BadgeTone> = {
  Draft: "neutral",
  Sent: "royal",
  "Partially Received": "amber",
  Received: "emerald",
  Closed: "emerald",
  Cancelled: "neutral",
};

export const grnStatusTone: Record<GrnStatus, BadgeTone> = {
  "Material Received": "royal",
  "Under Verification": "amber",
  "Quality Inspection": "amber",
  Approved: "emerald",
  "Posted to Stock": "emerald",
  Rejected: "danger",
};

export const grnSteps: GrnStatus[] = [
  "Material Received",
  "Under Verification",
  "Quality Inspection",
  "Approved",
  "Posted to Stock",
];

export const purchaseTerms = ["50% advance, balance on inspection", "100% advance", "30 days credit", "On delivery"];

export const deviationStatusTone: Record<DeviationStatus, BadgeTone> = {
  Open: "danger",
  "Supplier Contacted": "amber",
  "Pending Manager Approval": "royal",
  Approved: "emerald",
  Rejected: "danger",
  "Partially Approved": "gold",
};

export const seedQuotationsPurchase: SupplierQuotation[] = [
  {
    id: "SQ-2601", prId: "PR-26031", supplierId: "sup-05", supplierName: "Glycerine India Pvt Ltd",
    price: 242000, terms: "50% advance, balance on inspection", deliveryDays: 10,
    transport: "Included", taxPct: 18, creditDays: 0, validUntil: "20 Mar 2026",
    remarks: "Pharma-grade glycerine, IP spec, direct from the refinery.",
    attachment: "pearlcraft-quote.pdf", received: "07 Mar 2026",
  },
  {
    id: "SQ-2602", prId: "PR-26031", supplierId: "sup-02", supplierName: "Shakti Oils & Chemicals",
    price: 255000, terms: "30 days credit", deliveryDays: 7,
    transport: "₹4,500 extra", taxPct: 18, creditDays: 30, validUntil: "18 Mar 2026",
    remarks: "Can split delivery — 2 MT immediately.",
    received: "07 Mar 2026",
  },
  {
    id: "SQ-2603", prId: "PR-26031", supplierId: "sup-01", supplierName: "Ratna Oleochemicals",
    price: 249500, terms: "On delivery", deliveryDays: 12,
    transport: "Included", taxPct: 18, creditDays: 7, validUntil: "22 Mar 2026",
    remarks: "Sourced via a partner refinery — slightly longer lead time.",
    received: "08 Mar 2026",
  },
];

export const seedDeviations: GrnDeviation[] = [
  {
    id: "DEV-2601", grnId: "GRN-260081", poId: "PO-260081",
    supplierId: "sup-02", supplierName: "Shakti Oils & Chemicals",
    item: "Rose fragrance compound · 24 drums",
    poQty: 24, receivedQty: 24, acceptedQty: 22, rejectedQty: 2,
    weightVariance: "−9.4 kg vs packing list", deviationPct: 8.3,
    reason: "2 drums fail the fragrance-strength check; lot weight short of the packing list.",
    supplierResponse: "Supplier acknowledges the shortfall on 2 drums; offers credit against the balance payment.",
    resolution: "Return 2 drums; adjust value in balance payment via DN-2601.",
    status: "Pending Manager Approval",
    created: "08 Mar 2026",
    timeline: [
      { text: "Submitted to manager for decision", time: "08 Mar, 12:10 PM" },
      { text: "Supplier response recorded — credit offered on 2 drums", time: "08 Mar, 11:40 AM" },
      { text: "Deviation communicated to Shakti Oils & Chemicals", time: "08 Mar, 11:15 AM" },
      { text: "Deviation raised from GRN-260081 — 8.3% above the 5% threshold", time: "08 Mar, 11:05 AM" },
    ],
  },
];

export function poTotals(po: Pick<PurchaseOrder, "lines" | "transport" | "taxPct">) {
  const subtotal = po.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Math.round((subtotal * po.taxPct) / 100);
  return { subtotal, tax, total: subtotal + po.transport + tax };
}

export const poPaid = (po: PurchaseOrder) => po.payments.reduce((s, p) => s + p.amount, 0);

export const seedSuppliers: Supplier[] = [
  {
    id: "sup-01", name: "Ratna Oleochemicals", contact: "Mohan Rathi", phone: "9829012234",
    email: "sales@ratnaoleo.in", city: "Jaipur", gstin: "08AABCR2210P1ZQ",
    speciality: ["Soap noodles", "Glycerin"], since: "2019", active: true,
    notes: "Primary bulk-material source. Insists on inspection before balance payment — aligned with our terms.",
  },
  {
    id: "sup-02", name: "Shakti Oils & Chemicals", contact: "Ashish Parekh", phone: "9820445511",
    email: "trade@shaktioils.in", city: "Mumbai", gstin: "27AAFCC8890M1ZT",
    speciality: ["Palm oil", "Fragrance"], since: "2021", active: true,
  },
  {
    id: "sup-03", name: "Aroma Essence India", contact: "Jignesh Shah", phone: "9825662108",
    email: "jignesh@diamtrade.in", city: "Surat", gstin: "24AAHCS3321L1ZR",
    speciality: ["Caustic soda"], since: "2020", active: true,
  },
  {
    id: "sup-04", name: "Shree Packaging Works", contact: "Ramesh Soni", phone: "9414077821",
    email: "shreepack@gmail.com", city: "Jaipur",
    speciality: ["Job work", "Private label"], since: "2018", active: true,
    notes: "Our main job-work unit for wrapping, cartoning and re-packing.",
  },
  {
    id: "sup-05", name: "Glycerine India Pvt Ltd", contact: "S. Meenakshi", phone: "9840233190",
    email: "orders@pearlcraft.in", city: "Chennai",
    speciality: ["Glycerin", "Titanium dioxide"], since: "2023", active: true,
  },
];

export const seedRequests: PurchaseRequest[] = [
  {
    id: "PR-26031", requester: "Priya Nair", items: "Glycerine (pharma grade) · IP", qty: 4,
    reason: "Handwash and dishwash demand — two live enquiries in Mumbai.",
    estimatedCost: 260000, priority: "Medium", status: "Pending Approval", date: "Today, 9:15 AM",
  },
  {
    id: "PR-26030", requester: "Rohan Iyer", items: "Coconut oil · refined bleached deodorised", qty: 5,
    reason: "Beauty soap demand outstrips stock — only one lot left after SO-260181.",
    estimatedCost: 450000, priority: "High", status: "Approved", date: "Yesterday", decidedBy: "Arjun Sharma",
  },
  {
    id: "PR-26029", requester: "Kavita Shah", items: "Neem & tulsi extract · 240 kg lot", qty: 1,
    reason: "Herbal soap pipeline for the Q1 festive season.",
    estimatedCost: 1200000, priority: "High", status: "Ordered", date: "26 Feb", decidedBy: "Arjun Sharma", poId: "PO-260092",
  },
  {
    id: "PR-26027", requester: "Arjun Sharma", items: "Premium display trays & packaging", qty: 20,
    reason: "Sample room refresh.",
    estimatedCost: 42000, priority: "Low", status: "Rejected", date: "22 Feb", decidedBy: "Arjun Sharma",
  },
];

export const seedPOs: PurchaseOrder[] = [
  {
    id: "PO-260092", supplierId: "sup-01", supplierName: "Ratna Oleochemicals",
    lines: [{ description: "Neem & tulsi extract · 240 kg lot (12 drums)", qty: 1, unitPrice: 1190000 }],
    transport: 14300, transporter: "Sequel Logistics", creditDays: 0, version: 1, approvedBy: "Arjun Sharma", approvedAt: "27 Feb, 3:58 PM", taxPct: 18, paymentTerms: "50% advance, balance on inspection",
    
    deliveryDate: "12 Mar 2026", status: "Sent", created: "27 Feb 2026", prId: "PR-26029", grnIds: [],
    payments: [{ id: "SP-2611", date: "28 Feb 2026", method: "Bank transfer", amount: 620000 }],
    timeline: [
      { text: "Advance ₹6,20,000 paid — bank transfer", time: "28 Feb" },
      { text: "PO sent to Ratna Oleochemicals", time: "27 Feb, 4:05 PM" },
      { text: "Created from request PR-26029", time: "27 Feb, 3:50 PM" },
    ],
  },
  {
    id: "PO-260081", supplierId: "sup-02", supplierName: "Shakti Oils & Chemicals",
    lines: [{ description: "Rose fragrance compound · 24 drums", qty: 24, unitPrice: 58000 }],
    transport: 18000, transporter: "BlueDart Surface", creditDays: 15, version: 1, approvedBy: "Arjun Sharma", approvedAt: "20 Feb, 2:15 PM", taxPct: 18, paymentTerms: "50% advance, balance on inspection",
    
    deliveryDate: "07 Mar 2026", status: "Partially Received", created: "20 Feb 2026", grnIds: ["GRN-260081"],
    payments: [{ id: "SP-2608", date: "21 Feb 2026", method: "Bank transfer", amount: 700000 }],
    timeline: [
      { text: "GRN-260081 raised — material received", time: "07 Mar, 3:25 PM" },
      { text: "Advance ₹7,00,000 paid", time: "21 Feb" },
      { text: "PO sent to Shakti Oils & Chemicals", time: "20 Feb" },
    ],
  },
  {
    id: "PO-260089", supplierId: "sup-03", supplierName: "Aroma Essence India",
    lines: [{ description: "Palm kernel oil · 5 MT", qty: 6, unitPrice: 310000 }],
    transport: 0, transporter: "Vapi Roadlines", creditDays: 30, version: 1, taxPct: 18, paymentTerms: "30 days credit",
    
    deliveryDate: "20 Mar 2026", status: "Draft", created: "05 Mar 2026", grnIds: [],
    payments: [],
    timeline: [{ text: "Draft PO created", time: "05 Mar" }],
  },
  {
    id: "PO-260075", supplierId: "sup-04", supplierName: "Shree Packaging Works",
    lines: [{ description: "Wrapping & cartoning · private-label guest soap run (job work)", qty: 1, unitPrice: 240000 }],
    transport: 0, transporter: "Local pickup", creditDays: 0, version: 1, approvedBy: "Arjun Sharma", approvedAt: "10 Feb", taxPct: 18, paymentTerms: "On delivery",
    
    deliveryDate: "28 Feb 2026", status: "Closed", created: "10 Feb 2026", grnIds: ["GRN-260075"],
    payments: [{ id: "SP-2603", date: "01 Mar 2026", method: "UPI", amount: 247200 }],
    timeline: [
      { text: "PO closed — paid in full", time: "01 Mar" },
      { text: "GRN-260075 posted to stock", time: "28 Feb" },
      { text: "PO sent to Shree Packaging Works", time: "10 Feb" },
    ],
  },
];

export const seedGrns: Grn[] = [
  {
    id: "GRN-260081", poId: "PO-260081", supplierName: "Shakti Oils & Chemicals",
    receivedDate: "07 Mar 2026", status: "Quality Inspection", inspector: "Deepak Verma",
    lines: [
      {
        description: "Rose fragrance compound · 24 drums", expectedQty: 24, receivedQty: 24,
        acceptedQty: 0, rejectedQty: 0,
        expectedWeight: "312.0 g", receivedWeight: "302.6 g",
        remarks: "2 drums flagged on fragrance strength — awaiting the inspector's verdict. Lot weighs 9.4 kg under the packing list.",
      },
    ],
    timeline: [
      { text: "Moved to quality inspection — Deepak Verma", time: "07 Mar, 4:10 PM" },
      { text: "Quantities verified against PO-260081", time: "07 Mar, 3:40 PM" },
      { text: "Material received at Vapi Plant", time: "07 Mar, 3:25 PM" },
    ],
  },
  {
    id: "GRN-260075", poId: "PO-260075", supplierName: "Shree Packaging Works",
    receivedDate: "28 Feb 2026", status: "Posted to Stock", inspector: "Meenal Joshi",
    lines: [
      {
        description: "Private-label run · packing complete", expectedQty: 1, receivedQty: 1,
        acceptedQty: 1, rejectedQty: 0, remarks: "Finish approved. Sent onward for wrapping.",
      },
    ],
    timeline: [
      { text: "Posted to stock — MS-PVTL-0012", time: "28 Feb, 5:30 PM" },
      { text: "Approved by Meenal Joshi", time: "28 Feb, 4:50 PM" },
      { text: "Material received", time: "28 Feb, 2:15 PM" },
    ],
  },
];
