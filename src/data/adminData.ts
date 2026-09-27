import type { LoginEvent, LoginSession, PermissionKey, RolePermissionMatrix, SettingsSection, StaffRole } from "@/types";

export const permissionKeys: PermissionKey[] = [
  "View", "Create", "Edit", "Delete", "Approve", "Export", "Print",
  "View Financial Data", "View Purchase Cost", "View Profit", "Manage Users",
];

/* Granting these asks for explicit confirmation. */
export const sensitivePermissions: PermissionKey[] = ["Delete", "Approve", "Manage Users", "View Financial Data", "View Profit"];

export const permissionModules = [
  "CRM", "Customers", "Products", "Quality", "Inventory", "Sales", "Purchase", "Suppliers",
  "GRN", "Returns", "Repair", "Production", "Dispatch", "Billing", "Payments", "Reports", "Accounts", "Settings",
] as const;

export type PermModule = (typeof permissionModules)[number];

/* The Addendum operational roles, reconciled with the master spec's original role list.
   Renames: Admin → System Administrator, Shop Manager → Approving Manager,
   Sales Executive → Sales Representative, Accounts → Accounts Team.
   Added: Plant Manager, Dispatch Coordinator. */
export const allRoles: StaffRole[] = [
  "System Administrator", "Approving Manager", "Sales Representative", "Purchase Manager",
  "Plant Manager", "Inventory Manager", "Accounts Team", "Dispatch Coordinator",
  "Billing Executive", "Warehouse Staff",
];

export const roleResponsibilities: Record<StaffRole, string> = {
  "System Administrator": "Users, role-based access, configuration, integrations, audit and security.",
  "Approving Manager": "Approves PI, purchase and quotation decisions, deviations, reprocessing and controlled actions.",
  "Sales Representative": "Captures leads, qualification and follow-up, quotation/order requirements, customer communication.",
  "Purchase Manager": "Purchase requests, supplier quotations and comparison, purchase orders, GRN deviation resolution, supplier communication.",
  "Plant Manager": "Factory and production activities, production stock adjustments, plant-level operational approvals.",
  "Inventory Manager": "Stock control, transfers, physical verification and warehouse locations.",
  "Accounts Team": "Invoices, payments, credit/debit notes, Tally posting and bank reconciliation.",
  "Dispatch Coordinator": "Dispatch planning, delivery challan, LR/transport tracking, dispatch communication and stock reduction.",
  "Billing Executive": "Raises bills and receipts at the counter.",
  "Warehouse Staff": "Physical goods handling and GRN assistance.",
};

const ALL = permissionKeys;
const RW: PermissionKey[] = ["View", "Create", "Edit", "Export", "Print"];
const RO: PermissionKey[] = ["View", "Print"];

const matrix = (rules: Partial<Record<(typeof permissionModules)[number], PermissionKey[]>>, fallback: PermissionKey[] = []): RolePermissionMatrix => {
  const out: RolePermissionMatrix = {};
  for (const module of permissionModules) out[module] = [...(rules[module] ?? fallback)];
  return out;
};

export const defaultRolePermissions: Record<StaffRole, RolePermissionMatrix> = {
  "System Administrator": matrix({}, ALL),
  "Approving Manager": matrix({ Settings: ["View", "Edit", "Approve", "Manage Users"] }, [
    "View", "Create", "Edit", "Delete", "Approve", "Export", "Print", "View Financial Data", "View Purchase Cost", "View Profit",
  ]),
  "Sales Representative": matrix(
    {
      CRM: [...RW, "Delete"],
      Customers: RW,
      Products: ["View", "Print", "Export"],
      Quality: ["View", "Print"],
      Sales: [...RW],
      Returns: ["View", "Create"],
      Repair: ["View", "Create"],
      Billing: ["View", "Print"],
      Dispatch: ["View"],
      Reports: ["View", "Export"],
    },
  ),
  "Purchase Manager": matrix(
    {
      Purchase: [...RW, "Approve", "View Purchase Cost"],
      Suppliers: [...RW, "View Purchase Cost"],
      GRN: [...RW, "Approve"],
      Inventory: ["View", "Export"],
      Products: ["View", "View Purchase Cost"],
      Quality: ["View", "View Purchase Cost"],
      Payments: ["View"],
      Reports: ["View", "Export", "View Purchase Cost"],
    },
  ),
  "Plant Manager": matrix(
    {
      Production: [...RW, "Approve", "Delete"],
      Inventory: [...RW, "Approve"],
      Products: ["View", "Edit"],
      Quality: ["View"],
      GRN: ["View", "Edit"],
      Returns: ["View", "Edit"],
      Repair: [...RW],
      Dispatch: ["View"],
      Reports: ["View", "Export"],
    },
  ),
  "Inventory Manager": matrix(
    {
      Inventory: [...RW, "Approve", "Delete"],
      Products: [...RW],
      Quality: [...RW],
      GRN: ["View", "Edit", "Approve"],
      Production: ["View"],
      Returns: ["View", "Edit"],
      Repair: ["View"],
      Reports: ["View", "Export"],
    },
  ),
  "Accounts Team": matrix(
    {
      Billing: [...RW, "Approve", "View Financial Data"],
      Payments: [...RW, "Approve", "View Financial Data"],
      Accounts: [...RW, "Approve", "View Financial Data", "View Profit"],
      Reports: ["View", "Export", "Print", "View Financial Data", "View Profit"],
      Sales: ["View", "View Financial Data"],
      Purchase: ["View", "View Purchase Cost"],
      Suppliers: ["View"],
    },
  ),
  "Dispatch Coordinator": matrix(
    {
      Dispatch: [...RW, "Approve"],
      Sales: ["View"],
      Customers: ["View"],
      Inventory: ["View"],
      Products: ["View"],
      Billing: ["View", "Print"],
      Reports: ["View"],
    },
  ),
  "Billing Executive": matrix(
    {
      Billing: ["View", "Create", "Print"],
      Payments: ["View", "Create", "Print"],
      Sales: ["View"],
      Customers: ["View"],
      Reports: ["View"],
    },
  ),
  "Warehouse Staff": matrix(
    {
      Inventory: ["View", "Edit"],
      GRN: ["View", "Edit"],
      Products: ["View"],
      Quality: ["View"],
      Repair: ["View"],
      Dispatch: ["View"],
    },
  ),
};

/* Maps each workspace page to the permission module that gates its visibility. */
export const pagePermissionModule: Record<string, PermModule> = {
  leads: "CRM",
  customers: "Customers",
  products: "Products",
  inventory: "Inventory",
  sales: "Sales",
  purchase: "Purchase",
  quality: "Returns",
  workshop: "Repair",
  production: "Production",
  finance: "Billing",
  dispatch: "Dispatch",
  "post-sales": "Customers",
  reports: "Reports",
  admin: "Settings",
};

export const seedLoginEvents: LoginEvent[] = [
  { id: "log-118", user: "Arjun Sharma", time: "08 Mar 2026, 9:12 AM", device: "Chrome · Windows 11", ip: "103.68.16.44", result: "Success" },
  { id: "log-117", user: "Priya Nair", time: "08 Mar 2026, 9:04 AM", device: "Chrome · Windows 11", ip: "103.68.16.41", result: "Success" },
  { id: "log-116", user: "Deepak Verma", time: "08 Mar 2026, 8:55 AM", device: "Edge · Windows 11", ip: "103.68.16.47", result: "Success" },
  { id: "log-115", user: "Rohan Iyer", time: "07 Mar 2026, 7:31 PM", device: "Safari · iPadOS", ip: "152.58.34.19", result: "Success" },
  { id: "log-114", user: "Ishita Mehra", time: "07 Mar 2026, 6:02 PM", device: "Chrome · Android", ip: "106.51.72.155", result: "Failed" },
  { id: "log-113", user: "Kavita Shah", time: "07 Mar 2026, 10:20 AM", device: "Chrome · macOS", ip: "49.36.112.8", result: "Success" },
];

export const seedSessions: LoginSession[] = [
  { id: "sess-88221", user: "Arjun Sharma", device: "Chrome · Windows 11", ip: "103.68.16.44", started: "Today, 9:12 AM", lastActive: "Just now", current: true },
  { id: "sess-88219", user: "Priya Nair", device: "Chrome · Windows 11", ip: "103.68.16.41", started: "Today, 9:04 AM", lastActive: "12 min ago" },
  { id: "sess-88216", user: "Deepak Verma", device: "Edge · Windows 11", ip: "103.68.16.47", started: "Today, 8:55 AM", lastActive: "38 min ago" },
  { id: "sess-88187", user: "Rohan Iyer", device: "Safari · iPadOS", ip: "152.58.34.19", started: "Yesterday, 7:31 PM", lastActive: "Yesterday, 9:12 PM" },
];

export const seedSettings: SettingsSection[] = [
  {
    id: "company", group: "Business", title: "Company",
    description: "Legal identity that appears on every branded document.",
    fields: [
      { key: "name", label: "Legal name", type: "text", value: "Maharaja Soap Industries Pvt. Ltd." },
      { key: "address", label: "Registered address", type: "text", value: "Plot 48, GIDC Char Rasta, Vapi 396195, Gujarat" },
      { key: "phone", label: "Phone", type: "text", value: "+91 260 242 8890" },
      { key: "email", label: "Email", type: "text", value: "care@maharajasoap.in" },
    ],
  },
  {
    id: "branch", group: "Business", title: "Branch",
    description: "Branches available in the header switcher.",
    fields: [
      { key: "primary", label: "Head office", type: "text", value: "Vapi Plant · GIDC Char Rasta" },
      { key: "secondary", label: "Regional depot", type: "text", value: "Ahmedabad Depot · Narol GIDC" },
      { key: "tertiary", label: "North depot", type: "text", value: "Delhi Depot · Okhla Phase II" },
    ],
  },
  {
    id: "warehouse", group: "Business", title: "Warehouse",
    description: "Warehouses and storage locations used by inventory.",
    fields: [
      { key: "vault", label: "Finished-goods warehouse", type: "text", value: "Warehouse A · Vapi Plant" },
      { key: "display", label: "Raw-material store", type: "text", value: "Bonded Store · Vapi Plant" },
      { key: "transit", label: "Dispatch bay", type: "text", value: "Dispatch Bay · loading dock 1–2" },
    ],
  },
  {
    id: "gst", group: "Finance", title: "GST",
    description: "Registration and rate applied to soap and personal-care sales.",
    fields: [
      { key: "gstin", label: "GSTIN", type: "text", value: "24AAKCM4021R1ZP" },
      { key: "rate", label: "Soap & personal care GST rate", type: "text", value: "18% (price-inclusive)" },
      { key: "hsn", label: "Default HSN", type: "text", value: "3401 · Soap & organic surface-active products" },
    ],
  },
  {
    id: "invoice", group: "Finance", title: "Invoice",
    description: "Numbering and footer text on GST invoices.",
    fields: [
      { key: "series", label: "Invoice series", type: "text", value: "INV-26xxx · resets each FY" },
      { key: "terms", label: "Footer terms", type: "text", value: "Balance due before dispatch. E&OE." },
      { key: "signature", label: "Show digital signature", type: "toggle", value: true },
    ],
  },
  {
    id: "tax", group: "Finance", title: "Tax",
    description: "Supplementary tax handling on the purchase side.",
    fields: [
      { key: "purchase", label: "Purchase-side GST", type: "text", value: "18% added on top of PO subtotal" },
      { key: "tcs", label: "Apply TCS above ₹50L", type: "toggle", value: true },
    ],
  },
  {
    id: "payment-methods", group: "Finance", title: "Payment Methods",
    description: "Methods accepted at billing and their ledger account.",
    fields: [
      { key: "cash", label: "Cash (Cash account)", type: "toggle", value: true },
      { key: "upi", label: "UPI (Bank account)", type: "toggle", value: true },
      { key: "bank", label: "Bank transfer", type: "toggle", value: true },
      { key: "card", label: "Card", type: "toggle", value: true },
      { key: "cheque", label: "Cheque", type: "toggle", value: true },
      { key: "online", label: "Online gateway", type: "toggle", value: true },
    ],
  },
  {
    id: "notifications", group: "Communication", title: "Notifications",
    description: "Which events raise alerts in the notification stream.",
    fields: [
      { key: "lead", label: "New lead", type: "toggle", value: true },
      { key: "order", label: "New order", type: "toggle", value: true },
      { key: "payment", label: "Payment due", type: "toggle", value: true },
      { key: "approval", label: "Approval required", type: "toggle", value: true },
      { key: "stock", label: "Low stock", type: "toggle", value: true },
      { key: "inspection", label: "Inspection required", type: "toggle", value: true },
      { key: "dispatch", label: "Dispatch due", type: "toggle", value: true },
      { key: "followup", label: "Follow-up due", type: "toggle", value: true },
    ],
  },
  {
    id: "whatsapp", group: "Communication", title: "WhatsApp",
    description: "Business account used by the communication center.",
    fields: [
      { key: "number", label: "Business number", type: "text", value: "+91 98290 00021" },
      { key: "sender", label: "Display name", type: "text", value: "Maharaja Soap" },
      { key: "auto", label: "Auto-send dispatch updates", type: "toggle", value: true },
    ],
  },
  {
    id: "email", group: "Communication", title: "Email",
    description: "Outbound identity for invoices and quotations.",
    fields: [
      { key: "from", label: "From address", type: "text", value: "care@maharajasoap.in" },
      { key: "replyTo", label: "Reply-to", type: "text", value: "sales@maharajasoap.in" },
      { key: "copy", label: "BCC accounts on invoices", type: "toggle", value: true },
    ],
  },
  {
    id: "users", group: "Access", title: "Users",
    description: "People who can sign in. Managed on the Users tab.",
    fields: [
      { key: "policy", label: "Self sign-up", type: "toggle", value: false },
      { key: "invite", label: "Invite-only onboarding", type: "toggle", value: true },
    ],
  },
  {
    id: "roles", group: "Access", title: "Roles",
    description: "Eight business roles with a module-level permission matrix.",
    fields: [
      { key: "default", label: "Default role for new users", type: "text", value: "Sales Executive" },
    ],
  },
  {
    id: "security", group: "Access", title: "Security", sensitive: true,
    description: "Sign-in protections. Changes here ask for confirmation.",
    fields: [
      { key: "otp", label: "OTP on every sign-in", type: "toggle", value: true },
      { key: "sessionTimeout", label: "Session timeout", type: "text", value: "30 minutes idle" },
      { key: "ipAllow", label: "Restrict to store networks", type: "toggle", value: false },
    ],
  },
  {
    id: "business-controls", group: "Governance", title: "Business Controls", sensitive: true,
    description: "Configurable thresholds behind the mandatory approval rules. Changes apply everywhere the rule is enforced.",
    fields: [
      { key: "purchaseDeviation", label: "Purchase deviation threshold (%)", type: "text", value: "5", helper: "Deviation within this % stays with the Purchase Manager; beyond it, an Approving Manager decides." },
      { key: "plantAdjustment", label: "Plant Manager adjustment limit (% per order)", type: "text", value: "125", helper: "Production quantity adjustments above this % of plan require Approving Manager approval." },
      { key: "minQuotations", label: "Minimum supplier quotations", type: "text", value: "5", helper: "Quotations to collect before a purchase decision, where the rule applies." },
      { key: "targetComparisons", label: "Comparison target", type: "text", value: "2", helper: "Shortlist size for final supplier comparison." },
      { key: "verificationInterval", label: "Physical stock verification interval (days)", type: "text", value: "14", helper: "Fortnightly physical verification as per the reference process." },
    ],
  },
  {
    id: "audit", group: "Governance", title: "Audit",
    description: "What the audit trail captures and how long it is kept.",
    fields: [
      { key: "retention", label: "Retention", type: "text", value: "7 years (statutory)" },
      { key: "finance", label: "Log financial actions", type: "toggle", value: true },
      { key: "stock", label: "Log stock movements", type: "toggle", value: true },
    ],
  },
  {
    id: "integrations", group: "Governance", title: "Integrations",
    description: "External systems connected to the prototype. Tally and Bank live in Accounts.",
    fields: [
      { key: "figma", label: "Figma design sync", type: "toggle", value: true },
      { key: "tally", label: "Tally accounting sync", type: "toggle", value: true },
      { key: "bank", label: "Bank transaction feed", type: "toggle", value: true },
      { key: "courier", label: "Courier tracking webhooks", type: "toggle", value: false },
    ],
  },
  {
    id: "licensing", group: "Governance", title: "Commercial & Licensing",
    description: "Commercial terms from the reference proposal — documentation only, kept out of the operational workflows.",
    fields: [
      { key: "model", label: "License model", type: "text", value: "One-time software purchase — no subscription or yearly fee" },
      { key: "hosting", label: "Hosting", type: "text", value: "Hosting cost billed transparently at actuals, payable by Maharaja Soap" },
      { key: "scope", label: "Scope", type: "text", value: "Covers the full CRM & ERP prototype scope incl. the addendum extensions" },
    ],
  },
];

export const settingsGroups = ["Business", "Finance", "Communication", "Access", "Governance"];
