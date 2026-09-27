import type { BadgeTone } from "@/components/ui/Badge";
import type { CustomOrder, CustomOrderStage, RepairJob, RepairStage } from "@/types";

export const customStages: Exclude<CustomOrderStage, "Cancelled">[] = [
  "Artwork Requirement",
  "Quotation",
  "Customer Approval",
  "Advance",
  "Work in Progress",
  "Quality Check",
  "Final Billing",
  "Delivered",
];

export const customStageTone: Record<CustomOrderStage, BadgeTone> = {
  "Artwork Requirement": "royal",
  Quotation: "gold",
  "Customer Approval": "amber",
  Advance: "gold",
  "Work in Progress": "amber",
  "Quality Check": "amber",
  "Final Billing": "royal",
  Delivered: "emerald",
  Cancelled: "neutral",
};

export const repairStages: Exclude<RepairStage, "Declined">[] = [
  "Request",
  "Inspection",
  "Estimate",
  "Customer Approval",
  "Repair Work",
  "Quality Check",
  "Ready",
  "Delivered",
];

export const repairStageTone: Record<RepairStage, BadgeTone> = {
  Request: "royal",
  Inspection: "amber",
  Estimate: "gold",
  "Customer Approval": "amber",
  "Repair Work": "amber",
  "Quality Check": "amber",
  Ready: "emerald",
  Delivered: "emerald",
  Declined: "danger",
};

/* The status line the customer sees on WhatsApp / SMS updates */
export const customerVisibleStatus: Record<RepairStage, string> = {
  Request: "We’ve received your repair request and will assess it shortly.",
  Inspection: "Your consignment is with our quality team for assessment.",
  Estimate: "Assessment done — we’re preparing your estimate.",
  "Customer Approval": "Estimate shared — waiting for your go-ahead.",
  "Repair Work": "Your consignment is being re-worked at our plant.",
  "Quality Check": "Final quality checks are in progress.",
  Ready: "Ready for collection at Vapi Plant!",
  Delivered: "Delivered — thank you for trusting Maharaja Soap.",
  Declined: "Rework declined — your consignment is ready to collect unchanged.",
};

export const workers = ["Ramesh Soni", "Imtiyaz Khan", "Lakshmi Devi", "Suresh Verma"];

export const productTypes = ["Guest Soap Programme", "Bath Soap", "Beauty Soap", "Herbal Soap", "Glycerine Soap", "Handwash", "Gift Pack", "Other"];
export const baseMaterials = ["Triple-milled base", "Milled base", "Glycerine base", "Transparent base", "Herbal base", "Liquid base"];

export const seedCustomOrders: CustomOrder[] = [
  {
    id: "CO-26012", customerId: "cust-1019", customerName: "Shagun Hotels (Pooja Trivedi)",
    productType: "Guest Soap Programme", designReference: "Hotel guest amenity set — 25 g bar, 30 ml handwash and 30 ml shampoo. Reference concept #3 from the artwork board, with foil-embossed crest and custom fragrance.",
    metal: "Triple-milled base", gemstone: "Sandalwood & vetiver fragrance", weightGrams: 25,
    dimensions: "Bar 60 × 40 × 15 mm · 30 ml bottles",
    estimatedCost: 1200000, quotedAmount: 1250000,
    deliveryDate: "20 Mar 2026",
    notes: "Hotel launch on 28 March — hard deadline. QC flagged surface pitting, refinish underway.",
    attachments: [
      { id: "co12-1", label: "Design render", tone: "gold" },
      { id: "co12-2", label: "Pack layout", tone: "diamond" },
    ],
    progress: 65, worker: "Ramesh Soni", stage: "Work in Progress",
    payments: [{ id: "RC-26120", date: "28 Feb 2026", method: "Bank transfer", amount: 500000 }],
    created: "27 Feb 2026",
    timeline: [
      { text: "Progress 65% — bars finished, bottle filling underway", time: "07 Mar" },
      { text: "Production started — Ramesh Soni", time: "01 Mar" },
      { text: "Advance ₹5,00,000 received", time: "28 Feb" },
      { text: "Design approved by customer", time: "28 Feb" },
      { text: "Quotation ₹12,50,000 shared (QT-260173)", time: "27 Feb" },
      { text: "Design requirement captured", time: "27 Feb" },
    ],
  },
  {
    id: "CO-26013", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    productType: "Herbal Soap", designReference: "Herbal gift line for the August festive window — graduated neem, tulsi and aloe bars in a sleeve pack.",
    metal: "Herbal base", gemstone: "Neem, tulsi & aloe extract",
    estimatedCost: 800000,
    deliveryDate: "01 Aug 2026",
    notes: "No rush — festive launch. Source base from the PO-260092 herbal lot after inspection.",
    attachments: [{ id: "co13-1", label: "Inspiration", tone: "emerald" }],
    progress: 0, stage: "Artwork Requirement",
    payments: [],
    created: "05 Mar 2026",
    timeline: [{ text: "Design requirement captured from customer note", time: "05 Mar" }],
  },
  {
    id: "CO-26011", customerId: "cust-1044", customerName: "Devansh Agarwal Trading",
    productType: "Bath Soap", designReference: "Institutional bath bar with the client crest embossed, deep-red wrapper accent.",
    metal: "Milled base", gemstone: "Sandal & rose fragrance", weightGrams: 100, size: "100 g bar · 144 per carton",
    estimatedCost: 300000, quotedAmount: 320000,
    deliveryDate: "25 Mar 2026",
    attachments: [{ id: "co11-1", label: "Crest artwork", tone: "gold" }],
    progress: 0, stage: "Quotation",
    payments: [],
    created: "03 Mar 2026",
    timeline: [
      { text: "Quotation ₹3,20,000 shared on WhatsApp", time: "05 Mar" },
      { text: "Crest artwork received and vectorised", time: "04 Mar" },
      { text: "Design requirement captured", time: "03 Mar" },
    ],
  },
  {
    id: "CO-26009", customerId: "cust-1051", customerName: "Meera Kapoor Distributors",
    productType: "Beauty Soap", designReference: "Reformulate the legacy rose bar into a 100 g modern-trade pack.",
    metal: "Glycerine base", gemstone: "Rose absolute (customer supplied)", weightGrams: 100,
    estimatedCost: 80000, quotedAmount: 85000,
    deliveryDate: "20 Feb 2026",
    attachments: [{ id: "co9-1", label: "Final batch", tone: "yellow-sapphire" }],
    progress: 100, worker: "Lakshmi Devi", stage: "Delivered",
    finalInvoiceId: "INV-25988",
    payments: [
      { id: "RC-25960", date: "05 Feb 2026", method: "UPI", amount: 34000 },
      { id: "RC-25981b", date: "20 Feb 2026", method: "Cash", amount: 51000 },
    ],
    created: "01 Feb 2026",
    timeline: [
      { text: "Delivered to the depot — customer delighted", time: "20 Feb" },
      { text: "Final bill INV-25988 settled", time: "20 Feb" },
      { text: "Quality check passed", time: "18 Feb" },
      { text: "Advance ₹34,000 received", time: "05 Feb" },
      { text: "Artwork requirement captured", time: "01 Feb" },
    ],
  },
];

export const seedRepairs: RepairJob[] = [
  {
    id: "RJ-26021", customerId: "cust-1041", customerName: "Vikram Sethi Stores",
    product: "Maharaja Ubtan Luxury Soap · 125 g", productId: "prd-0071", tone: "diamond",
    issue: "Re-print the batch code without disturbing the wrapper artwork.",
    photosBefore: [{ id: "rj21-b1", label: "Before · batch code v1", tone: "diamond" }],
    photosAfter: [],
    estimate: 3500, worker: "Ramesh Soni", expectedDelivery: "10 Mar 2026",
    stage: "Repair Work",
    payments: [],
    notes: [{ text: "Customer needs it before 20 March for the premium soap range order — coordinate with QT-260180.", author: "Rohan Iyer", time: "05 Mar" }],
    created: "05 Mar 2026",
    timeline: [
      { text: "With the line operator — re-wrapping and re-cartoning", time: "07 Mar" },
      { text: "Estimate ₹3,500 approved by customer", time: "05 Mar" },
      { text: "Rework request logged", time: "05 Mar" },
    ],
  },
  {
    id: "RJ-26022", customerId: "cust-1008", customerName: "Kabir Malhotra",
    product: "Maharaja Neem Herbal Soap · 100 g", productId: "prd-0318", tone: "emerald",
    issue: "Carton seams splitting in transit — needs a heavier shipper and re-packing.",
    photosBefore: [{ id: "rj22-b1", label: "Split carton seam", tone: "emerald" }],
    photosAfter: [],
    expectedDelivery: "To be confirmed",
    stage: "Request",
    payments: [],
    notes: [],
    created: "Today, 9:50 AM",
    timeline: [{ text: "Rework request logged at the Vapi plant", time: "Today, 9:50 AM" }],
  },
  {
    id: "RJ-26020", customerId: "cust-1029", customerName: "Sanya Oberoi Retail",
    product: "Maharaja Lemon Dishwash Bar · 200 g", productId: "prd-0031", tone: "pearl",
    issue: "Wrapper seal weakened — cartons open in transit.",
    photosBefore: [{ id: "rj20-b1", label: "Seal detail", tone: "pearl" }],
    photosAfter: [],
    estimate: 4200, expectedDelivery: "14 Mar 2026",
    stage: "Customer Approval",
    payments: [],
    notes: [],
    created: "06 Mar 2026",
    timeline: [
      { text: "Estimate ₹4,200 shared on WhatsApp", time: "07 Mar" },
      { text: "Assessed — wrapper seal setting needs correction", time: "06 Mar" },
      { text: "Rework request logged", time: "06 Mar" },
    ],
  },
  {
    id: "RJ-26019", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    product: "Premium 125 g bar · re-wrap", tone: "gold",
    issue: "Re-wrap and re-carton after the artwork revision.",
    photosBefore: [{ id: "rj19-b1", label: "Before", tone: "gold" }],
    photosAfter: [{ id: "rj19-a1", label: "After · re-wrapped", tone: "gold" }],
    estimate: 3500, worker: "Imtiyaz Khan", expectedDelivery: "12 Jan 2026",
    stage: "Delivered",
    payments: [{ id: "RC-25920", date: "12 Jan 2026", method: "UPI", amount: 3500 }],
    notes: [],
    created: "08 Jan 2026",
    timeline: [
      { text: "Delivered · charge ₹3,500 collected", time: "12 Jan" },
      { text: "Quality check passed — after photos added", time: "11 Jan" },
      { text: "Estimate approved", time: "09 Jan" },
      { text: "Rework request logged", time: "08 Jan" },
    ],
  },
];
