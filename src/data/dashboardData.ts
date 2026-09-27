import type { IconName } from "@/components/ui/Icon";
import type { BadgeTone } from "@/components/ui/Badge";

/* ---------- KPI cards ---------- */

export interface DashboardKpi {
  label: string;
  value: string;
  note: string;
  noteTone?: "muted" | "up" | "warning";
  icon: IconName;
  iconTone: "royal" | "emerald" | "gold";
  module: string;
}

export const dashboardKpis: DashboardKpi[] = [
  { label: "Today's Sales", value: "₹6,82,000", note: "↑ 12.5% vs yesterday", noteTone: "up", icon: "gem", iconTone: "royal", module: "Sales reports" },
  { label: "Monthly Sales", value: "₹1.24 Cr", note: "↑ 8.2% vs February", noteTone: "up", icon: "grid", iconTone: "royal", module: "Sales reports" },
  { label: "Total Orders", value: "342", note: "48 placed this month", icon: "component", iconTone: "royal", module: "Orders" },
  { label: "Pending Orders", value: "16", note: "4 awaiting payment", noteTone: "warning", icon: "calendar", iconTone: "gold", module: "Orders" },
  { label: "Total Customers", value: "1,286", note: "+22 this month", noteTone: "up", icon: "user", iconTone: "emerald", module: "Customers" },
  { label: "New Leads", value: "38", note: "12 unattended", noteTone: "warning", icon: "plus", iconTone: "gold", module: "CRM · Leads" },
  { label: "Outstanding Receivables", value: "₹18.6L", note: "7 invoices overdue", noteTone: "warning", icon: "arrow", iconTone: "gold", module: "Accounts · Receivables" },
  { label: "Outstanding Payables", value: "₹11.2L", note: "3 due this week", icon: "building", iconTone: "gold", module: "Accounts · Payables" },
  { label: "Inventory Value", value: "₹8.42 Cr", note: "↑ 8.4% this month", noteTone: "up", icon: "layers", iconTone: "emerald", module: "Inventory" },
  { label: "Low Stock Items", value: "9", note: "3 critical", noteTone: "warning", icon: "warning", iconTone: "gold", module: "Inventory · Low stock" },
];

export const dashboardQuickActions: Array<{ label: string; icon: IconName }> = [
  { label: "New Lead", icon: "user" },
  { label: "New Customer", icon: "user" },
  { label: "New Product", icon: "gem" },
  { label: "New Quotation", icon: "component" },
  { label: "New Order", icon: "grid" },
  { label: "New Purchase", icon: "building" },
  { label: "New Invoice", icon: "component" },
  { label: "New Payment", icon: "plus" },
];

/* ---------- Sales analytics ---------- */

export interface TrendPoint {
  label: string;
  current: number;
  previous: number;
}

export interface TrendSeries {
  points: TrendPoint[];
  delta: string;
  summary: string;
  unit: string;
}

export const salesTrends: Record<"Daily" | "Weekly" | "Monthly", TrendSeries> = {
  Daily: {
    delta: "↑ 12.5%",
    summary: "vs the previous 12 days",
    unit: "₹ lakh per day",
    points: [
      { label: "25 Feb", current: 4.2, previous: 3.9 },
      { label: "26 Feb", current: 5.1, previous: 4.2 },
      { label: "27 Feb", current: 3.8, previous: 4.1 },
      { label: "28 Feb", current: 6.4, previous: 5.2 },
      { label: "01 Mar", current: 5.6, previous: 5.0 },
      { label: "02 Mar", current: 7.2, previous: 6.1 },
      { label: "03 Mar", current: 6.1, previous: 5.8 },
      { label: "04 Mar", current: 4.9, previous: 4.4 },
      { label: "05 Mar", current: 6.8, previous: 5.9 },
      { label: "06 Mar", current: 7.9, previous: 6.3 },
      { label: "07 Mar", current: 6.2, previous: 5.7 },
      { label: "08 Mar", current: 6.8, previous: 6.1 },
    ],
  },
  Weekly: {
    delta: "↑ 6.8%",
    summary: "vs the previous 12 weeks",
    unit: "₹ lakh per week",
    points: [
      { label: "W41", current: 29.4, previous: 27.1 },
      { label: "W42", current: 32.8, previous: 30.5 },
      { label: "W43", current: 27.6, previous: 29.2 },
      { label: "W44", current: 35.1, previous: 31.8 },
      { label: "W45", current: 33.4, previous: 30.9 },
      { label: "W46", current: 38.9, previous: 34.2 },
      { label: "W47", current: 36.2, previous: 35.0 },
      { label: "W48", current: 31.7, previous: 30.1 },
      { label: "W49", current: 37.8, previous: 33.6 },
      { label: "W50", current: 41.5, previous: 36.4 },
      { label: "W51", current: 38.6, previous: 35.8 },
      { label: "W52", current: 42.3, previous: 37.9 },
    ],
  },
  Monthly: {
    delta: "↑ 8.2%",
    summary: "vs the previous financial year",
    unit: "₹ lakh per month",
    points: [
      { label: "Apr", current: 82, previous: 74 },
      { label: "May", current: 96, previous: 88 },
      { label: "Jun", current: 78, previous: 81 },
      { label: "Jul", current: 91, previous: 84 },
      { label: "Aug", current: 104, previous: 92 },
      { label: "Sep", current: 99, previous: 95 },
      { label: "Oct", current: 132, previous: 118 },
      { label: "Nov", current: 148, previous: 129 },
      { label: "Dec", current: 121, previous: 112 },
      { label: "Jan", current: 108, previous: 101 },
      { label: "Feb", current: 115, previous: 104 },
      { label: "Mar", current: 124, previous: 109 },
    ],
  },
};

export const categorySales: Array<{ label: string; value: number; display: string }> = [
  { label: "Beauty Soap", value: 38.4, display: "₹38.4L" },
  { label: "Premium & Luxury", value: 28.6, display: "₹28.6L" },
  { label: "Bath Soap", value: 22.1, display: "₹22.1L" },
  { label: "Baby Care", value: 19.8, display: "₹19.8L" },
  { label: "Herbal & Ayurvedic", value: 14.2, display: "₹14.2L" },
  { label: "Private Label", value: 12.8, display: "₹12.8L" },
  { label: "Festive Gift Packs", value: 9.6, display: "₹9.6L" },
  { label: "Hotel & Institutional", value: 7.4, display: "₹7.4L" },
];

/* ---------- Customer analytics ---------- */

export const customerStats: Array<{ label: string; value: string; note: string; up?: boolean }> = [
  { label: "New customers", value: "22", note: "↑ 4 vs February", up: true },
  { label: "Repeat purchase rate", value: "64%", note: "↑ 3 pts this quarter", up: true },
  { label: "VIP customers", value: "48", note: "₹62L lifetime value" },
  { label: "Lead conversion", value: "31%", note: "37 of 120 leads", up: true },
];

export const leadFunnel: Array<{ label: string; value: number; display: string }> = [
  { label: "Leads captured", value: 120, display: "120" },
  { label: "Contacted", value: 96, display: "96" },
  { label: "Quotation sent", value: 54, display: "54" },
  { label: "Converted", value: 37, display: "37" },
];

/* ---------- Inventory overview ---------- */

/* Chart palette validated with the dataviz six-checks validator (light surface). */
export const chartColors = {
  royal: "#3155d9",
  gold: "#cf9b2f",
  emerald: "#16866f",
  amber: "#d58a16",
  red: "#c84a54",
};

export const inventoryTotal = 1842;

export const inventorySegments: Array<{ label: string; value: number; color: string }> = [
  { label: "Available", value: 1408, color: chartColors.emerald },
  { label: "Reserved", value: 148, color: chartColors.gold },
  { label: "Sold · awaiting dispatch", value: 214, color: chartColors.royal },
  { label: "Under inspection", value: 63, color: chartColors.amber },
  { label: "Damaged", value: 9, color: chartColors.red },
];

export const inventoryChips: Array<{ label: string; value: string; note: string; up?: boolean }> = [
  { label: "Total products", value: "1,842", note: "+38 added this month", up: true },
  { label: "Sold this month", value: "214", note: "₹1.24 Cr realised", up: true },
  { label: "Low stock items", value: "9", note: "3 below reorder point" },
  { label: "Stock value", value: "₹8.42 Cr", note: "at purchase price" },
];

/* ---------- Activity timeline ---------- */

export interface ActivityEvent {
  icon: IconName;
  tone: "royal" | "emerald" | "gold" | "amber";
  module: string;
  text: string;
  time: string;
}

export const activityFeed: ActivityEvent[] = [
  { icon: "user", tone: "royal", module: "Leads", text: "New lead Rohit Chandra captured from Instagram enquiry", time: "12 min ago" },
  { icon: "component", tone: "gold", module: "Quotations", text: "Quotation QT-260184 approved by Arjun Sharma", time: "38 min ago" },
  { icon: "grid", tone: "royal", module: "Orders", text: "Sales order SO-260184 confirmed for Aarav Mehta Distributors", time: "1 hr ago" },
  { icon: "check", tone: "emerald", module: "Payments", text: "Payment of ₹2,00,000 received against SO-260184", time: "2 hr ago" },
  { icon: "building", tone: "gold", module: "Purchase", text: "Purchase order PO-260092 sent to Ratna Oleochemicals, Jaipur", time: "3 hr ago" },
  { icon: "layers", tone: "royal", module: "GRN", text: "GRN-260081 posted · 24 drums of fragrance compound moved to inspection", time: "5 hr ago" },
  { icon: "warning", tone: "amber", module: "Returns", text: "Return request RT-260007 raised for Classic Bath Soap · 100 g", time: "Yesterday" },
  { icon: "upload", tone: "emerald", module: "Dispatch", text: "SO-260178 dispatched via Sequel Logistics", time: "Yesterday" },
];
