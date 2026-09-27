import type { BadgeTone } from "@/components/ui/Badge";
import type {
  GatePass,
  GatePassStatus,
  StockMovement,
  StockMovementType,
  TransferRequest,
  TransferStatus,
  VerificationSession,
  VerificationStatus,
} from "@/types";

export const movementTone: Record<StockMovementType, BadgeTone> = {
  Purchase: "gold",
  GRN: "emerald",
  "Stock In": "emerald",
  Reservation: "gold",
  Sale: "royal",
  Dispatch: "royal",
  "Stock Out": "royal",
  Transfer: "neutral",
  Adjustment: "amber",
  Return: "amber",
  Inspection: "amber",
  Production: "royal",
  "Material Issue": "amber",
  "Gate Pass": "neutral",
};

export const transferTone: Record<TransferStatus, BadgeTone> = {
  "Pending Approval": "amber",
  "In Transit": "royal",
  Completed: "emerald",
  Rejected: "danger",
};

export const verificationTone: Record<VerificationStatus, BadgeTone> = {
  "In Progress": "royal",
  "Awaiting Approval": "amber",
  Adjusted: "emerald",
  Rejected: "danger",
};

/* The seeded ledger tells the full chain:
   Purchase → GRN → Stock In → Reservation → Sale → Dispatch → Stock Out */
export const seedMovements: StockMovement[] = [
  { id: "mv-114", time: "08 Mar, 10:31 AM", sku: "MS-GIFT-0088", product: "Maharaja Festive Gift Pack · 4 × 100 g", type: "Reservation", qty: -1, location: "Vapi Plant · Dispatch Bay", user: "Priya Nair", note: "Reserved against SO-260184 (Aarav Mehta Distributors)" },
  { id: "mv-113", time: "08 Mar, 10:30 AM", sku: "MS-HERB-0318", product: "Maharaja Neem & Tulsi Soap · 100 g", type: "Reservation", qty: -1, location: "Vapi Plant · FG Warehouse", user: "Priya Nair", note: "Stone reserved for SO-260184" },
  { id: "mv-112", time: "07 Mar, 6:12 PM", sku: "MS-GLYC-0320", product: "Maharaja Glycerine Soap · 75 g", type: "Dispatch", qty: -1, location: "Vapi Plant · FG Warehouse", user: "Warehouse", note: "SO-260178 via Sequel Logistics" },
  { id: "mv-111", time: "07 Mar, 3:40 PM", sku: "MS-BATH-0245", product: "Maharaja Kesar Chandan Soap · 125 g", type: "Stock In", qty: 1, location: "Vapi Plant · Bonded Store", user: "Kavita Shah", note: "Posted from GRN-260081" },
  { id: "mv-110", time: "07 Mar, 3:25 PM", sku: "GRN-260081", product: "Fragrance drums · 24 nos", type: "GRN", qty: 24, location: "Vapi Plant · Bonded Store", user: "Deepak Verma", note: "Material received against PO-260081 — moved to inspection" },
  { id: "mv-109", time: "07 Mar, 11:05 AM", sku: "MS-BATH-0058", product: "Maharaja Classic Bath Soap · 100 g", type: "Return", qty: 1, location: "Vapi Plant · Bonded Store", user: "Meenal Joshi", note: "Customer return RT-260007 — pending inspection outcome" },
  { id: "mv-108", time: "06 Mar, 5:48 PM", sku: "MS-BEAU-0510", product: "Maharaja Rose Beauty Soap · 100 g", type: "Sale", qty: -1, location: "Vapi Plant · Bonded Store", user: "Arjun Sharma", note: "Sold · SO-260181 (Meera Kapoor Distributors)" },
  { id: "mv-107", time: "05 Mar, 4:20 PM", sku: "MS-PREM-0071", product: "Maharaja Ubtan Luxury Soap · 125 g", type: "Transfer", qty: 0, location: "With contract manufacturer", user: "Arjun Sharma", note: "TR-26010 · sent for re-wrapping (artwork v2)" },
  { id: "mv-106", time: "04 Mar, 2:10 PM", sku: "MS-HERB-0155", product: "Maharaja Aloe Vera Soap · 100 g", type: "Inspection", qty: 0, location: "Vapi Plant · Bonded Store", user: "Deepak Verma", note: "Marked damaged — pavilion chip found" },
  { id: "mv-105", time: "01 Mar, 12:30 PM", sku: "MS-DISH-0031", product: "Maharaja Lemon Dishwash Bar · 200 g", type: "Adjustment", qty: 1, location: "Vapi Plant · Dispatch Bay", user: "Arjun Sharma", note: "Returned from job work" },
  { id: "mv-104", time: "27 Feb, 4:05 PM", sku: "PO-260092", product: "Herbal extract · bulk lot", type: "Purchase", qty: 12, location: "Vapi Plant · Bonded Store", user: "Kavita Shah", note: "Purchase order sent to Ratna Oleochemicals — awaiting material" },
  { id: "mv-103", time: "25 Feb, 11:15 AM", sku: "MS-PREM-0102", product: "Maharaja Saffron Luxury Soap · 100 g", type: "Stock In", qty: 1, location: "Ahmedabad Depot", user: "Kavita Shah", note: "New purchase added to catalogue" },
  { id: "mv-102", time: "22 Nov, 6:30 PM", sku: "MS-BABY-0102", product: "Maharaja Baby Care Soap · 75 g", type: "Stock Out", qty: -1, location: "Ahmedabad Depot", user: "Rohan Iyer", note: "Delivered to Nisha Reddy Enterprises · SO-259844" },
  { id: "mv-101", time: "12 Jan, 10:00 AM", sku: "MS-BATH-0524", product: "Maharaja Sandal Bath Soap · 125 g", type: "Stock In", qty: 1, location: "Vapi Plant · FG Warehouse", user: "Kavita Shah", note: "Posted from GRN-259904" },
];

export const seedTransfers: TransferRequest[] = [
  {
    id: "TR-26012", productId: "prd-0421", sku: "MS-LIQD-0421", product: "Maharaja Aloe Handwash · 250 ml",
    qty: 1, source: "Delhi Depot", destination: "Vapi Plant · FG Warehouse",
    reason: "Client viewing scheduled at Vapi Plant (Ananya Joshi Retail)",
    requestedBy: "Rohan Iyer", date: "Today, 9:40 AM", status: "Pending Approval",
  },
  {
    id: "TR-26011", productId: "prd-0031", sku: "MS-DISH-0031", product: "Maharaja Lemon Dishwash Bar · 200 g",
    qty: 1, source: "Vapi Plant · Dispatch Bay", destination: "Ahmedabad Depot",
    reason: "Stock balancing — Mumbai has two handwash enquiries",
    requestedBy: "Priya Nair", date: "Yesterday", status: "In Transit", decidedBy: "Arjun Sharma",
  },
  {
    id: "TR-26010", productId: "prd-0071", sku: "MS-PREM-0071", product: "Maharaja Ubtan Luxury Soap · 125 g",
    qty: 1, source: "Vapi Plant · FG Warehouse", destination: "With contract manufacturer",
    reason: "Re-wrapping with the v2 artwork for Vikram Sethi Stores",
    requestedBy: "Arjun Sharma", date: "05 Mar", status: "Completed", decidedBy: "Arjun Sharma",
  },
  {
    id: "TR-26009", productId: "prd-0180", sku: "MS-LAUN-0180", product: "Maharaja Detergent Bar · 250 g",
    qty: 1, source: "Vapi Plant · Dispatch Bay", destination: "Vapi Plant · Bonded Store",
    reason: "Security review of open-display sample stock",
    requestedBy: "Kavita Shah", date: "03 Mar", status: "Rejected", decidedBy: "Arjun Sharma",
  },
];

export const seedSessions: VerificationSession[] = [
  {
    id: "PV-2603", location: "Vapi Plant · Bonded Store", startedBy: "Deepak Verma",
    date: "Today, 8:30 AM", status: "Awaiting Approval",
    lines: [
      { productId: "prd-0245", sku: "MS-BATH-0245", product: "Maharaja Kesar Chandan Soap · 125 g", expected: 1, counted: 1 },
      { productId: "prd-0510", sku: "MS-BEAU-0510", product: "Maharaja Rose Beauty Soap · 100 g", expected: 0, counted: 0 },
      { productId: "prd-0058", sku: "MS-BATH-0058", product: "Maharaja Classic Bath Soap · 100 g", expected: 1, counted: 1 },
      { productId: "prd-0155", sku: "MS-HERB-0155", product: "Maharaja Aloe Vera Soap · 100 g", expected: 1, counted: 0 },
    ],
  },
  {
    id: "PV-2602", location: "Vapi Plant · Dispatch Bay", startedBy: "Meenal Joshi",
    date: "28 Feb", status: "Adjusted", approvedBy: "Arjun Sharma",
    lines: [
      { productId: "prd-0064", sku: "MS-HERB-0064", product: "Maharaja Haldi Chandan Soap · 100 g", expected: 1, counted: 1 },
      { productId: "prd-0031", sku: "MS-DISH-0031", product: "Maharaja Lemon Dishwash Bar · 200 g", expected: 2, counted: 2 },
      { productId: "prd-0180", sku: "MS-LAUN-0180", product: "Maharaja Detergent Bar · 250 g", expected: 1, counted: 1 },
    ],
  },
];

/* ---------- Addendum · Gate pass / sampling ---------- */

export const gatePassTone: Record<GatePassStatus, BadgeTone> = {
  Draft: "neutral",
  "Pending Approval": "amber",
  Approved: "emerald",
  Returned: "royal",
  Rejected: "danger",
};

export const gatePassPurposes = [
  "Customer sampling / approval",
  "Sample carton with dispatch",
  "Exhibition display",
  "Job work — external unit",
  "Photography & catalogue shoot",
  "Certification lab",
  "Repair pickup",
];

export const seedGatePasses: GatePass[] = [
  {
    id: "GP-2601", kind: "Finished Goods", item: "Maharaja Rose Beauty Soap · 100 g", sku: "MS-BEAU-0510",
    qty: 1, unit: "pcs", weight: "1.02 g",
    issuedTo: "Meera Kapoor Distributors (customer viewing, Jaipur residence)",
    purpose: "Customer sampling / approval", requestedBy: "Priya Nair",
    issuedAt: "07 Mar 2026, 4:10 PM", returnable: true, expectedReturn: "09 Mar 2026",
    noBilling: true, approvedBy: "Arjun Sharma", approvedAt: "07 Mar 2026, 4:25 PM",
    remarks: "Free of cost movement — no invoice. Insurance rider active for 48 hours.",
    status: "Approved",
    timeline: [
      { text: "Approved by Arjun Sharma — no billing, returnable by 09 Mar", time: "07 Mar, 4:25 PM" },
      { text: "Gate pass raised by Priya Nair for customer viewing", time: "07 Mar, 4:10 PM" },
    ],
  },
  {
    id: "GP-2602", kind: "Raw Material", item: "Palm kernel oil (soap noodles)", qty: 120, unit: "g", weight: "120.0 g",
    issuedTo: "Shree Packaging Works (job work)", purpose: "Job work — external unit",
    requestedBy: "Vikram Singh", issuedAt: "05 Mar 2026, 10:30 AM",
    returnable: true, expectedReturn: "18 Mar 2026", noBilling: true,
    approvedBy: "Arjun Sharma", approvedAt: "05 Mar 2026, 11:00 AM",
    remarks: "Issued against CMA-2601. Weighed out and re-weighed on return.",
    status: "Approved",
    timeline: [
      { text: "Approved by Arjun Sharma", time: "05 Mar, 11:00 AM" },
      { text: "Gate pass raised against CMA-2601", time: "05 Mar, 10:30 AM" },
    ],
  },
  {
    id: "GP-2603", kind: "Packaging", item: "Printed carton · 100-unit", qty: 12, unit: "pcs",
    issuedTo: "Vapi Plant · sample room", purpose: "Exhibition display",
    requestedBy: "Suresh Yadav", issuedAt: "08 Mar 2026, 9:40 AM",
    returnable: false, noBilling: true, status: "Pending Approval",
    remarks: "For the spring exhibition counter.",
    timeline: [{ text: "Gate pass raised by Suresh Yadav", time: "08 Mar, 9:40 AM" }],
  },
];
