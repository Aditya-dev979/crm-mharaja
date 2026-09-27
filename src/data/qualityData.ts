import type { BadgeTone } from "@/components/ui/Badge";
import type { InspectionRecord, InspectionStatus, ReturnCase, ReturnStatus } from "@/types";

export const inspectionStatusTone: Record<InspectionStatus, BadgeTone> = {
  Pending: "neutral",
  "In Review": "amber",
  Approved: "emerald",
  Rejected: "danger",
  Reinspection: "royal",
};

export const returnStatusTone: Record<ReturnStatus, BadgeTone> = {
  Requested: "royal",
  "Under Inspection": "amber",
  Approved: "emerald",
  "Stock Reconciled": "emerald",
  "Refund Processed": "emerald",
  "Credit Note Issued": "emerald",
  Rejected: "danger",
};

export const conditionOptions = ["Excellent", "Good", "Minor wear", "Needs repair", "Damaged"];

export const returnSteps = ["Requested", "Inspection", "Approved", "Stock Reconciled", "Refund / Credit Note"];

export const seedInspections: InspectionRecord[] = [
  {
    id: "QI-2610", productId: "prd-0245", sku: "MS-BATH-0245", product: "Maharaja Kesar Chandan Soap · 125 g", tone: "ruby",
    source: "GRN intake", reference: "GRN-260081", inspector: "Deepak Verma", date: "07 Mar 2026", status: "In Review",
    weight: "100 g", dimensions: "84 × 55 × 26 mm", color: "Deep rose", clarity: "Grade A",
    treatment: "Heat treated", condition: "Excellent",
    remarks: "Shade variation visible under 10x on two facets — checking face-up impact.",
    photos: [
      { id: "qi2610-1", label: "Face up", tone: "ruby" },
      { id: "qi2610-2", label: "Zoning · 10x", tone: "ruby" },
    ],
    timeline: [
      { text: "Detailed review started — Deepak Verma", time: "07 Mar, 4:15 PM" },
      { text: "Queued from GRN-260081", time: "07 Mar, 3:40 PM" },
    ],
  },
  {
    id: "QI-2609", productId: "prd-0102", sku: "MS-PREM-0102", product: "Maharaja Saffron Luxury Soap · 100 g", tone: "diamond",
    source: "Certification", reference: "SGS-40881236", date: "06 Mar 2026", status: "Pending",
    weight: "125 g", dimensions: "88 × 58 × 28 mm", color: "Ivory", clarity: "Grade A+", treatment: "No indications",
    certificate: "SGS-40881236",
    remarks: "Verify lab-report data against the batch before listing as Verified.",
    photos: [{ id: "qi2609-1", label: "Table view", tone: "diamond" }],
    timeline: [{ text: "Queued for certificate verification", time: "06 Mar, 11:00 AM" }],
  },
  {
    id: "QI-2608", productId: "prd-0058", sku: "MS-BATH-0058", product: "Maharaja Classic Bath Soap · 100 g", tone: "gold",
    source: "Sales return", reference: "RT-260007", inspector: "Meenal Joshi", date: "Yesterday", status: "Approved",
    weight: "9.6 g", dimensions: "28 × 16 mm", condition: "Good",
    remarks: "No damage or contamination. Seals intact — safe to restock after re-wrapping.",
    photos: [
      { id: "qi2608-1", label: "Front", tone: "gold" },
      { id: "qi2608-2", label: "Clasp", tone: "gold" },
    ],
    timeline: [
      { text: "Approved — item in good condition", time: "Yesterday, 5:40 PM" },
      { text: "Inspection started — Meenal Joshi", time: "Yesterday, 3:10 PM" },
      { text: "Queued from return RT-260007", time: "Yesterday, 11:05 AM" },
    ],
  },
  {
    id: "QI-2607", productId: "prd-0155", sku: "MS-HERB-0155", product: "Maharaja Aloe Vera Soap · 100 g", tone: "emerald",
    source: "GRN intake", reference: "GRN-259918", inspector: "Deepak Verma", date: "04 Mar 2026", status: "Rejected",
    weight: "75 g", dimensions: "72 × 48 × 24 mm", color: "Herbal green", clarity: "Grade B",
    treatment: "Minor oil", certificate: "IGI-39987120", condition: "Damaged",
    remarks: "Pavilion chip near the culet. Certificate measurements do not match. Hold for re-cutting estimate.",
    photos: [
      { id: "qi2607-1", label: "Chip · 20x", tone: "emerald" },
      { id: "qi2607-2", label: "Profile", tone: "emerald" },
    ],
    timeline: [
      { text: "Rejected — pavilion chip, certificate mismatch", time: "04 Mar, 2:10 PM" },
      { text: "Inspection started", time: "04 Mar, 11:30 AM" },
    ],
  },
  {
    id: "QI-2606", productId: "prd-0012", sku: "MS-PVTL-0012", product: "Shagun Hotels private-label run · guest soap batch", tone: "gold",
    source: "Custom order QC", reference: "QT-260173", inspector: "Meenal Joshi", date: "07 Mar 2026", status: "Reinspection",
    weight: "86.0 g", condition: "Needs repair",
    remarks: "Surface pitting on the embossed face. Returned to the line operator — reinspect after refinishing.",
    photos: [{ id: "qi2606-1", label: "Porosity detail", tone: "gold" }],
    timeline: [
      { text: "Sent back for refinishing — reinspection scheduled", time: "07 Mar, 6:00 PM" },
      { text: "First QC failed on finish", time: "07 Mar, 4:30 PM" },
    ],
  },
];

export const seedReturns: ReturnCase[] = [
  {
    id: "RT-260007", orderId: "SO-259702", customerId: "cust-1029", customerName: "Sanya Oberoi Retail",
    productId: "prd-0058", sku: "MS-BATH-0058", product: "Maharaja Classic Bath Soap · 100 g", tone: "gold",
    qty: 6, amount: 86500, reason: "Fragrance strength below the approved standard — customer prefers the earlier batch.",
    requested: "Yesterday", status: "Approved", inspectionId: "QI-2608",
    timeline: [
      { text: "Return approved after inspection", time: "Today, 9:20 AM" },
      { text: "Inspection QI-2608 passed — item in good condition", time: "Yesterday, 5:40 PM" },
      { text: "Sent to quality inspection", time: "Yesterday, 11:05 AM" },
      { text: "Return requested by customer", time: "Yesterday, 10:40 AM" },
    ],
  },
  {
    id: "RT-260006", orderId: "SO-259844", customerId: "cust-1032", customerName: "Nisha Reddy Enterprises",
    productId: "prd-0102e", sku: "MS-BABY-0102", product: "Maharaja Baby Care Soap · 75 g", tone: "sapphire",
    qty: 12, amount: 210000, reason: "Fragrance faded well before the printed shelf life.",
    requested: "Today, 10:05 AM", status: "Requested",
    timeline: [{ text: "Return requested on WhatsApp with photos", time: "Today, 10:05 AM" }],
  },
  {
    id: "RT-260004", orderId: "SO-259410", customerId: "cust-1041", customerName: "Vikram Sethi Stores",
    sku: "MS-PREM-0071", product: "Maharaja Ubtan Luxury Soap · 125 g", tone: "gold",
    qty: 8, amount: 124000, reason: "Requested return after 8 months, citing fragrance loss.",
    requested: "12 Feb 2026", status: "Rejected",
    timeline: [
      { text: "Return rejected — outside the 30-day window; repair offered instead", time: "14 Feb" },
      { text: "Return requested", time: "12 Feb" },
    ],
  },
  {
    id: "RT-260002", orderId: "SO-259710", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    sku: "MS-HERB-0318", product: "Maharaja Neem Herbal Soap · 100 g", tone: "emerald",
    qty: 10, amount: 185000, reason: "Wrapper artwork printed with the previous batch code.",
    requested: "18 Jan 2026", status: "Refund Processed",
    refund: { method: "Bank transfer", amount: 185000, reference: "UTR-88231045", approvedBy: "Arjun Sharma", completedAt: "24 Jan 2026" },
    timeline: [
      { text: "Refund of ₹1,85,000 completed — UTR-88231045", time: "24 Jan" },
      { text: "Refund approved by Arjun Sharma", time: "22 Jan" },
      { text: "Stock reconciled — cartons restocked after re-wrapping", time: "21 Jan" },
      { text: "Inspection passed", time: "20 Jan" },
      { text: "Return requested", time: "18 Jan" },
    ],
  },
  {
    id: "RT-260001", orderId: "SO-259688", customerId: "cust-1019", customerName: "Shagun Hotels (Pooja Trivedi)",
    sku: "MS-GIFT-0088", product: "Maharaja Festive Gift Pack · 4 × 100 g", tone: "gold",
    qty: 5, amount: 96000, reason: "Exchanged toward the private-label guest soap run order.",
    requested: "05 Jan 2026", status: "Credit Note Issued",
    creditNote: { id: "CN-26001", amount: 96000, issuedAt: "09 Jan 2026", validUntil: "09 Jul 2026" },
    timeline: [
      { text: "Credit note CN-26001 issued — applied to the next festive order", time: "09 Jan" },
      { text: "Stock reconciled", time: "08 Jan" },
      { text: "Inspection passed", time: "07 Jan" },
      { text: "Return requested for exchange", time: "05 Jan" },
    ],
  },
];
