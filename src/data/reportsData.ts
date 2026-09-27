import type { BarItem } from "@/components/data-display/BarList";
import type { Segment } from "@/components/data-display/SegmentBar";
import { chartColors, type TrendPoint } from "@/data/dashboardData";
import { accountFor, buildTransactions, dateRank } from "@/data/financeData";
import { lotAgeDays } from "@/data/productionData";
import { poPaid, poTotals } from "@/data/purchaseData";
import { lineTotal, paidAmount, saleTotals } from "@/data/salesData";
import type {
  BankTransaction,
  CmAssignment,
  CustomOrder,
  Customer,
  CustomerFeedback,
  GatePass,
  GrnDeviation,
  MaterialItem,
  ProductionOrder,
  StockLot,
  SupplierQuotation,
  SupportTicket,
  TallyEntry,
  Expense,
  FinanceDoc,
  Lead,
  Product,
  PurchaseOrder,
  PurchaseRequest,
  RepairJob,
  ReturnCase,
  SalesOrder,
  StockMovement,
  Supplier,
} from "@/types";
import { formatINR } from "@/utils";

export type ReportCategory = "Sales" | "Customers" | "Inventory" | "Purchase" | "Production" | "Finance" | "Integrations" | "Post-Sales" | "Quality";

export const reportCategories: ReportCategory[] = ["Sales", "Customers", "Inventory", "Purchase", "Production", "Finance", "Integrations", "Post-Sales", "Quality"];

export interface ReportCell {
  display: string;
  sort: number | string;
}

export interface ReportRow {
  key: string;
  label: string;
  sub?: string;
  drill?: { type: "customer" | "product" | "order"; id: string };
  cells: ReportCell[];
}

export type ReportChart =
  | { kind: "bars"; items: BarItem[] }
  | { kind: "segments"; segments: Segment[] }
  | { kind: "trend"; points: TrendPoint[] }
  | null;

export interface BuiltReport {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  dated: boolean;
  entityLabel: string;
  columns: string[];
  rows: ReportRow[];
  chart: ReportChart;
  summary: Array<[string, string]>;
}

export interface ReportSources {
  leads: Lead[];
  customers: Customer[];
  products: Product[];
  movements: StockMovement[];
  orders: SalesOrder[];
  suppliers: Supplier[];
  requests: PurchaseRequest[];
  pos: PurchaseOrder[];
  returns: ReturnCase[];
  customOrders: CustomOrder[];
  repairs: RepairJob[];
  expenses: Expense[];
  financeDocs: FinanceDoc[];
}

export const dateRanges = [
  { label: "All time", min: 0 },
  { label: "This month", min: 20260301 },
  { label: "Last 90 days", min: 20251208 },
  { label: "FY 2025–26", min: 20250401 },
];

const num = (value: number, display?: string): ReportCell => ({ display: display ?? String(value), sort: value });
const inr = (value: number): ReportCell => ({ display: formatINR(value), sort: value });
const pct = (value: number): ReportCell => ({ display: `${value.toFixed(1)}%`, sort: value });
const txt = (value: string): ReportCell => ({ display: value, sort: value });

const parseINR = (value: string): number => {
  const lakh = value.match(/₹?\s*([\d.]+)\s*L/i);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);
  const digits = value.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

const monthOf = (dateStr: string): string => {
  const rank = dateRank(dateStr);
  if (rank > 1e9 || rank === 0) return "Mar 2026";
  const y = Math.floor(rank / 10000);
  const m = Math.floor((rank % 10000) / 100);
  return `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m]} ${y}`;
};

const monthRank = (label: string): number => dateRank(`01 ${label}`);

const groupSum = <T,>(items: T[], keyOf: (item: T) => string, valueOf: (item: T) => number) => {
  const map = new Map<string, { count: number; total: number }>();
  for (const item of items) {
    const key = keyOf(item);
    const entry = map.get(key) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += valueOf(item);
    map.set(key, entry);
  }
  return [...map.entries()];
};

const bars = (rows: ReportRow[], cellIndex: number, limit = 6): BarItem[] =>
  rows
    .slice()
    .sort((a, b) => Number(b.cells[cellIndex].sort) - Number(a.cells[cellIndex].sort))
    .slice(0, limit)
    .map(r => ({ label: r.label, value: Number(r.cells[cellIndex].sort), display: r.cells[cellIndex].display }));

const palette = [chartColors.royal, chartColors.emerald, chartColors.gold, chartColors.amber, chartColors.red];

const segmentsFrom = (entries: Array<[string, number]>): Segment[] =>
  entries.filter(([, v]) => v > 0).map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

export function buildReports(sources: ReportSources, rangeMin: number): BuiltReport[] {
  const inRange = (dateStr: string) => {
    const rank = dateRank(dateStr);
    return rank === 0 || rank >= rangeMin || rank > 1e9;
  };

  const { leads, customers, products, movements, orders, suppliers, requests, pos, returns, customOrders, repairs, expenses, financeDocs } = sources;

  const productById = new Map(products.map(p => [p.id, p]));
  const liveOrders = orders.filter(o => !["Cancelled", "Draft"].includes(o.status) && inRange(o.created));
  const orderValue = (o: SalesOrder) => saleTotals(o.lines, o.gstPct).total;

  const reports: BuiltReport[] = [];

  /* ================= SALES ================= */

  const dayGroups = groupSum(liveOrders, o => o.created, orderValue)
    .sort((a, b) => dateRank(a[0]) - dateRank(b[0]));
  reports.push({
    id: "sales-daily", category: "Sales", title: "Daily Sales",
    description: "Order value booked per day, across confirmed orders.",
    dated: true, entityLabel: "Day", columns: ["Orders", "Value"],
    rows: dayGroups.map(([day, g]) => ({ key: day, label: day, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "bars", items: dayGroups.slice(-6).map(([day, g]) => ({ label: day, value: g.total, display: formatINR(g.total) })) },
    summary: [["Days with sales", String(dayGroups.length)], ["Total value", formatINR(dayGroups.reduce((s, [, g]) => s + g.total, 0))]],
  });

  const monthGroups = groupSum(liveOrders, o => monthOf(o.created), orderValue)
    .sort((a, b) => monthRank(a[0]) - monthRank(b[0]));
  reports.push({
    id: "sales-monthly", category: "Sales", title: "Monthly Sales",
    description: "Order value by month with order counts.",
    dated: true, entityLabel: "Month", columns: ["Orders", "Value", "Avg order"],
    rows: monthGroups.map(([month, g]) => ({ key: month, label: month, cells: [num(g.count), inr(g.total), inr(Math.round(g.total / g.count))] })),
    chart: { kind: "bars", items: monthGroups.map(([month, g]) => ({ label: month, value: g.total, display: formatINR(g.total) })) },
    summary: [["Months", String(monthGroups.length)], ["Total value", formatINR(monthGroups.reduce((s, [, g]) => s + g.total, 0))]],
  });

  const lineRows = liveOrders.flatMap(o => o.lines.map(l => ({ order: o, line: l })));
  const productSales = groupSum(lineRows, x => x.line.name, x => lineTotal(x.line));
  reports.push({
    id: "sales-product", category: "Sales", title: "Product Sales",
    description: "Revenue per product across confirmed orders.",
    dated: true, entityLabel: "Product", columns: ["Qty", "Revenue"],
    rows: productSales.map(([name, g]) => {
      const first = lineRows.find(x => x.line.name === name);
      return {
        key: name, label: name, sub: first?.line.sku,
        drill: first ? { type: "product", id: first.line.productId } : undefined,
        cells: [num(g.count), inr(g.total)],
      };
    }),
    chart: null, summary: [["Products sold", String(productSales.length)], ["Revenue", formatINR(productSales.reduce((s, [, g]) => s + g.total, 0))]],
  });

  const categorySales = groupSum(lineRows, x => productById.get(x.line.productId)?.category ?? "Custom / Other", x => lineTotal(x.line));
  reports.push({
    id: "sales-category", category: "Sales", title: "Category Sales",
    description: "Revenue split across product categories.",
    dated: true, entityLabel: "Category", columns: ["Lines", "Revenue"],
    rows: categorySales.map(([cat, g]) => ({ key: cat, label: cat, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "segments", segments: segmentsFrom(categorySales.map(([c, g]) => [c, g.total])) },
    summary: [["Categories", String(categorySales.length)]],
  });

  const execSales = groupSum(liveOrders, o => o.executive, orderValue);
  reports.push({
    id: "sales-executive", category: "Sales", title: "Sales Executive",
    description: "Orders and value credited to each executive.",
    dated: true, entityLabel: "Executive", columns: ["Orders", "Value", "Avg order"],
    rows: execSales.map(([name, g]) => ({ key: name, label: name, cells: [num(g.count), inr(g.total), inr(Math.round(g.total / g.count))] })),
    chart: null, summary: [["Executives", String(execSales.length)]],
  });
  const execReport = reports[reports.length - 1];
  execReport.chart = { kind: "bars", items: bars(execReport.rows, 1) };

  const customerSales = groupSum(liveOrders, o => o.customerName, orderValue);
  reports.push({
    id: "sales-customer", category: "Sales", title: "Customer Sales",
    description: "Purchase value by customer for the selected period.",
    dated: true, entityLabel: "Customer", columns: ["Orders", "Value"],
    rows: customerSales.map(([name, g]) => {
      const order = liveOrders.find(o => o.customerName === name);
      return { key: name, label: name, drill: order ? { type: "customer", id: order.customerId } : undefined, cells: [num(g.count), inr(g.total)] };
    }),
    chart: null, summary: [["Buying customers", String(customerSales.length)]],
  });
  const custSalesReport = reports[reports.length - 1];
  custSalesReport.chart = { kind: "bars", items: bars(custSalesReport.rows, 1) };

  const discountRows = liveOrders
    .map(o => ({ o, totals: saleTotals(o.lines, o.gstPct) }))
    .filter(x => x.totals.discount > 0);
  reports.push({
    id: "sales-discount", category: "Sales", title: "Discount",
    description: "Discounts given per order and their share of gross value.",
    dated: true, entityLabel: "Order", columns: ["Customer", "Gross", "Discount", "Disc %"],
    rows: discountRows.map(({ o, totals }) => ({
      key: o.id, label: o.id, drill: { type: "order", id: o.id },
      cells: [txt(o.customerName), inr(totals.gross), inr(totals.discount), pct((totals.discount / totals.gross) * 100)],
    })),
    chart: null,
    summary: [["Discounted orders", String(discountRows.length)], ["Total discount", formatINR(discountRows.reduce((s, x) => s + x.totals.discount, 0))]],
  });

  const marginRows = liveOrders.map(o => {
    const revenue = orderValue(o);
    const cost = o.lines.reduce((s, l) => {
      const product = productById.get(l.productId);
      return s + (product ? product.purchasePrice * l.qty : Math.round(lineTotal(l) * 0.78));
    }, 0);
    return { o, revenue, cost, margin: revenue - cost };
  });
  reports.push({
    id: "sales-margin", category: "Sales", title: "Profit / Margin",
    description: "Revenue against purchase cost per order (estimated where cost is not on file).",
    dated: true, entityLabel: "Order", columns: ["Customer", "Revenue", "Cost", "Margin", "Margin %"],
    rows: marginRows.map(({ o, revenue, cost, margin }) => ({
      key: o.id, label: o.id, drill: { type: "order", id: o.id },
      cells: [txt(o.customerName), inr(revenue), inr(cost), inr(margin), pct(revenue ? (margin / revenue) * 100 : 0)],
    })),
    chart: null,
    summary: [
      ["Revenue", formatINR(marginRows.reduce((s, x) => s + x.revenue, 0))],
      ["Margin", formatINR(marginRows.reduce((s, x) => s + x.margin, 0))],
    ],
  });

  /* ================= CUSTOMERS ================= */

  reports.push({
    id: "cust-new", category: "Customers", title: "New Customers",
    description: "Customers who joined in 2025–26, newest first.",
    dated: false, entityLabel: "Customer", columns: ["Since", "City", "Segment", "Lifetime value"],
    rows: customers
      .filter(c => /(2025|2026|Just now)/.test(c.since))
      .map(c => ({ key: c.id, label: c.name, drill: { type: "customer", id: c.id }, cells: [txt(c.since), txt(c.city), txt(c.segment), inr(parseINR(c.ltv))] })),
    chart: null, summary: [["New this cycle", String(customers.filter(c => /(2025|2026|Just now)/.test(c.since)).length)]],
  });

  const repeat = customers.filter(c => c.totalOrders > 1);
  reports.push({
    id: "cust-repeat", category: "Customers", title: "Repeat Customers",
    description: "Customers with more than one lifetime order.",
    dated: false, entityLabel: "Customer", columns: ["Orders", "Lifetime value", "Segment"],
    rows: repeat.map(c => ({ key: c.id, label: c.name, drill: { type: "customer", id: c.id }, cells: [num(c.totalOrders), inr(parseINR(c.ltv)), txt(c.segment)] })),
    chart: null, summary: [["Repeat customers", String(repeat.length)], ["Share", `${Math.round((repeat.length / customers.length) * 100)}%`]],
  });

  const vips = customers.filter(c => c.segment === "VIP");
  reports.push({
    id: "cust-vip", category: "Customers", title: "VIP Customers",
    description: "The VIP book — value, outstanding and preferences.",
    dated: false, entityLabel: "Customer", columns: ["Lifetime value", "Outstanding", "Preferred"],
    rows: vips.map(c => ({ key: c.id, label: c.name, drill: { type: "customer", id: c.id }, cells: [inr(parseINR(c.ltv)), inr(parseINR(c.outstanding)), txt(c.preferred.join(", ") || "—")] })),
    chart: null, summary: [["VIPs", String(vips.length)], ["Combined LTV", formatINR(vips.reduce((s, c) => s + parseINR(c.ltv), 0))]],
  });

  const leadsBySource = groupSum(leads, l => l.source, () => 0).map(([source]) => {
    const all = leads.filter(l => l.source === source);
    const converted = all.filter(l => l.status === "Converted");
    return { source, total: all.length, converted: converted.length };
  });
  reports.push({
    id: "cust-conversion", category: "Customers", title: "Lead Conversion",
    description: "Lead-to-customer conversion by source.",
    dated: false, entityLabel: "Source", columns: ["Leads", "Converted", "Rate"],
    rows: leadsBySource.map(x => ({ key: x.source, label: x.source, cells: [num(x.total), num(x.converted), pct(x.total ? (x.converted / x.total) * 100 : 0)] })),
    chart: { kind: "segments", segments: segmentsFrom([["Converted", leads.filter(l => l.status === "Converted").length], ["In pipeline", leads.filter(l => !["Converted", "Lost"].includes(l.status)).length], ["Lost", leads.filter(l => l.status === "Lost").length]]) },
    summary: [["Leads", String(leads.length)], ["Overall rate", `${Math.round((leads.filter(l => l.status === "Converted").length / Math.max(leads.length, 1)) * 100)}%`]],
  });

  const clvRows = customers.slice().sort((a, b) => parseINR(b.ltv) - parseINR(a.ltv));
  reports.push({
    id: "cust-clv", category: "Customers", title: "Customer Lifetime Value",
    description: "Customers ranked by lifetime value.",
    dated: false, entityLabel: "Customer", columns: ["Lifetime value", "Orders", "Segment", "City"],
    rows: clvRows.map(c => ({ key: c.id, label: c.name, drill: { type: "customer", id: c.id }, cells: [inr(parseINR(c.ltv)), num(c.totalOrders), txt(c.segment), txt(c.city)] })),
    chart: null, summary: [["Book value", formatINR(customers.reduce((s, c) => s + parseINR(c.ltv), 0))]],
  });
  const clvReport = reports[reports.length - 1];
  clvReport.chart = { kind: "bars", items: bars(clvReport.rows, 0) };

  /* ================= INVENTORY ================= */

  reports.push({
    id: "inv-stock", category: "Inventory", title: "Stock",
    description: "Every product with its stock, location and status.",
    dated: false, entityLabel: "Product", columns: ["SKU", "Stock", "Location", "Status"],
    rows: products.map(p => ({ key: p.id, label: p.name, drill: { type: "product", id: p.id }, cells: [txt(p.sku), num(p.stock), txt(p.location), txt(p.status)] })),
    chart: null, summary: [["Products", String(products.length)], ["Units", String(products.reduce((s, p) => s + p.stock, 0))]],
  });

  const stockValueByCat = groupSum(products.filter(p => !["Sold", "Dispatched"].includes(p.status)), p => p.category, p => p.sellingPrice * Math.max(p.stock, 0));
  reports.push({
    id: "inv-stock-value", category: "Inventory", title: "Stock Value",
    description: "Unsold stock valued at selling price, by category.",
    dated: false, entityLabel: "Category", columns: ["Items", "Value"],
    rows: stockValueByCat.map(([cat, g]) => ({ key: cat, label: cat, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "segments", segments: segmentsFrom(stockValueByCat.map(([c, g]) => [c, g.total])) },
    summary: [["Stock value", formatINR(stockValueByCat.reduce((s, [, g]) => s + g.total, 0))]],
  });

  const lowStock = products.filter(p => p.status === "Available" && p.stock <= 1);
  reports.push({
    id: "inv-low", category: "Inventory", title: "Low Stock",
    description: "Available products at or below one unit.",
    dated: false, entityLabel: "Product", columns: ["SKU", "Stock", "Location"],
    rows: lowStock.map(p => ({ key: p.id, label: p.name, drill: { type: "product", id: p.id }, cells: [txt(p.sku), num(p.stock), txt(p.location)] })),
    chart: null, summary: [["Needs reorder", String(lowStock.length)]],
  });

  const movementCount = groupSum(movements.filter(m => ["Sale", "Reservation", "Dispatch"].includes(m.type) && inRange(m.time)), m => m.sku, () => 0);
  const fastRows = movementCount
    .map(([sku, g]) => ({ sku, count: g.count, product: products.find(p => p.sku === sku) }))
    .sort((a, b) => b.count - a.count);
  reports.push({
    id: "inv-fast", category: "Inventory", title: "Fast Moving",
    description: "SKUs with the most sale, reservation and dispatch movements.",
    dated: true, entityLabel: "SKU", columns: ["Product", "Movements"],
    rows: fastRows.map(x => ({ key: x.sku, label: x.sku, drill: x.product ? { type: "product", id: x.product.id } : undefined, cells: [txt(x.product?.name ?? "—"), num(x.count)] })),
    chart: null, summary: [["Active SKUs", String(fastRows.length)]],
  });

  const movingSkus = new Set(movements.filter(m => ["Sale", "Reservation", "Dispatch"].includes(m.type)).map(m => m.sku));
  const slow = products.filter(p => p.status === "Available" && !movingSkus.has(p.sku));
  reports.push({
    id: "inv-slow", category: "Inventory", title: "Slow Moving",
    description: "Available stock with no sale-side movement on record.",
    dated: false, entityLabel: "Product", columns: ["SKU", "Value", "Location"],
    rows: slow.map(p => ({ key: p.id, label: p.name, drill: { type: "product", id: p.id }, cells: [txt(p.sku), inr(p.sellingPrice), txt(p.location)] })),
    chart: null, summary: [["Idle products", String(slow.length)], ["Idle value", formatINR(slow.reduce((s, p) => s + p.sellingPrice, 0))]],
  });

  const mkStatusReport = (id: string, title: string, description: string, statuses: string[]) => {
    const rows = products.filter(p => statuses.includes(p.status));
    reports.push({
      id, category: "Inventory", title, description,
      dated: false, entityLabel: "Product", columns: ["SKU", "Value", "Status"],
      rows: rows.map(p => ({ key: p.id, label: p.name, drill: { type: "product", id: p.id }, cells: [txt(p.sku), inr(p.sellingPrice), txt(p.status)] })),
      chart: null, summary: [["Items", String(rows.length)], ["Value", formatINR(rows.reduce((s, p) => s + p.sellingPrice, 0))]],
    });
  };
  mkStatusReport("inv-reserved", "Reserved", "Stock currently reserved against orders.", ["Reserved"]);
  mkStatusReport("inv-sold", "Sold", "Sold and dispatched stock.", ["Sold", "Dispatched"]);
  mkStatusReport("inv-damaged", "Damaged", "Damaged and returned stock awaiting decisions.", ["Damaged", "Returned"]);

  /* ================= PURCHASE ================= */

  const livePos = pos.filter(po => po.status !== "Cancelled" && inRange(po.created));
  const supplierAgg = suppliers.map(s => {
    const supplierPos = livePos.filter(po => po.supplierId === s.id);
    const value = supplierPos.reduce((sum, po) => sum + poTotals(po).total, 0);
    const outstanding = supplierPos.reduce((sum, po) => sum + Math.max(0, poTotals(po).total - poPaid(po)), 0);
    return { s, count: supplierPos.length, value, outstanding };
  });
  reports.push({
    id: "pur-supplier", category: "Purchase", title: "Supplier",
    description: "Purchase activity and dues per supplier.",
    dated: true, entityLabel: "Supplier", columns: ["City", "POs", "Value", "Outstanding"],
    rows: supplierAgg.map(x => ({ key: x.s.id, label: x.s.name, cells: [txt(x.s.city), num(x.count), inr(x.value), inr(x.outstanding)] })),
    chart: null, summary: [["Suppliers", String(suppliers.length)]],
  });
  const supReport = reports[reports.length - 1];
  supReport.chart = { kind: "bars", items: bars(supReport.rows, 2, 5) };

  reports.push({
    id: "pur-value", category: "Purchase", title: "Purchase Value",
    description: "Every purchase order with taxes and transport included.",
    dated: true, entityLabel: "PO", columns: ["Supplier", "Created", "Value", "Status"],
    rows: livePos.map(po => ({ key: po.id, label: po.id, sub: po.lines[0]?.description, cells: [txt(po.supplierName), txt(po.created), inr(poTotals(po).total), txt(po.status)] })),
    chart: null, summary: [["POs", String(livePos.length)], ["Value", formatINR(livePos.reduce((s, po) => s + poTotals(po).total, 0))]],
  });

  const pendingPurchase = [
    ...requests.filter(r => r.status === "Pending Approval").map(r => ({ key: r.id, label: r.id, sub: r.items, cells: [txt("Purchase request"), txt(r.requester), inr(r.estimatedCost), txt(r.status)] })),
    ...pos.filter(po => ["Draft", "Sent", "Partially Received"].includes(po.status)).map(po => ({ key: po.id, label: po.id, sub: po.lines[0]?.description, cells: [txt("Purchase order"), txt(po.supplierName), inr(poTotals(po).total), txt(po.status)] })),
  ];
  reports.push({
    id: "pur-pending", category: "Purchase", title: "Pending Purchase",
    description: "Requests awaiting approval and POs not fully received.",
    dated: false, entityLabel: "Reference", columns: ["Type", "Party", "Value", "Status"],
    rows: pendingPurchase,
    chart: null, summary: [["Open items", String(pendingPurchase.length)]],
  });

  const outstandingSuppliers = supplierAgg.filter(x => x.outstanding > 0);
  reports.push({
    id: "pur-outstanding", category: "Purchase", title: "Supplier Outstanding",
    description: "Suppliers with balances still to pay.",
    dated: false, entityLabel: "Supplier", columns: ["Value", "Paid", "Outstanding"],
    rows: outstandingSuppliers.map(x => ({ key: x.s.id, label: x.s.name, cells: [inr(x.value), inr(x.value - x.outstanding), inr(x.outstanding)] })),
    chart: { kind: "segments", segments: segmentsFrom(outstandingSuppliers.map(x => [x.s.name, x.outstanding])) },
    summary: [["Total outstanding", formatINR(outstandingSuppliers.reduce((s, x) => s + x.outstanding, 0))]],
  });

  /* ================= FINANCE ================= */

  const transactions = buildTransactions({ orders, customOrders, repairs, pos, returns, expenses, docs: financeDocs })
    .filter(t => inRange(t.date));
  const receipts = transactions.filter(t => t.kind === "Receipt");

  const revenueByMonth = groupSum(receipts, t => monthOf(t.date), t => t.amount)
    .sort((a, b) => monthRank(a[0]) - monthRank(b[0]));
  reports.push({
    id: "fin-revenue", category: "Finance", title: "Revenue",
    description: "Money received per month across sales, custom orders and repairs.",
    dated: true, entityLabel: "Month", columns: ["Receipts", "Collected"],
    rows: revenueByMonth.map(([month, g]) => ({ key: month, label: month, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "bars", items: revenueByMonth.map(([month, g]) => ({ label: month, value: g.total, display: formatINR(g.total) })) },
    summary: [["Collected", formatINR(receipts.reduce((s, t) => s + t.amount, 0))]],
  });

  const receivableRows = [
    ...orders.filter(o => !["Cancelled", "Draft"].includes(o.status)).map(o => ({ ref: o.id, party: o.customerName, customerId: o.customerId, total: orderValue(o), paid: paidAmount(o) })),
    ...customOrders.filter(o => o.stage !== "Cancelled" && o.quotedAmount).map(o => ({ ref: o.id, party: o.customerName, customerId: o.customerId, total: o.quotedAmount!, paid: o.payments.reduce((s, p) => s + p.amount, 0) })),
  ].filter(x => x.total - x.paid > 0);
  reports.push({
    id: "fin-receivable", category: "Finance", title: "Receivable",
    description: "Outstanding balances to collect from customers.",
    dated: false, entityLabel: "Reference", columns: ["Customer", "Total", "Paid", "Balance"],
    rows: receivableRows.map(x => ({ key: x.ref, label: x.ref, drill: x.ref.startsWith("SO-") ? { type: "order", id: x.ref } : undefined, cells: [txt(x.party), inr(x.total), inr(x.paid), inr(x.total - x.paid)] })),
    chart: null, summary: [["To collect", formatINR(receivableRows.reduce((s, x) => s + x.total - x.paid, 0))]],
  });

  const payableRows = pos
    .filter(po => !["Draft", "Cancelled"].includes(po.status))
    .map(po => ({ po, total: poTotals(po).total, paid: poPaid(po) }))
    .filter(x => x.total - x.paid > 0);
  reports.push({
    id: "fin-payable", category: "Finance", title: "Payable",
    description: "Supplier balances still owed.",
    dated: false, entityLabel: "PO", columns: ["Supplier", "Total", "Paid", "Outstanding"],
    rows: payableRows.map(x => ({ key: x.po.id, label: x.po.id, cells: [txt(x.po.supplierName), inr(x.total), inr(x.paid), inr(x.total - x.paid)] })),
    chart: null, summary: [["Owed", formatINR(payableRows.reduce((s, x) => s + x.total - x.paid, 0))]],
  });

  const activeExpenses = expenses.filter(e => (e.status === "Recorded" || e.status === "Approved") && inRange(e.date));
  const expByCat = groupSum(activeExpenses, e => e.category, e => e.amount);
  reports.push({
    id: "fin-expenses", category: "Finance", title: "Expenses",
    description: "Posted expenses by category for the selected period.",
    dated: true, entityLabel: "Category", columns: ["Entries", "Amount"],
    rows: expByCat.map(([cat, g]) => ({ key: cat, label: cat, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "segments", segments: segmentsFrom(expByCat.map(([c, g]) => [c, g.total])) },
    summary: [["Spent", formatINR(activeExpenses.reduce((s, e) => s + e.amount, 0))]],
  });

  const profitByMonth = groupSum(transactions, t => monthOf(t.date), t => (t.kind === "Receipt" ? t.amount : -t.amount))
    .sort((a, b) => monthRank(a[0]) - monthRank(b[0]));
  reports.push({
    id: "fin-profit", category: "Finance", title: "Profit (cash basis)",
    description: "Money in minus money out per month — receipts less payments, refunds and expenses.",
    dated: true, entityLabel: "Month", columns: ["Net"],
    rows: profitByMonth.map(([month, g]) => ({ key: month, label: month, cells: [inr(g.total)] })),
    chart: { kind: "bars", items: profitByMonth.map(([month, g]) => ({ label: month, value: Math.max(g.total, 0), display: formatINR(g.total) })) },
    summary: [["Net position", formatINR(profitByMonth.reduce((s, [, g]) => s + g.total, 0))]],
  });

  const byMethod = groupSum(receipts, t => t.method, t => t.amount);
  reports.push({
    id: "fin-method", category: "Finance", title: "Payment Method",
    description: "Collections split by payment method and account.",
    dated: true, entityLabel: "Method", columns: ["Receipts", "Collected", "Account"],
    rows: byMethod.map(([method, g]) => ({ key: method, label: method, cells: [num(g.count), inr(g.total), txt(accountFor(method))] })),
    chart: { kind: "segments", segments: segmentsFrom(byMethod.map(([m, g]) => [m, g.total])) },
    summary: [["Methods in use", String(byMethod.length)]],
  });

  /* ================= QUALITY & CATALOGUE ================= */

  const gems = products.filter(p => p.gemstoneType || p.carat);
  reports.push({
    id: "gem-carat", category: "Quality", title: "Pack Size",
    description: "Catalogue SKUs by units per carton and rate per unit.",
    dated: false, entityLabel: "SKU", columns: ["Units / carton", "Carton price", "₹ / unit"],
    rows: gems.filter(p => p.carat).map(p => ({
      key: p.id, label: p.name, sub: p.sku, drill: { type: "product", id: p.id },
      cells: [num(p.carat!, `${p.carat} / ctn`), inr(p.sellingPrice), inr(Math.round(p.sellingPrice / p.carat!))],
    })),
    chart: null, summary: [["SKUs", String(gems.filter(p => p.carat).length)], ["Units per carton (total)", String(gems.reduce((s, p) => s + (p.carat ?? 0), 0))]],
  });

  const byOrigin = groupSum(gems.filter(p => p.origin), p => p.origin!, p => p.sellingPrice);
  reports.push({
    id: "gem-origin", category: "Quality", title: "Plant & Line",
    description: "SKUs grouped by manufacturing plant and line with combined value.",
    dated: false, entityLabel: "Plant · line", columns: ["SKUs", "Value"],
    rows: byOrigin.map(([origin, g]) => ({ key: origin, label: origin, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "segments", segments: segmentsFrom(byOrigin.map(([o, g]) => [o, g.total])) },
    summary: [["Plants & lines", String(byOrigin.length)]],
  });

  const byGemCategory = groupSum(gems, p => p.gemstoneType ?? p.category, p => p.sellingPrice);
  reports.push({
    id: "gem-category", category: "Quality", title: "Category",
    description: "Product families and their catalogue value.",
    dated: false, entityLabel: "Family", columns: ["SKUs", "Value"],
    rows: byGemCategory.map(([cat, g]) => ({ key: cat, label: cat, cells: [num(g.count), inr(g.total)] })),
    chart: null, summary: [["Families", String(byGemCategory.length)]],
  });
  const gemCatReport = reports[reports.length - 1];
  gemCatReport.chart = { kind: "bars", items: bars(gemCatReport.rows, 1) };

  const certStates = groupSum(products, p => p.certificate ? p.certificate.status : "Missing", () => 0);
  reports.push({
    id: "gem-certificate", category: "Quality", title: "Compliance & Licence",
    description: "BIS / FSSAI / lab-report coverage across the catalogue.",
    dated: false, entityLabel: "Product", columns: ["Certificate", "Authority", "Status"],
    rows: products.map(p => ({
      key: p.id, label: p.name, sub: p.sku, drill: { type: "product", id: p.id },
      cells: [txt(p.certificate?.number ?? "—"), txt(p.certificate?.authority ?? "—"), txt(p.certificate?.status ?? "Missing")],
    })),
    chart: { kind: "segments", segments: segmentsFrom(certStates.map(([s, g]) => [s, g.count])) },
    summary: [["Certified", String(products.filter(p => p.certificate).length)], ["Missing", String(products.filter(p => !p.certificate).length)]],
  });

  const byTreatment = groupSum(gems.filter(p => p.treatment), p => p.treatment!, p => p.sellingPrice);
  reports.push({
    id: "gem-treatment", category: "Quality", title: "Process Type",
    description: "Manufacturing process mix across the catalogue.",
    dated: false, entityLabel: "Process", columns: ["SKUs", "Value"],
    rows: byTreatment.map(([t, g]) => ({ key: t, label: t, cells: [num(g.count), inr(g.total)] })),
    chart: { kind: "segments", segments: segmentsFrom(byTreatment.map(([t, g]) => [t, g.total])) },
    summary: [["Processes tracked", String(byTreatment.length)]],
  });

  const gemStockValue = groupSum(gems.filter(p => !["Sold", "Dispatched"].includes(p.status)), p => p.gemstoneType ?? p.category, p => p.sellingPrice * Math.max(p.stock, 1));
  reports.push({
    id: "gem-stock-value", category: "Quality", title: "Stock Value",
    description: "Unsold finished-goods stock at selling price.",
    dated: false, entityLabel: "Family", columns: ["SKUs", "Stock value"],
    rows: gemStockValue.map(([cat, g]) => ({ key: cat, label: cat, cells: [num(g.count), inr(g.total)] })),
    chart: null, summary: [["Finished-goods stock value", formatINR(gemStockValue.reduce((s, [, g]) => s + g.total, 0))]],
  });
  const gemStockReport = reports[reports.length - 1];
  gemStockReport.chart = { kind: "bars", items: bars(gemStockReport.rows, 1) };

  return reports;
}

/* ================= Addendum reports ================= */

export interface AddendumReportSources {
  productionOrders: ProductionOrder[];
  materials: MaterialItem[];
  lots: StockLot[];
  assignments: CmAssignment[];
  quotations: SupplierQuotation[];
  deviations: GrnDeviation[];
  gatePasses: GatePass[];
  tallyEntries: TallyEntry[];
  bankTransactions: BankTransaction[];
  feedback: CustomerFeedback[];
  tickets: SupportTicket[];
}

export function buildAddendumReports(s: AddendumReportSources): BuiltReport[] {
  const reports: BuiltReport[] = [];

  /* ---------- Production ---------- */

  reports.push({
    id: "prod-output", category: "Production", title: "Production Output",
    description: "Planned against produced and rejected quantity for every production order.",
    dated: false, entityLabel: "Production order",
    columns: ["Product", "Plant", "Planned", "Produced", "Rejected", "Balance", "Status"],
    rows: s.productionOrders.map(o => ({
      key: o.id, label: o.id, sub: o.orderId ?? o.sourceReturnId ?? "Stock build",
      cells: [
        txt(o.product), txt(o.plant), num(o.plannedQty), num(o.producedQty), num(o.rejectedQty),
        num(Math.max(0, o.plannedQty - o.producedQty)), txt(o.status),
      ],
    })),
    chart: {
      kind: "bars",
      items: s.productionOrders.map(o => ({ label: o.id, value: o.producedQty, display: `${o.producedQty} of ${o.plannedQty}` })),
    },
    summary: [
      ["Orders", String(s.productionOrders.length)],
      ["Produced", String(s.productionOrders.reduce((t, o) => t + o.producedQty, 0))],
      ["Rejected", String(s.productionOrders.reduce((t, o) => t + o.rejectedQty, 0))],
    ],
  });

  const consumption = s.productionOrders.flatMap(o => o.consumption.map(c => ({ order: o, line: c })));
  reports.push({
    id: "prod-variance", category: "Production", title: "Material Variance",
    description: "Planned against actual material consumption per production order line.",
    dated: false, entityLabel: "Material line",
    columns: ["Production order", "Planned", "Actual", "Variance", "Unit"],
    rows: consumption.map(({ order, line }) => ({
      key: `${order.id}-${line.materialId}`, label: line.materialName, sub: order.product,
      cells: [
        txt(order.id), num(line.planned), num(line.actual),
        num(Math.round((line.actual - line.planned) * 10) / 10), txt(line.unit),
      ],
    })),
    chart: null,
    summary: [
      ["Lines tracked", String(consumption.length)],
      ["Over-consumed", String(consumption.filter(c => c.line.actual > c.line.planned).length)],
    ],
  });

  reports.push({
    id: "prod-materials", category: "Production", title: "Raw Material & Packaging Stock",
    description: "Available, reserved and consumed quantities against reorder levels.",
    dated: false, entityLabel: "Material",
    columns: ["Kind", "Available", "Reserved", "Consumed", "Reorder at", "Value"],
    rows: s.materials.map(m => ({
      key: m.id, label: m.name, sub: `${m.code} Â· ${m.location}`,
      cells: [txt(m.kind), num(m.available), num(m.reserved), num(m.consumed), num(m.reorderLevel), inr(m.available * m.rate)],
    })),
    chart: { kind: "bars", items: s.materials.map(m => ({ label: m.code, value: m.available * m.rate, display: formatINR(m.available * m.rate) })) },
    summary: [
      ["Material lines", String(s.materials.length)],
      ["Below reorder", String(s.materials.filter(m => m.available <= m.reorderLevel).length)],
      ["Stock value", formatINR(s.materials.reduce((t, m) => t + m.available * m.rate, 0))],
    ],
  });

  reports.push({
    id: "prod-fifo", category: "Production", title: "FIFO Stock Lots",
    description: "Finished-goods lots by age, with remaining quantity and issue order.",
    dated: false, entityLabel: "Lot",
    columns: ["SKU", "Product", "Received", "Age (days)", "Qty", "Remaining", "Value", "Source"],
    rows: [...s.lots].sort((a, b) => a.dateRank - b.dateRank).map(l => ({
      key: l.id, label: l.id, sub: l.location,
      cells: [
        txt(l.sku), txt(l.product), txt(l.receivedDate), num(lotAgeDays(l.dateRank)),
        num(l.qty), num(l.remaining), inr(l.remaining * l.rate), txt(l.source),
      ],
    })),
    chart: null,
    summary: [
      ["Open lots", String(s.lots.filter(l => l.remaining > 0).length)],
      ["Lot value", formatINR(s.lots.reduce((t, l) => t + l.remaining * l.rate, 0))],
      ["Oldest open lot", `${Math.max(0, ...s.lots.filter(l => l.remaining > 0).map(l => lotAgeDays(l.dateRank)))} days`],
    ],
  });

  reports.push({
    id: "prod-cm", category: "Production", title: "Contract Manufacturing",
    description: "External assignments with ready-to-dispatch quantity â€” never counted as internal stock.",
    dated: false, entityLabel: "Assignment",
    columns: ["Manufacturer", "Product", "Qty", "Ready", "Sent", "Expected", "Status"],
    rows: s.assignments.map(a => ({
      key: a.id, label: a.id, sub: a.orderId ?? a.piId,
      cells: [txt(a.manufacturerName), txt(a.product), num(a.qty), num(a.readyQty), txt(a.sentDate), txt(a.expectedCompletion), txt(a.status)],
    })),
    chart: null,
    summary: [
      ["Assignments", String(s.assignments.length)],
      ["Units outside", String(s.assignments.reduce((t, a) => t + (a.qty - a.readyQty), 0))],
      ["Ready to dispatch", String(s.assignments.reduce((t, a) => t + a.readyQty, 0))],
    ],
  });

  reports.push({
    id: "prod-gatepass", category: "Production", title: "Gate Pass & Sampling",
    description: "Material movements out of the premises without a sale.",
    dated: false, entityLabel: "Gate pass",
    columns: ["Type", "Item", "Qty", "Issued to", "Purpose", "Billing", "Status"],
    rows: s.gatePasses.map(g => ({
      key: g.id, label: g.id, sub: g.issuedAt,
      cells: [
        txt(g.kind), txt(g.item), num(g.qty), txt(g.issuedTo), txt(g.purpose),
        txt(g.noBilling ? "No billing" : "Billed"), txt(g.status),
      ],
    })),
    chart: null,
    summary: [
      ["Movements", String(s.gatePasses.length)],
      ["Awaiting approval", String(s.gatePasses.filter(g => g.status === "Pending Approval").length)],
      ["Returnable open", String(s.gatePasses.filter(g => g.returnable && g.status === "Approved").length)],
    ],
  });

  /* ---------- Purchase (addendum) ---------- */

  reports.push({
    id: "purchase-quotations", category: "Purchase", title: "Supplier Quotation Comparison",
    description: "Every quotation collected against a purchase request, with the selected supplier flagged.",
    dated: false, entityLabel: "Quotation",
    columns: ["Request", "Supplier", "Price", "Delivery (days)", "Credit (days)", "Terms", "Selected"],
    rows: s.quotations.map(q => ({
      key: q.id, label: q.id, sub: q.remarks,
      cells: [
        txt(q.prId), txt(q.supplierName), inr(q.price), num(q.deliveryDays), num(q.creditDays),
        txt(q.terms), txt(q.selected ? "Selected" : "On record"),
      ],
    })),
    chart: { kind: "bars", items: s.quotations.map(q => ({ label: q.supplierName, value: q.price, display: formatINR(q.price) })) },
    summary: [
      ["Quotations", String(s.quotations.length)],
      ["Requests covered", String(new Set(s.quotations.map(q => q.prId)).size)],
      ["Selected", String(s.quotations.filter(q => q.selected).length)],
    ],
  });

  reports.push({
    id: "purchase-deviations", category: "Purchase", title: "GRN Deviations",
    description: "Receipt shortfalls, weight variance and the manager decision on each.",
    dated: false, entityLabel: "Deviation",
    columns: ["GRN", "Supplier", "Received", "Accepted", "Rejected", "Deviation %", "Approved qty", "Status"],
    rows: s.deviations.map(d => ({
      key: d.id, label: d.id, sub: d.item,
      cells: [
        txt(d.grnId), txt(d.supplierName), num(d.receivedQty), num(d.acceptedQty), num(d.rejectedQty),
        pct(d.deviationPct), num(d.approvedQty ?? 0), txt(d.status),
      ],
    })),
    chart: null,
    summary: [
      ["Deviations", String(s.deviations.length)],
      ["Awaiting decision", String(s.deviations.filter(d => !["Approved", "Partially Approved", "Rejected"].includes(d.status)).length)],
      ["Units rejected", String(s.deviations.reduce((t, d) => t + d.rejectedQty, 0))],
    ],
  });

  /* ---------- Integrations ---------- */

  reports.push({
    id: "int-tally", category: "Integrations", title: "Tally Sync Status",
    description: "Accounting entries with voucher type, ledgers, unique reference and sync state.",
    dated: false, entityLabel: "Entry",
    columns: ["Voucher", "Source", "Party", "Amount", "Dr ledger", "Cr ledger", "Reference", "Status"],
    rows: s.tallyEntries.map(e => ({
      key: e.id, label: e.id, sub: e.lastSync ?? "Never synced",
      cells: [
        txt(e.voucherType), txt(e.transactionId), txt(e.party), inr(e.amount),
        txt(e.debitLedger), txt(e.creditLedger), txt(e.tallyRef ?? "â€”"), txt(e.status),
      ],
    })),
    chart: {
      kind: "segments",
      segments: segmentsFrom([
        ["Synced", s.tallyEntries.filter(e => e.status === "Synced").length],
        ["Pending", s.tallyEntries.filter(e => e.status === "Pending").length],
        ["Retry", s.tallyEntries.filter(e => e.status === "Retry").length],
        ["Failed", s.tallyEntries.filter(e => e.status === "Failed").length],
      ]),
    },
    summary: [
      ["Entries", String(s.tallyEntries.length)],
      ["Synced value", formatINR(s.tallyEntries.filter(e => e.status === "Synced").reduce((t, e) => t + e.amount, 0))],
      ["Failed", String(s.tallyEntries.filter(e => e.status === "Failed").length)],
    ],
  });

  reports.push({
    id: "int-bank", category: "Integrations", title: "Bank Reconciliation",
    description: "Statement lines against system transactions, with matched and unmatched state.",
    dated: false, entityLabel: "Statement line",
    columns: ["Date", "Narration", "UTR", "Direction", "Amount", "Matched to", "Matched amount", "State"],
    rows: s.bankTransactions.map(b => ({
      key: b.id, label: b.id, sub: b.remarks,
      cells: [
        txt(b.date), txt(b.narration), txt(b.utr), txt(b.direction), inr(b.amount),
        txt(b.matchedTo ?? "â€”"), inr(b.matchedAmount ?? 0), txt(b.matchState),
      ],
    })),
    chart: {
      kind: "segments",
      segments: segmentsFrom([
        ["Matched", s.bankTransactions.filter(b => b.matchState === "Matched").length],
        ["Partially matched", s.bankTransactions.filter(b => b.matchState === "Partially Matched").length],
        ["Unmatched", s.bankTransactions.filter(b => b.matchState === "Unmatched").length],
      ]),
    },
    summary: [
      ["Statement lines", String(s.bankTransactions.length)],
      ["Reconciled", formatINR(s.bankTransactions.reduce((t, b) => t + (b.matchedAmount ?? 0), 0))],
      ["Unmatched", String(s.bankTransactions.filter(b => b.matchState === "Unmatched").length)],
    ],
  });

  /* ---------- Post-sales ---------- */

  reports.push({
    id: "post-feedback", category: "Post-Sales", title: "Customer Feedback & Reviews",
    description: "Ratings by customer and order, with published reviews and responses.",
    dated: false, entityLabel: "Feedback",
    columns: ["Customer", "Order", "Rating", "Channel", "Published", "Responded"],
    rows: s.feedback.map(f => ({
      key: f.id, label: f.id, sub: f.comment.slice(0, 60),
      drill: { type: "customer" as const, id: f.customerId },
      cells: [
        txt(f.customerName), txt(f.orderId ?? "â€”"), num(f.rating), txt(f.channel),
        txt(f.published ? "Yes" : "No"), txt(f.response ? f.respondedBy ?? "Yes" : "No"),
      ],
    })),
    chart: {
      kind: "segments",
      segments: segmentsFrom([
        ["5 star", s.feedback.filter(f => f.rating === 5).length],
        ["4 star", s.feedback.filter(f => f.rating === 4).length],
        ["3 star", s.feedback.filter(f => f.rating === 3).length],
        ["2 star and below", s.feedback.filter(f => f.rating <= 2).length],
      ]),
    },
    summary: [
      ["Responses", String(s.feedback.length)],
      ["Average rating", s.feedback.length ? (s.feedback.reduce((t, f) => t + f.rating, 0) / s.feedback.length).toFixed(1) : "â€”"],
      ["Published", String(s.feedback.filter(f => f.published).length)],
    ],
  });

  reports.push({
    id: "post-tickets", category: "Post-Sales", title: "Support Tickets",
    description: "Support requests by category, owner and resolution state.",
    dated: false, entityLabel: "Ticket",
    columns: ["Customer", "Subject", "Category", "Priority", "Owner", "Due", "Status"],
    rows: s.tickets.map(t => ({
      key: t.id, label: t.id, sub: t.orderId,
      drill: { type: "customer" as const, id: t.customerId },
      cells: [txt(t.customerName), txt(t.subject), txt(t.category), txt(t.priority), txt(t.assignedTo), txt(t.dueDate), txt(t.status)],
    })),
    chart: {
      kind: "segments",
      segments: segmentsFrom([
        ["Open", s.tickets.filter(t => t.status === "Open").length],
        ["In progress", s.tickets.filter(t => t.status === "In Progress").length],
        ["Awaiting customer", s.tickets.filter(t => t.status === "Awaiting Customer").length],
        ["Resolved", s.tickets.filter(t => ["Resolved", "Closed"].includes(t.status)).length],
      ]),
    },
    summary: [
      ["Tickets", String(s.tickets.length)],
      ["Open", String(s.tickets.filter(t => !["Resolved", "Closed"].includes(t.status)).length)],
      ["High priority", String(s.tickets.filter(t => t.priority === "High").length)],
    ],
  });

  return reports;
}

