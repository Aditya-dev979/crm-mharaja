import type { BadgeTone } from "@/components/ui/Badge";
import type {
  Bom,
  CmAssignment,
  CmStatus,
  ContractManufacturer,
  MaterialItem,
  MaterialKind,
  ProductionOrder,
  ProductionStatus,
  StockLot,
} from "@/types";

export const productionStatusTone: Record<ProductionStatus, BadgeTone> = {
  Planned: "neutral",
  "Material Issued": "gold",
  "In Production": "royal",
  "Quality Check": "amber",
  Completed: "emerald",
  "On Hold": "danger",
};

export const productionSteps = ["Planned", "Material Issued", "In Production", "Quality Check", "Completed"];

export const cmStatusTone: Record<CmStatus, BadgeTone> = {
  Sent: "neutral",
  Accepted: "gold",
  "In Production": "royal",
  "Partially Ready": "amber",
  "Ready to Dispatch": "emerald",
  Closed: "neutral",
};

/* Store taxonomy used by the material register. */
export const materialCategories: Record<MaterialKind, string[]> = {
  "Raw Material": ["Base oil", "Fragrance & actives", "Chemical", "Colourant", "Additive", "Preservative"],
  Packaging: ["Carton", "Wrapper", "Label & film", "Bottle & closure", "Shipper", "Pallet & strapping"],
};

export const materialUnits = ["kg", "litre", "pcs", "MT", "roll", "set"];

export const materialLocations = [
  "Vapi Plant · RM Store",
  "Vapi Plant · Fragrance Store",
  "Vapi Plant · Chemical Store",
  "Packaging store · Vapi",
  "Bonded store · Vapi",
];

/* What a contract unit can be assigned. */
export const cmCapabilities = [
  "Soap making",
  "Milling & stamping",
  "Wrapper printing",
  "Carton printing",
  "Fragrance dosing",
  "Auto-packing",
  "Label printing",
  "Shrink film",
  "Liquid filling",
  "Gift pack assembly",
];

export const plants = ["Vapi Plant · Soap Line", "Vapi Plant · Packing Hall", "Finishing unit · Vapi"];

/* ---------- Raw material & packaging ---------- */

export const seedMaterials: MaterialItem[] = [
  {
    id: "mat-01", code: "RM-PKO", name: "Palm kernel oil (soap noodles)", kind: "Raw Material",
    category: "Base oil", unit: "kg", available: 1840, reserved: 420, consumed: 2260,
    reorderLevel: 800, rate: 118, location: "Vapi Plant · RM Store",
    movements: [
      { text: "Issued to PRD-2603 · herbal soap batch", qty: -180, time: "07 Mar, 10:20 AM" },
      { text: "Received from Ratna Oleochemicals · invoice RB-8821", qty: 800, time: "04 Mar, 11:05 AM" },
      { text: "Issued to PRD-2601 · bath soap batch", qty: -240, time: "01 Mar, 9:40 AM" },
    ],
  },
  {
    id: "mat-02", code: "RM-CNO", name: "Coconut oil (refined)", kind: "Raw Material",
    category: "Base oil", unit: "kg", available: 960, reserved: 120, consumed: 1180,
    reorderLevel: 500, rate: 152, location: "Vapi Plant · RM Store",
    movements: [
      { text: "Issued to PRD-2602 · beauty soap batch", qty: -120, time: "06 Mar, 3:10 PM" },
      { text: "Received from Ratna Oleochemicals", qty: 500, time: "27 Feb, 12:15 PM" },
    ],
  },
  {
    id: "mat-03", code: "RM-HERB", name: "Neem & tulsi herbal extract", kind: "Raw Material",
    category: "Fragrance & actives", unit: "kg", available: 186, reserved: 48, consumed: 214,
    reorderLevel: 100, rate: 2150, location: "Vapi Plant · Fragrance Store",
    movements: [
      { text: "Reserved for PRD-2603", qty: -48, time: "07 Mar, 10:22 AM" },
      { text: "Posted from GRN-260079", qty: 120, time: "02 Mar, 4:30 PM" },
    ],
  },
  {
    id: "mat-04", code: "RM-FRAG", name: "Rose fragrance compound", kind: "Raw Material",
    category: "Fragrance & actives", unit: "kg", available: 240, reserved: 0, consumed: 96,
    reorderLevel: 120, rate: 1480, location: "Vapi Plant · Fragrance Store",
    movements: [{ text: "Posted from GRN-260081 under DEV-2601", qty: 22, time: "08 Mar, 12:40 PM" }],
  },
  {
    id: "mat-05", code: "RM-LYE", name: "Caustic soda lye (48%)", kind: "Raw Material",
    category: "Chemical", unit: "kg", available: 34, reserved: 4, consumed: 58,
    reorderLevel: 20, rate: 42, location: "Vapi Plant · Chemical Store",
    movements: [{ text: "Issued to PRD-2601", qty: -6, time: "01 Mar, 9:45 AM" }],
  },
  {
    id: "pkg-01", code: "PK-BOX-L", name: "Printed carton · 100-unit", kind: "Packaging",
    category: "Carton", unit: "pcs", available: 210, reserved: 24, consumed: 168,
    reorderLevel: 100, rate: 340, location: "Packaging store · Vapi",
    movements: [
      { text: "Issued to PRD-2601 · 6 cartons", qty: -6, time: "05 Mar, 6:10 PM" },
      { text: "Received from Shubh Packaging", qty: 150, time: "26 Feb, 10:00 AM" },
    ],
  },
  {
    id: "pkg-02", code: "PK-POUCH", name: "Soap wrapper · 100 g", kind: "Packaging",
    category: "Wrapper", unit: "pcs", available: 420, reserved: 40, consumed: 512,
    reorderLevel: 200, rate: 95, location: "Packaging store · Vapi",
    movements: [{ text: "Issued to dispatch DSP-2604", qty: -12, time: "06 Mar, 5:05 PM" }],
  },
  {
    id: "pkg-03", code: "PK-CERT", name: "Shrink film & batch label", kind: "Packaging",
    category: "Label & film", unit: "pcs", available: 78, reserved: 12, consumed: 244,
    reorderLevel: 150, rate: 45, location: "Packaging store · Vapi",
    movements: [{ text: "Issued with dispatch DSP-2603", qty: -18, time: "06 Mar, 5:05 PM" }],
  },
];

/* ---------- BOM / formulation ---------- */

export const seedBoms: Bom[] = [
  {
    id: "BOM-2601", product: "Maharaja Sandal Bath Soap · 125 g", sku: "MS-BATH-0524", version: 2,
    createdBy: "Vikram Singh", created: "18 Feb 2026",
    notes: "Version 2 revises lye consumption after the January batch variance.",
    lines: [
      { materialId: "mat-01", materialName: "Palm kernel oil (soap noodles)", qtyPerUnit: 240, unit: "kg" },
      { materialId: "mat-03", materialName: "Neem & tulsi herbal extract", qtyPerUnit: 24, unit: "kg" },
      { materialId: "mat-05", materialName: "Caustic soda lye (48%)", qtyPerUnit: 1, unit: "kg" },
      { materialId: "pkg-01", materialName: "Printed carton · 100-unit", qtyPerUnit: 1, unit: "pcs" },
    ],
  },
  {
    id: "BOM-2602", product: "Maharaja Rose Beauty Soap · 100 g", sku: "MS-BEAU-0510", version: 1,
    createdBy: "Vikram Singh", created: "22 Feb 2026",
    lines: [
      { materialId: "mat-02", materialName: "Coconut oil (refined)", qtyPerUnit: 12, unit: "kg" },
      { materialId: "pkg-02", materialName: "Soap wrapper · 100 g", qtyPerUnit: 1, unit: "pcs" },
      { materialId: "pkg-03", materialName: "Shrink film & batch label", qtyPerUnit: 1, unit: "pcs" },
    ],
  },
  {
    id: "BOM-2603", product: "Maharaja Ubtan Luxury Soap · 125 g", sku: "MS-PREM-0071", version: 1,
    createdBy: "Vikram Singh", created: "04 Mar 2026",
    lines: [
      { materialId: "mat-01", materialName: "Palm kernel oil (soap noodles)", qtyPerUnit: 180, unit: "kg" },
      { materialId: "mat-03", materialName: "Neem & tulsi herbal extract", qtyPerUnit: 48, unit: "kg" },
      { materialId: "pkg-01", materialName: "Printed carton · 100-unit", qtyPerUnit: 1, unit: "pcs" },
    ],
  },
];

/* ---------- Production orders ---------- */

export const seedProductionOrders: ProductionOrder[] = [
  {
    id: "PRD-2601", product: "Maharaja Sandal Bath Soap · 125 g", sku: "MS-BATH-0524",
    orderId: "SO-2604", bomId: "BOM-2601",
    plannedQty: 6, producedQty: 6, rejectedQty: 0,
    plannedStart: "24 Feb 2026", plannedComplete: "05 Mar 2026",
    plant: "Vapi Plant · Soap Line", responsible: "Vikram Singh",
    status: "Completed", created: "22 Feb 2026", postedToStock: true,    batchNo: "MS/SoapLine/B2601", mfgDate: "24 Feb 2026",

    consumption: [
      { materialId: "mat-01", materialName: "Palm kernel oil (soap noodles)", unit: "kg", planned: 1440, actual: 1476, issuedLot: "MAT-01/LOT-2601" },
      { materialId: "mat-03", materialName: "Neem & tulsi herbal extract", unit: "pcs", planned: 144, actual: 144, issuedLot: "MAT-03/LOT-2601" },
      { materialId: "mat-05", materialName: "Caustic soda lye (48%)", unit: "kg", planned: 6, actual: 6, issuedLot: "MAT-05/LOT-2601" },
      { materialId: "pkg-01", materialName: "Printed carton · 100-unit", unit: "pcs", planned: 6, actual: 6, issuedLot: "PKG-01/LOT-2601" },
    ],
    entries: [
      { id: "DPR-2604", date: "05 Mar 2026", produced: 2, rejected: 0, materialNote: "480 kg soap base, 48 kg herbal extract", responsible: "Vikram Singh", remarks: "Final carton check and QC clear." },
      { id: "DPR-2603", date: "03 Mar 2026", produced: 2, rejected: 0, materialNote: "486 kg soap noodles, 48 kg fragrance oil", responsible: "Vikram Singh", remarks: "6 kg extra noodles on the heavier 125 g bars." },
      { id: "DPR-2602", date: "28 Feb 2026", produced: 1, rejected: 0, materialNote: "255 kg soap noodles, 24 kg fragrance oil", responsible: "Shalini Rao" },
      { id: "DPR-2601", date: "26 Feb 2026", produced: 1, rejected: 0, materialNote: "255 kg soap noodles, 24 kg fragrance oil", responsible: "Shalini Rao" },
    ],
    timeline: [
      { text: "6 cartons posted to finished goods · lot FG-LOT-2601", time: "05 Mar, 6:30 PM" },
      { text: "Quality check cleared — Meenal Joshi", time: "05 Mar, 5:15 PM" },
      { text: "Production started at Vapi Plant · Soap Line", time: "24 Feb, 9:30 AM" },
      { text: "Material issued against BOM-2601", time: "24 Feb, 9:10 AM" },
      { text: "Production order created from SO-2604", time: "22 Feb, 4:20 PM" },
    ],
  },
  {
    id: "PRD-2602", product: "Maharaja Rose Beauty Soap · 100 g", sku: "MS-BEAU-0510",
    orderId: "SO-2607", bomId: "BOM-2602",
    plannedQty: 10, producedQty: 6, rejectedQty: 1,
    plannedStart: "04 Mar 2026", plannedComplete: "12 Mar 2026",
    plant: "Vapi Plant · Packing Hall", responsible: "Shalini Rao",
    status: "In Production", created: "02 Mar 2026",    batchNo: "MS/PackingHall/B2602", mfgDate: "02 Mar 2026",

    consumption: [
      { materialId: "mat-02", materialName: "Coconut oil (refined)", unit: "kg", planned: 120, actual: 84, issuedLot: "MAT-02/LOT-2602" },
      { materialId: "pkg-02", materialName: "Soap wrapper · 100 g", unit: "pcs", planned: 10, actual: 6, issuedLot: "PKG-02/LOT-2602" },
      { materialId: "pkg-03", materialName: "Shrink film & batch label", unit: "pcs", planned: 10, actual: 6, issuedLot: "PKG-03/LOT-2602" },
    ],
    entries: [
      { id: "DPR-2607", date: "07 Mar 2026", produced: 3, rejected: 1, materialNote: "48 kg soap noodles", responsible: "Shalini Rao", remarks: "One carton rejected — wrapper misalignment, base recovered." },
      { id: "DPR-2606", date: "06 Mar 2026", produced: 2, rejected: 0, materialNote: "24 kg soap noodles", responsible: "Shalini Rao" },
      { id: "DPR-2605", date: "05 Mar 2026", produced: 1, rejected: 0, materialNote: "12 kg soap noodles", responsible: "Vikram Singh" },
    ],
    timeline: [
      { text: "Daily report DPR-2607 — 3 produced, 1 rejected", time: "07 Mar, 6:40 PM" },
      { text: "Production started", time: "04 Mar, 9:15 AM" },
      { text: "Material issued against BOM-2602", time: "04 Mar, 8:50 AM" },
      { text: "Production order created from SO-2607", time: "02 Mar, 11:30 AM" },
    ],
  },
  {
    id: "PRD-2603", product: "Maharaja Ubtan Luxury Soap · 125 g", sku: "MS-PREM-0071",
    orderId: "SO-2609", bomId: "BOM-2603", releaseId: "REL-2603",
    plannedQty: 1, producedQty: 0, rejectedQty: 0,
    plannedStart: "09 Mar 2026", plannedComplete: "22 Mar 2026",
    plant: "Vapi Plant · Soap Line", responsible: "Vikram Singh",
    status: "Material Issued", created: "07 Mar 2026",    batchNo: "MS/SoapLine/B2603", mfgDate: "07 Mar 2026",

    consumption: [
      { materialId: "mat-01", materialName: "Palm kernel oil (soap noodles)", unit: "kg", planned: 180, actual: 0, issuedLot: "MAT-01/LOT-2603" },
      { materialId: "mat-03", materialName: "Neem & tulsi herbal extract", unit: "pcs", planned: 48, actual: 0, issuedLot: "MAT-03/LOT-2603" },
      { materialId: "pkg-01", materialName: "Printed carton · 100-unit", unit: "pcs", planned: 1, actual: 0, issuedLot: "PKG-01/LOT-2603" },
    ],
    entries: [],
    timeline: [
      { text: "Material issued against BOM-2603 — 180 kg soap noodles, 48 kg herbal extract reserved", time: "07 Mar, 10:20 AM" },
      { text: "Released to Owned Factory by Arjun Sharma", time: "07 Mar, 10:05 AM" },
      { text: "Production order created from SO-2609", time: "07 Mar, 9:50 AM" },
    ],
  },
];

/* ---------- FIFO finished-goods lots ---------- */

export const seedStockLots: StockLot[] = [
  {
    id: "FG-LOT-2598", sku: "MS-HERB-0318", product: "Herbal Neem Soap 100 g",
    qty: 4, remaining: 1, rate: 286000, receivedDate: "12 Jan 2026", dateRank: 20260112,
    source: "GRN-260062", location: "Vapi Plant · Bonded Store",
  },
  {
    id: "FG-LOT-2599", sku: "MS-HERB-0318", product: "Herbal Neem Soap 100 g",
    qty: 3, remaining: 3, rate: 291500, receivedDate: "02 Feb 2026", dateRank: 20260202,
    source: "GRN-260071", location: "Vapi Plant · Bonded Store",
  },
  {
    id: "FG-LOT-2600", sku: "MS-BEAU-0510", product: "Maharaja Rose Beauty Soap · 100 g",
    qty: 4, remaining: 2, rate: 104500, receivedDate: "20 Feb 2026", dateRank: 20260220,
    source: "PRD-2599", location: "Vapi Plant · Dispatch Bay", batchNo: "MS/PackingHall/B2599",
  },
  {
    id: "FG-LOT-2601", sku: "MS-BATH-0524", product: "Maharaja Sandal Bath Soap · 125 g",
    qty: 6, remaining: 5, rate: 1845000, receivedDate: "05 Mar 2026", dateRank: 20260305,
    source: "PRD-2601", location: "Vapi Plant · FG Warehouse", batchNo: "MS/SoapLine/B2601",
  },
];

/* ---------- Contract manufacturing ---------- */

export const seedManufacturers: ContractManufacturer[] = [
  {
    id: "cm-01", name: "Shree Packaging Works", contact: "Bhanwar Lal", phone: "9829445512",
    email: "works@shreepack.in", city: "Jaipur", speciality: ["Wrapper printing", "Carton printing"],
    since: "2018", active: true,
    notes: "Handles overflow wrapper and carton printing. Their inventory is their own — we track status and ready quantity only.",
  },
  {
    id: "cm-02", name: "Surat Precision Packing", contact: "Hiren Patel", phone: "9825567711",
    email: "ops@suratpack.in", city: "Surat", speciality: ["Fragrance dosing", "Auto-packing"],
    since: "2021", active: true,
  },
  {
    id: "cm-03", name: "Kolkata Packaging House", contact: "Anup Das", phone: "9830112244",
    email: "orders@kolkatapack.in", city: "Kolkata", speciality: ["Label printing", "Shrink film"],
    since: "2023", active: false,
    notes: "On hold — two late deliveries in December.",
  },
];

export const seedAssignments: CmAssignment[] = [
  {
    id: "CMA-2601", manufacturerId: "cm-01", manufacturerName: "Shree Packaging Works",
    orderId: "SO-2606", piId: "PI-2601", product: "Private-label guest soap · 15 g", qty: 4, readyQty: 3,
    specifications: [
      "Soap base 168 g ± 3 g per bar",
      "Wrapper film and cartons supplied by Maharaja Soap — 144 bars per carton",
      "Custom wrapper artwork in the client's brand palette",
      "Batch code and MRP printing before dispatch back to Vapi",
    ],
    sentDate: "20 Feb 2026", expectedCompletion: "14 Mar 2026", status: "Partially Ready",
    attachments: ["PI-2601-approved.pdf", "Choker-spec-sheet.pdf", "Wrapper printing-issue-note.pdf"],
    updates: [
      { text: "3 of 4 pallets ready to dispatch — 4th in wrapping", time: "07 Mar, 4:20 PM" },
      { text: "Progress photos shared on WhatsApp", time: "03 Mar, 11:10 AM" },
      { text: "Assignment accepted — wrapper film received at the Jaipur unit", time: "21 Feb, 10:05 AM" },
      { text: "Approved PI-2601 and specifications sent to Shree Packaging Works", time: "20 Feb, 5:30 PM" },
    ],
  },
  {
    id: "CMA-2602", manufacturerId: "cm-02", manufacturerName: "Surat Precision Packing",
    orderId: "SO-2608", product: "Herbal gift pack · 3 × 100 g", qty: 2, readyQty: 0,
    specifications: [
      "Glycerine base, 75 g per bar",
      "Fragrance compound supplied from stock — 12 kg per batch",
      "Triple-milled finish, shrink wrapped",
    ],
    sentDate: "05 Mar 2026", expectedCompletion: "24 Mar 2026", status: "In Production",
    attachments: ["Glycerine-bar-spec.pdf"],
    updates: [
      { text: "Bulk run complete, wrapping begins 10 Mar", time: "08 Mar, 10:40 AM" },
      { text: "Assignment accepted", time: "06 Mar, 9:20 AM" },
      { text: "Specifications and base material sent to Surat Precision Packing", time: "05 Mar, 3:15 PM" },
    ],
  },
];

/* In-universe today is 08 Mar 2026 — lot age is measured against it. */
export const TODAY_RANK = 20260308;

export const lotAgeDays = (rank: number) => {
  const y = Math.floor(rank / 10000);
  const m = Math.floor((rank % 10000) / 100);
  const d = rank % 100;
  return Math.max(0, Math.round((Date.UTC(2026, 2, 8) - Date.UTC(y, m - 1, d)) / 86400000));
};
