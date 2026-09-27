import type { IconName } from "@/components/ui/Icon";

export type PageId =
  | "dashboard"
  | "leads"
  | "customers"
  | "products"
  | "inventory"
  | "sales"
  | "purchase"
  | "quality"
  | "workshop"
  | "production"
  | "finance"
  | "dispatch"
  | "post-sales"
  | "reports"
  | "team"
  | "admin"
  | "cover"
  | "foundations"
  | "design-system"
  | "components"
  | "authentication"
  | "shell";

export interface NavItem {
  id: PageId;
  label: string;
  icon: IconName;
  badge?: string;
  /** Opens the page directly on one of its tabs, so a business function gets its
      own navigation entry without duplicating the module. */
  tab?: string;
  /** Distinguishes several entries that share a PageId. */
  key?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/* Client-facing business navigation. Every entry maps to an existing route;
   nothing here is a new or duplicate module. */
export const navGroups: NavGroup[] = [
  {
    label: "MAIN",
    items: [{ id: "dashboard", label: "Dashboard", icon: "grid" }],
  },
  {
    label: "CRM & SALES",
    items: [
      { id: "leads", label: "CRM & Leads", icon: "target" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "sales", label: "Sales & Orders", icon: "component", tab: "Orders", key: "sales-orders" },
      { id: "sales", label: "Quotations", icon: "sort", tab: "Quotations", key: "sales-quotes" },
      { id: "finance", label: "PI & Approvals", icon: "check", tab: "PI Approvals", key: "fin-pi" },
    ],
  },
  {
    label: "PROCUREMENT",
    items: [
      { id: "purchase", label: "Purchase Requests", icon: "edit", tab: "Requests", key: "pur-req" },
      { id: "purchase", label: "Supplier Quotations", icon: "sort", tab: "Quotations", key: "pur-quotes" },
      { id: "purchase", label: "Purchase Orders", icon: "building", tab: "Purchase Orders", key: "pur-po" },
      { id: "purchase", label: "Suppliers", icon: "users", tab: "Suppliers", key: "pur-sup" },
      { id: "purchase", label: "GRN & Deviations", icon: "shield", tab: "GRN", key: "pur-grn" },
    ],
  },
  {
    label: "INVENTORY",
    items: [
      { id: "products", label: "Product Catalogue", icon: "gem" },
      { id: "inventory", label: "Stock & Movements", icon: "layers", tab: "Stock", key: "inv-stock" },
      { id: "production", label: "Raw & Packaging", icon: "droplet", tab: "Materials", key: "prd-mat" },
      { id: "production", label: "Finished Goods · FIFO", icon: "grid", tab: "Finished Goods", key: "prd-fg" },
      { id: "inventory", label: "Gate Pass", icon: "send", tab: "Gate Pass", key: "inv-gp" },
      { id: "inventory", label: "Stock Verification", icon: "check", tab: "Verification", key: "inv-ver" },
    ],
  },
  {
    label: "MANUFACTURING",
    items: [
      { id: "production", label: "Production Orders", icon: "factory", tab: "Production Orders", key: "prd-orders" },
      { id: "production", label: "Formulation / BOM", icon: "component", tab: "Formulation", key: "prd-bom" },
      { id: "production", label: "Daily Production", icon: "calendar", tab: "Daily Reports", key: "prd-daily" },
      { id: "production", label: "Contract Manufacturing", icon: "building", tab: "Contract Manufacturing", key: "prd-cm" },
    ],
  },
  {
    label: "QUALITY & RETURNS",
    items: [
      { id: "quality", label: "Quality Inspections", icon: "shield", tab: "Inspections", key: "qly-insp" },
      { id: "quality", label: "Returns & Reprocessing", icon: "arrow", tab: "Returns", key: "qly-ret" },
      { id: "workshop", label: "Private Label & Job Work", icon: "settings" },
    ],
  },
  {
    label: "DISPATCH & LOGISTICS",
    items: [
      { id: "dispatch", label: "Dispatch & LR", icon: "send", tab: "Shipments", key: "dsp-ship" },
      { id: "dispatch", label: "Communication", icon: "mail", tab: "Communication", key: "dsp-comm" },
    ],
  },
  {
    label: "POST-SALES",
    items: [
      { id: "post-sales", label: "Feedback & Reviews", icon: "target", tab: "Feedback & Reviews", key: "ps-fb" },
      { id: "post-sales", label: "Support Tickets", icon: "help", tab: "Support Tickets", key: "ps-tk" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { id: "finance", label: "Accounts", icon: "wallet", tab: "Overview", key: "fin-acc" },
      { id: "finance", label: "Receivables", icon: "arrow", tab: "Receivables", key: "fin-rec" },
      { id: "finance", label: "Payables", icon: "building", tab: "Payables", key: "fin-pay" },
      { id: "finance", label: "Tally (prototype)", icon: "component", tab: "Tally", key: "fin-tally" },
      { id: "finance", label: "Bank Recon. (prototype)", icon: "shield", tab: "Bank", key: "fin-bank" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [{ id: "reports", label: "Reports", icon: "sort" }],
  },
  {
    label: "PEOPLE & CONTROL",
    items: [
      { id: "team", label: "Team & Tasks", icon: "users", tab: "Tasks", key: "tm-task" },
      { id: "team", label: "Notifications", icon: "bell", tab: "Notifications", key: "tm-notif" },
      { id: "team", label: "Audit Trail", icon: "shield", tab: "Audit Trail", key: "tm-audit" },
      { id: "admin", label: "Settings", icon: "key" },
    ],
  },
];

/** Flat list kept for permission filtering and lookups. */
export const workspaceNavItems: NavItem[] = navGroups.flatMap(g => g.items);

/* Internal design-foundation pages. They stay in the build and remain reachable
   from Settings › Governance, but never appear in the business navigation. */
export const internalNavItems: NavItem[] = [
  { id: "cover", label: "Cover", icon: "gem" },
  { id: "foundations", label: "Foundations", icon: "layers" },
  { id: "design-system", label: "Design System", icon: "settings" },
  { id: "components", label: "Components", icon: "component" },
  { id: "authentication", label: "Authentication", icon: "lock" },
  { id: "shell", label: "App Shell", icon: "grid" },
];

/** Legacy export name kept so existing imports keep working. */
export const navItems: NavItem[] = internalNavItems;

export const pageNames: Record<PageId, string> = {
  dashboard: "Operations Dashboard",
  leads: "CRM · Leads & Enquiries",
  customers: "Customers & Distributors",
  products: "Products & SKUs",
  inventory: "Inventory & Warehouse",
  sales: "Sales · Quotations & Orders",
  purchase: "Purchase · Suppliers & GRN",
  quality: "Quality · Inspection & Returns",
  workshop: "Private Label & Job Work",
  production: "Manufacturing · Plant & Contract Units",
  finance: "Accounts · Billing & Payments",
  dispatch: "Dispatch · Delivery & Transport",
  "post-sales": "Post-Sales · Feedback & Support",
  reports: "Reports · Analytics & BI",
  team: "Team · Tasks, Notifications & Audit",
  admin: "Administration · Users, Roles & Settings",
  cover: "Product Overview",
  foundations: "Brand Foundations",
  "design-system": "Design System",
  components: "Component Library",
  authentication: "Authentication",
  shell: "Application Shell",
};
