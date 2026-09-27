import { useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import SegmentBar from "@/components/data-display/SegmentBar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import {
  buildAddendumReports,
  buildReports,
  dateRanges,
  reportCategories,
  type BuiltReport,
  type ReportCategory,
  type ReportRow,
} from "@/data/reportsData";
import { useCrm } from "@/hooks/useCrm";
import { useFinance } from "@/hooks/useFinance";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { usePostSales } from "@/hooks/usePostSales";
import { useProduction } from "@/hooks/useProduction";
import { usePurchase } from "@/hooks/usePurchase";
import { useQuality } from "@/hooks/useQuality";
import { useSales } from "@/hooks/useSales";
import { useToast } from "@/hooks/useToast";
import { useWorkshop } from "@/hooks/useWorkshop";

const categoryBlurb: Record<ReportCategory, string> = {
  Sales: "Revenue, discounts, margins and who sells what.",
  Customers: "Growth, loyalty, conversion and lifetime value.",
  Inventory: "Stock health, movement speed and exceptions.",
  Purchase: "Suppliers, quotations, deviations and open commitments.",
  Production: "Factory output, material variance, FIFO lots and contract manufacturing.",
  Finance: "Collections, dues, spend and cash position.",
  Integrations: "Accounting posting and bank reconciliation state.",
  "Post-Sales": "Feedback, reviews and support resolution.",
  Quality: "Batch compliance, certification, grades and process types.",
};

export default function ReportsPage({
  onOpenCustomer,
  onOpenProduct,
  onOpenOrder,
}: {
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const toast = useToast();
  const { leads, customers } = useCrm();
  const { products, movements } = useProducts();
  const { orders } = useSales();
  const { suppliers, requests, pos } = usePurchase();
  const { returns } = useQuality();
  const { customOrders, repairs } = useWorkshop();
  const { expenses, docs, tallyEntries, bankTransactions } = useFinance();
  const { orders: productionOrders, materials, lots, assignments } = useProduction();
  const { quotations, deviations } = usePurchase();
  const { gatePasses } = useInventory();
  const { feedback, tickets } = usePostSales();

  const [category, setCategory] = useState<ReportCategory>("Sales");
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState(dateRanges[0].label);
  const [query, setQuery] = useState("");

  const rangeMin = dateRanges.find(r => r.label === rangeLabel)?.min ?? 0;

  const reports = useMemo(
    () => [
      ...buildReports(
        { leads, customers, products, movements, orders, suppliers, requests, pos, returns, customOrders, repairs, expenses, financeDocs: docs },
        rangeMin,
      ),
      ...buildAddendumReports({
        productionOrders, materials, lots, assignments, quotations, deviations,
        gatePasses, tallyEntries, bankTransactions, feedback, tickets,
      }),
    ],
    [
      leads, customers, products, movements, orders, suppliers, requests, pos, returns, customOrders, repairs, expenses, docs, rangeMin,
      productionOrders, materials, lots, assignments, quotations, deviations, gatePasses, tallyEntries, bankTransactions, feedback, tickets,
    ],
  );

  const report = reports.find(r => r.id === openReportId);

  const exportCsv = (r: BuiltReport) => {
    const header = [r.entityLabel, ...r.columns];
    const lines = [header, ...r.rows.map(row => [row.label, ...row.cells.map(c => c.display)])]
      .map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ tone: "success", title: "Report exported", message: `${r.id}.csv downloaded with ${r.rows.length} rows.` });
  };

  if (report) {
    const q = query.trim().toLowerCase();
    const filteredRows = report.rows.filter(
      row => !q || `${row.label} ${row.sub ?? ""} ${row.cells.map(c => c.display).join(" ")}`.toLowerCase().includes(q),
    );

    const drillNav = (row: ReportRow) => {
      if (!row.drill) return undefined;
      const { type, id } = row.drill;
      return () => (type === "customer" ? onOpenCustomer(id) : type === "product" ? onOpenProduct(id) : onOpenOrder(id));
    };

    const columns: Column<ReportRow>[] = [
      {
        key: "label", label: report.entityLabel, sortable: true, hideable: false, sortValue: r => r.label,
        render: r => {
          const nav = drillNav(r);
          return (
            <span className="table-product">
              <span>
                {nav ? (
                  <button type="button" className="link-btn" onClick={nav}>{r.label}</button>
                ) : (
                  <b>{r.label}</b>
                )}
                {r.sub && <small>{r.sub}</small>}
              </span>
            </span>
          );
        },
      },
      ...report.columns.map((label, i) => ({
        key: `col-${i}`,
        label,
        sortable: true,
        /* Numeric columns right-align so magnitudes line up down the column. */
        align: report.rows.some(r => typeof r.cells[i]?.sort === "number") ? ("right" as const) : undefined,
        sortValue: (r: ReportRow) => r.cells[i]?.sort ?? "",
        render: (r: ReportRow) => <span>{r.cells[i]?.display ?? "—"}</span>,
      })),
    ];

    return (
      <div className="page-stack">
        <button type="button" className="back-link" onClick={() => { setOpenReportId(null); setQuery(""); }}>← All {report.category.toLowerCase()} reports</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-title">
              <h1>{report.title}</h1>
              <Badge tone="royal">{report.category}</Badge>
              {!report.dated && <Badge tone="neutral">Point-in-time</Badge>}
            </div>
            <p className="muted-line">{report.description}</p>
          </div>
          <div className="detail-actions">
            <Button variant="secondary" onClick={() => exportCsv(report)}><Icon name="upload" /> Export CSV</Button>
            <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Sent to printer", message: `${report.title} queued for printing (demo).` })}>
              Print
            </Button>
          </div>
        </div>

        <div className="stat-chips">
          {report.summary.map(([label, value]) => (
            <div key={label} className="stat-chip"><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>

        {report.chart && (
          <section className="panel">
            <div className="section-head"><div><p className="kicker">VISUAL</p><h2>{report.title} at a glance</h2></div></div>
            {report.chart.kind === "bars" && <BarList items={report.chart.items} />}
            {report.chart.kind === "segments" && <SegmentBar segments={report.chart.segments} />}
          </section>
        )}

        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">TABLE VIEW</p><h2>{filteredRows.length} rows</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder={`Search ${report.title.toLowerCase()}`} aria-label="Search report" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              {report.dated && (
                <select aria-label="Date range" value={rangeLabel} onChange={e => setRangeLabel(e.target.value)}>
                  {dateRanges.map(r => <option key={r.label}>{r.label}</option>)}
                </select>
              )}
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={filteredRows}
            rowKey={r => r.key}
            pageSize={10}
            emptyState={<EmptyState icon="search" title="No rows in range" description="Widen the date range or clear the search." mini />}
          />
        </section>
      </div>
    );
  }

  const categoryReports = reports.filter(r => r.category === category);

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">REPORTS · ANALYTICS & BUSINESS INTELLIGENCE</p>
          <h1>The business, in numbers.</h1>
          <p>{reports.length} live reports across {reportCategories.length} categories — every one filterable, sortable, exportable and drillable into the record it came from.</p>
        </div>
      </div>

      <Tabs tabs={[...reportCategories]} active={category} onChange={c => setCategory(c as ReportCategory)} label="Report categories" />

      <section className="panel">
        <div className="section-head">
          <div><p className="kicker">{category.toUpperCase()} REPORTS</p><h2>{categoryBlurb[category]}</h2></div>
          <select aria-label="Date range" value={rangeLabel} onChange={e => setRangeLabel(e.target.value)}>
            {dateRanges.map(r => <option key={r.label}>{r.label}</option>)}
          </select>
        </div>
        <div className="report-grid">
          {categoryReports.map(r => (
            <button key={r.id} type="button" className="report-card" onClick={() => setOpenReportId(r.id)}>
              <div className="report-card-head">
                <strong>{r.title}</strong>
                <Icon name="arrow" size={15} />
              </div>
              <p>{r.description}</p>
              <div className="report-card-foot">
                {r.summary.slice(0, 2).map(([label, value]) => (
                  <span key={label}><small>{label}</small><b>{value}</b></span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
