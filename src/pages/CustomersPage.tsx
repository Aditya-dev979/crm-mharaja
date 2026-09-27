import { useEffect, useMemo, useState } from "react";
import CustomerForm from "@/components/crm/CustomerForm";
import { FollowUpModal } from "@/components/crm/LeadModals";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import Stepper from "@/components/data-display/Stepper";
import Alert from "@/components/feedback/Alert";
import Drawer from "@/components/feedback/Drawer";
import { TextAreaField } from "@/components/forms/Field";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import GemImage from "@/components/products/GemImage";
import { docsFromReturns, docTotals, invoiceDocsFromSales, invoiceDocsFromWorkshop, receiptDocs, resolveDoc } from "@/data/financeData";
import { productStatusTone } from "@/data/productData";
import { saleTotals } from "@/data/salesData";
import { ticketStatusTone } from "@/data/postSalesData";
import { useCrm } from "@/hooks/useCrm";
import { useFinance } from "@/hooks/useFinance";
import { usePostSales } from "@/hooks/usePostSales";
import { useProducts } from "@/hooks/useProducts";
import { useQuality } from "@/hooks/useQuality";
import { useSales } from "@/hooks/useSales";
import { useWorkshop } from "@/hooks/useWorkshop";
import { SendTemplateModal } from "@/components/dispatch/CommunicationCenter";
import { commTemplates } from "@/data/dispatchData";
import { useDispatch } from "@/hooks/useDispatch";
import { useToast } from "@/hooks/useToast";
import { downloadCsv, formatINR } from "@/utils";
import type { CommMessage, CommTemplate, Customer, CustomerRecordRow, CustomerSegment } from "@/types";

type CustomerView =
  | { type: "list" }
  | { type: "profile"; id: string }
  | { type: "form"; id?: string };

const segmentTone: Record<CustomerSegment, BadgeTone> = { VIP: "gold", Regular: "royal", New: "emerald" };

const recordTone = (status: string): BadgeTone => {
  if (["Delivered", "Paid", "Received", "Approved", "Accepted", "Ready", "Completed", "Converted", "Stock Reconciled", "Refund Processed", "Credit Note Issued"].includes(status)) return "emerald";
  if (["Confirmed", "Sent", "Requested", "Request", "Pending"].includes(status)) return "royal";
  if (["Partial", "In review", "Negotiation", "Processing", "Dispatched", "Partially Paid", "Under Inspection", "Inspection", "Repair Work", "Quality Check", "Customer Approval", "Refunded"].includes(status)) return "amber";
  if (["Payment pending", "Payment Pending", "Overdue", "Rejected", "Expired", "Declined"].includes(status)) return "danger";
  return "neutral";
};

const displayId = (id: string) => id.replace("cust-", "CUST-");

function RecordTable({
  rows,
  itemLabel,
  linkIds,
  onOpen,
}: {
  rows: CustomerRecordRow[];
  itemLabel: string;
  linkIds?: Set<string>;
  onOpen?: (id: string) => void;
}) {
  return (
    <div className="table-wrap op-table">
      <table>
        <thead>
          <tr><th>Reference</th><th>Date</th><th>{itemLabel}</th><th>Value</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                {onOpen && linkIds?.has(row.id) ? (
                  <button type="button" className="link-btn" onClick={() => onOpen(row.id)}>{row.id}</button>
                ) : (
                  <b className="link">{row.id}</b>
                )}
              </td>
              <td>{row.date}</td>
              <td>{row.title}</td>
              <td><strong>{row.value}</strong></td>
              <td><Badge tone={recordTone(row.status)}>{row.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomersPage({
  intent,
  onIntentHandled,
  focusCustomerId,
  onContextChange,
  onFocusHandled,
  onOpenLead,
  onOpenProduct,
  onNewQuotation,
  onOpenQuotation,
  onOpenOrder,
  onOpenReturn,
  onOpenRepair,
  onOpenFinanceDoc,
  onOpenPostSales,
  onOpenCommunication,
}: {
  intent: "create" | null;
  onIntentHandled: () => void;
  focusCustomerId: string | null;
  /** Reports the open record upwards so the assistant can answer about it. */
  onContextChange?: (id?: string, label?: string) => void;
  onFocusHandled: () => void;
  onOpenLead: (leadId: string) => void;
  onOpenProduct: (productId: string) => void;
  onNewQuotation: (customerId: string) => void;
  onOpenQuotation: (quotationId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenReturn: (returnId: string) => void;
  onOpenRepair: (repairId: string) => void;
  onOpenFinanceDoc: (docId: string) => void;
  onOpenPostSales?: () => void;
  /** Falls back to the Communication centre when a row has no stored message. */
  onOpenCommunication?: () => void;
}) {
  const { customers, addCustomer, updateCustomer } = useCrm();
  const { messages } = useDispatch();
  const toast = useToast();
  const [view, setView] = useState<CustomerView>({ type: "list" });
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<"All" | CustomerSegment>("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [greetingCtx, setGreetingCtx] = useState<{ template: CommTemplate; partyId: string } | null>(null);
  const [messageDetail, setMessageDetail] = useState<CommMessage | null>(null);

  useEffect(() => {
    if (intent === "create") {
      setView({ type: "form" });
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  useEffect(() => {
    if (focusCustomerId) {
      setView({ type: "profile", id: focusCustomerId });
      onFocusHandled();
    }
  }, [focusCustomerId, onFocusHandled]);

  /* Keep the shell (and therefore Maharaja AI) told about which customer is open. */
  useEffect(() => {
    if (!onContextChange) return;
    if (view.type === "profile") {
      const open = customers.find(c => c.id === view.id);
      onContextChange(view.id, open?.name);
    } else {
      onContextChange(undefined, undefined);
    }
    return () => onContextChange(undefined, undefined);
  }, [view, customers, onContextChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter(c => {
      if (segment !== "All" && c.segment !== segment) return false;
      if (!q) return true;
      return `${displayId(c.id)} ${c.name} ${c.city} ${c.phone}`.toLowerCase().includes(q);
    });
  }, [customers, query, segment]);

  const columns: Column<Customer>[] = [
    {
      key: "id", label: "Customer ID", sortable: true, hideable: false, sortValue: c => c.id,
      render: c => (
        <button type="button" className="link-btn" onClick={() => setView({ type: "profile", id: c.id })}>
          {displayId(c.id)}
        </button>
      ),
    },
    {
      key: "name", label: "Name", sortable: true, sortValue: c => c.name,
      render: c => (
        <button type="button" className="cell-link" onClick={() => setView({ type: "profile", id: c.id })}>{c.name}</button>
      ),
    },
    { key: "city", label: "City" },
    { key: "segment", label: "Segment", sortable: true, sortValue: c => c.segment, render: c => <Badge tone={segmentTone[c.segment]}>{c.segment}</Badge> },
    { key: "totalOrders", label: "Orders", sortable: true, sortValue: c => c.totalOrders, render: c => String(c.totalOrders) },
    { key: "ltv", label: "Lifetime value", render: c => <strong>{c.ltv}</strong> },
    { key: "outstanding", label: "Outstanding", align: "right", render: c => c.outstanding === "₹0" ? <span className="muted">—</span> : <strong className="warning-text">{c.outstanding}</strong> },
    { key: "since", label: "Customer since", defaultHidden: true },
  ];

  if (view.type === "profile") {
    const customer = customers.find(c => c.id === view.id);
    if (!customer) {
      setView({ type: "list" });
      return null;
    }
    return (
      <CustomerProfile
        customer={customer}
        onBack={() => setView({ type: "list" })}
        onEdit={() => setView({ type: "form", id: customer.id })}
        onOpenLead={onOpenLead}
        onOpenProduct={onOpenProduct}
        onNewQuotation={onNewQuotation}
        onOpenQuotation={onOpenQuotation}
        onOpenOrder={onOpenOrder}
        onOpenReturn={onOpenReturn}
        onOpenRepair={onOpenRepair}
        onOpenFinanceDoc={onOpenFinanceDoc}
        onOpenPostSales={onOpenPostSales}
        onOpenCommunication={onOpenCommunication}
      />
    );
  }

  if (view.type === "form") {
    const customer = view.id ? customers.find(c => c.id === view.id) : undefined;
    return (
      <div className="page-stack">
        <button
          type="button"
          className="back-link"
          onClick={() => setView(customer ? { type: "profile", id: customer.id } : { type: "list" })}
        >
          ← Back to {customer ? customer.name : "customer list"}
        </button>
        <CustomerForm
          customer={customer}
          onCancel={() => setView(customer ? { type: "profile", id: customer.id } : { type: "list" })}
          onSave={draft => {
            if (customer) {
              updateCustomer(customer.id, draft);
              toast({ tone: "success", title: "Customer updated", message: `${draft.name} was saved.` });
              setView({ type: "profile", id: customer.id });
            } else {
              const created = addCustomer({
                ...draft,
                since: "March 2026",
                ltv: "₹0",
                outstanding: "₹0",
                totalOrders: 0,
                preferred: [],
                orders: [], quotations: [], payments: [], invoices: [], returns: [], repairs: [],
                documents: [], notes: [], followUps: [], communications: [],
              });
              toast({ tone: "success", title: "Customer created", message: `${created.name} (${displayId(created.id)}) added.` });
              setView({ type: "profile", id: created.id });
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">CUSTOMERS · CUSTOMER 360</p>
          <h1>Every relationship, in full view.</h1>
          <p>Profiles, purchase history, balances, documents and follow-ups for every customer.</p>
        </div>
        <Button onClick={() => setView({ type: "form" })}><Icon name="plus" /> New customer</Button>
      </div>

      <section className="panel table-panel">
        <div className="section-head">
          <div><p className="kicker">CUSTOMER LIST</p><h2>{filtered.length} customers</h2></div>
          <div className="table-actions">
            <div className="small-search">
              <Icon name="search" />
              <input placeholder="Search customers" aria-label="Search customers" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <Tabs
          tabs={["All", "VIP", "Regular", "New"]}
          active={segment}
          onChange={t => setSegment(t as typeof segment)}
          label="Customer segments"
        />
        {selected.length > 0 && (
          <div className="bulk-bar">
            <strong>{selected.length} selected</strong>
            <button type="button" onClick={() => {
              const rows = customers.filter(c => selected.includes(c.id));
              const n = downloadCsv("customers.csv", ["Customer", "Name", "Phone", "Email", "City", "Segment", "GSTIN", "Outstanding", "Orders"],
                rows.map(c => [c.id.replace("cust-", "CUST-"), c.name, c.phone, c.email, c.city, c.segment, c.gstin ?? "", c.outstanding, c.totalOrders]));
              toast({ tone: "success", title: "Customers exported", message: `customers.csv downloaded with ${n} row${n === 1 ? "" : "s"}.` });
            }}>Export</button>
            <button
              type="button"
              onClick={() => {
                const template = commTemplates.find(t => t.id === "tpl-anniversary") ?? commTemplates.find(t => t.audience === "Customer");
                const first = customers.find(c => selected.includes(c.id));
                if (template && first) setGreetingCtx({ template, partyId: first.id });
              }}
            >
              Send greetings
            </button>
            <button type="button" onClick={() => setSelected([])}>Clear</button>
          </div>
        )}
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={c => c.id}
          rowLabel={c => `customer ${c.name}`}
          pageSize={6}
          selected={selected}
          onSelectedChange={setSelected}
          emptyState={
            <EmptyState
              icon="search"
              title="No matching customers"
              description="Try another keyword or segment."
              mini
              action={<Button variant="secondary" onClick={() => { setQuery(""); setSegment("All"); }}>Clear filters</Button>}
            />
          }
        />
      </section>
      <SendTemplateModal
        template={greetingCtx?.template ?? null}
        presetPartyId={greetingCtx?.partyId}
        onClose={() => setGreetingCtx(null)}
      />
    </div>
  );
}

/* ================= Customer 360 profile ================= */

const profileTabs = ["Overview", "Orders", "Quotations", "Payments", "Invoices", "Returns & Repairs", "Documents", "Notes"];

const channelIcon: Record<string, IconName> = { WhatsApp: "phone", Call: "phone", Email: "mail", SMS: "bell" };

function CustomerProfile({
  customer,
  onBack,
  onEdit,
  onOpenLead,
  onOpenProduct,
  onNewQuotation,
  onOpenQuotation,
  onOpenOrder,
  onOpenReturn,
  onOpenRepair,
  onOpenFinanceDoc,
  onOpenPostSales,
  onOpenCommunication,
}: {
  customer: Customer;
  onBack: () => void;
  onEdit: () => void;
  onOpenLead: (leadId: string) => void;
  onOpenProduct: (productId: string) => void;
  onNewQuotation: (customerId: string) => void;
  onOpenQuotation: (quotationId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenReturn: (returnId: string) => void;
  onOpenRepair: (repairId: string) => void;
  onOpenFinanceDoc: (docId: string) => void;
  onOpenPostSales?: () => void;
  onOpenCommunication?: () => void;
}) {
  const { updateCustomer, addCustomerNote } = useCrm();
  const { messages } = useDispatch();
  const [messageDetail, setMessageDetail] = useState<CommMessage | null>(null);
  const { products } = useProducts();
  const { quotations: allQuotations, orders: allOrders } = useSales();
  const { returns: allReturns } = useQuality();
  const { repairs: allRepairs, customOrders: allCustomOrders } = useWorkshop();
  const { docs: financeDocs } = useFinance();
  const { feedback, tickets } = usePostSales();
  const customerFeedback = feedback.filter(f => f.customerId === customer.id);
  const customerTickets = tickets.filter(t => t.customerId === customer.id);
  const suggestedProducts = products
    .filter(p => p.status === "Available" && customer.preferred.some(pref => p.category === pref || p.gemstoneType === pref))
    .slice(0, 3);

  const liveQuoteRows: CustomerRecordRow[] = allQuotations
    .filter(q => q.customerId === customer.id)
    .map(q => ({
      id: q.id,
      date: q.created,
      title: q.lines.length === 1 ? q.lines[0].name : `${q.lines[0].name} +${q.lines.length - 1}`,
      value: formatINR(saleTotals(q.lines, q.gstPct).total),
      status: q.status,
    }));
  const quoteRows = [...liveQuoteRows, ...customer.quotations.filter(r => !liveQuoteRows.some(l => l.id === r.id))];
  const liveQuoteIds = new Set(liveQuoteRows.map(r => r.id));

  const liveOrderRows: CustomerRecordRow[] = allOrders
    .filter(o => o.customerId === customer.id)
    .map(o => ({
      id: o.id,
      date: o.created,
      title: o.lines.length === 1 ? o.lines[0].name : `${o.lines[0].name} +${o.lines.length - 1}`,
      value: formatINR(saleTotals(o.lines, o.gstPct).total),
      status: o.status,
    }));
  const orderRows = [...liveOrderRows, ...customer.orders.filter(r => !liveOrderRows.some(l => l.id === r.id))];
  const liveOrderIds = new Set(liveOrderRows.map(r => r.id));

  const liveReturnRows: CustomerRecordRow[] = allReturns
    .filter(r => r.customerId === customer.id)
    .map(r => ({
      id: r.id,
      date: r.requested,
      title: r.product,
      value: formatINR(r.amount),
      status: r.status,
    }));
  const returnRows = [...liveReturnRows, ...customer.returns.filter(r => !liveReturnRows.some(l => l.id === r.id))];
  const liveReturnIds = new Set(liveReturnRows.map(r => r.id));

  const liveRepairRows: CustomerRecordRow[] = allRepairs
    .filter(r => r.customerId === customer.id)
    .map(r => ({
      id: r.id,
      date: r.created,
      title: r.product,
      value: r.estimate ? formatINR(r.estimate) : "—",
      status: r.stage,
    }));
  const repairRows = [...liveRepairRows, ...customer.repairs.filter(r => !liveRepairRows.some(l => l.id === r.id))];
  const liveRepairIds = new Set(liveRepairRows.map(r => r.id));

  const seenDocIds = new Set<string>();
  const customerDocs = [
    ...financeDocs,
    ...invoiceDocsFromSales(allOrders),
    ...invoiceDocsFromWorkshop(allCustomOrders),
    ...receiptDocs(allOrders, allCustomOrders, allRepairs),
    ...docsFromReturns(allReturns),
  ].filter(d => {
    if (d.partyId !== customer.id || seenDocIds.has(d.id)) return false;
    seenDocIds.add(d.id);
    return true;
  });

  const livePaymentRows: CustomerRecordRow[] = customerDocs
    .filter(d => d.type === "Payment Receipt" || d.type === "Refund Receipt")
    .map(d => ({
      id: d.id,
      date: d.date,
      title: d.method ?? d.type,
      value: formatINR(d.paid),
      status: d.type === "Refund Receipt" ? "Refunded" : "Paid",
    }));
  const paymentRows = [...livePaymentRows, ...customer.payments.filter(r => !livePaymentRows.some(l => l.id === r.id))];
  const livePaymentIds = new Set(livePaymentRows.map(r => r.id));

  const liveInvoiceRows: CustomerRecordRow[] = customerDocs
    .filter(d => d.type === "GST Invoice" || d.type === "Proforma Invoice")
    .map(d => ({
      id: d.id,
      date: d.date,
      title: d.lines[0]?.name ?? d.type,
      value: formatINR(docTotals(d.lines, d.gstPct).total),
      status: d.voided ? "Voided" : resolveDoc(d, allOrders).state,
    }));
  const invoiceRows = [...liveInvoiceRows, ...customer.invoices.filter(r => !liveInvoiceRows.some(l => l.id === r.id))];
  const liveInvoiceIds = new Set(liveInvoiceRows.map(r => r.id));
  const toast = useToast();
  const [tab, setTab] = useState("Overview");
  const [followOpen, setFollowOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const initials = customer.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const journeySteps = ["Lead", "Customer", "Quotation", "Order", "Invoice", "Payment"];
  const hasPayments = customer.payments.length > 0 || allOrders.some(o => o.customerId === customer.id && o.payments.length > 0);
  const hasInvoices = customer.invoices.length > 0 || allOrders.some(o => o.customerId === customer.id && o.invoiceId);
  const journeyIndex = hasPayments
    ? 5
    : hasInvoices
      ? 4
      : orderRows.length
        ? 3
        : quoteRows.length
          ? 2
          : 1;

  const stats: Array<[string, string, boolean?]> = [
    ["Lifetime value", customer.ltv],
    ["Total orders", String(customer.totalOrders)],
    ["Outstanding balance", customer.outstanding, customer.outstanding !== "₹0"],
    ["Customer since", customer.since],
  ];

  const scheduleFollowUp = (when: string, note: string) => {
    updateCustomer(customer.id, {
      followUps: [{ text: note || "General follow-up", due: when }, ...customer.followUps],
    });
    setFollowOpen(false);
    toast({ tone: "success", title: "Follow-up scheduled", message: `${customer.name} · ${when}` });
  };

  const logCall = () => {
    updateCustomer(customer.id, {
      communications: [{ channel: "Call", text: "Call logged from customer profile", time: "Just now" }, ...customer.communications],
    });
    toast({ tone: "success", title: "Call logged", message: "Added to the communication history." });
  };

  const uploadDocument = () => {
    updateCustomer(customer.id, {
      documents: [{ name: "New document.pdf", type: "Other", added: "Just now" }, ...customer.documents],
    });
    toast({ tone: "success", title: "Document added", message: "New document.pdf attached to this customer." });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    addCustomerNote(customer.id, { text: noteText.trim(), author: "Arjun Sharma", time: "Just now" });
    setNoteText("");
    toast({ tone: "success", title: "Note added" });
  };

  const emptyTab = (icon: IconName, title: string, description: string) => (
    <EmptyState icon={icon} title={title} description={description} mini />
  );

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All customers</button>

      <section className="panel profile-head">
        <div className="profile-identity">
          <div className="avatar large profile-avatar" aria-hidden="true">{initials}</div>
          <div>
            <div className="detail-title">
              <h1>{customer.name}</h1>
              <Badge tone={segmentTone[customer.segment]}>{customer.segment}</Badge>
            </div>
            <p className="muted-line">
              {displayId(customer.id)} · +91 {customer.phone} · {customer.email || "no email"} · {customer.city}
              {customer.gstin && <> · GSTIN {customer.gstin}</>}
            </p>
          </div>
          <div className="detail-actions">
            <Button variant="secondary" onClick={logCall}><Icon name="phone" /> Log call</Button>
            <Button variant="secondary" onClick={() => setFollowOpen(true)}><Icon name="calendar" /> Follow-up</Button>
            <Button variant="secondary" onClick={onEdit}><Icon name="edit" /> Edit</Button>
            <Button onClick={() => onNewQuotation(customer.id)}>
              <Icon name="plus" /> New quotation
            </Button>
          </div>
        </div>
        <div className="stat-chips profile-stats">
          {stats.map(([label, value, warn]) => (
            <div key={label} className="stat-chip">
              <span>{label}</span>
              <strong className={warn ? "warning-text" : undefined}>{value}</strong>
            </div>
          ))}
        </div>
        <div className="journey-strip">
          <p className="mini-title">RELATIONSHIP JOURNEY</p>
          <Stepper steps={journeySteps} current={journeyIndex} />
        </div>
      </section>

      {customer.leadId && (
        <Alert tone="info" title="Converted from a lead">
          This customer began as lead {customer.leadId}.{" "}
          <button type="button" className="link-btn" onClick={() => onOpenLead(customer.leadId!)}>View the original lead</button>
        </Alert>
      )}

      <Tabs tabs={profileTabs} active={tab} onChange={setTab} label="Customer 360 sections" />

      {tab === "Overview" && (
        <div className="two-col">
          <div className="page-stack">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">PREFERENCES</p><h2>Preferred products</h2></div></div>
              {customer.preferred.length ? (
                <div className="chip-row">
                  {customer.preferred.map(p => <span className="pref-chip" key={p}><Icon name="gem" size={13} /> {p}</span>)}
                </div>
              ) : (
                emptyTab("gem", "No preferences yet", "Preferences build up from enquiries and purchases.")
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">RECENT PURCHASES</p><h2>Latest orders</h2></div></div>
              {orderRows.length ? (
                <RecordTable rows={orderRows.slice(0, 3)} itemLabel="Item" linkIds={liveOrderIds} onOpen={onOpenOrder} />
              ) : (
                emptyTab("grid", "No purchases yet", "Orders appear here once the first sale is recorded.")
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">FROM THE CATALOGUE</p><h2>Products of interest</h2></div></div>
              {suggestedProducts.length ? (
                <div className="related-list">
                  {suggestedProducts.map(p => (
                    <button key={p.id} type="button" onClick={() => onOpenProduct(p.id)}>
                      <GemImage tone={p.images.find(i => i.id === p.primaryImageId)?.tone ?? "gold"} size="thumb" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.sku} · {formatINR(p.sellingPrice)}</small>
                      </span>
                      <Badge tone={productStatusTone[p.status]}>{p.status}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                emptyTab("gem", "No matching stock", "Available products matching this customer’s preferences appear here.")
              )}
            </section>
          </div>
          <div className="page-stack">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">FOLLOW-UPS</p><h2>Upcoming</h2></div></div>
              {customer.followUps.length ? (
                <div className="note-list">
                  {customer.followUps.map((f, i) => (
                    <div key={i}><p>{f.text}</p><small><Icon name="calendar" size={12} /> {f.due}</small></div>
                  ))}
                </div>
              ) : (
                emptyTab("calendar", "Nothing scheduled", "Schedule a follow-up to keep the relationship warm.")
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">COMMUNICATION</p><h2>History</h2></div></div>
              {customer.communications.length ? (
                <div className="feed">
                  {customer.communications.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const match = messages.find(
                          m => m.partyId === customer.id && c.text.startsWith(m.templateName),
                        );
                        if (match) setMessageDetail(match);
                        else onOpenCommunication?.();
                      }}
                    >
                      <span className="feed-icon royal"><Icon name={channelIcon[c.channel]} size={15} /></span>
                      <span className="feed-body">
                        <strong>{c.text}</strong>
                        <small>{c.channel} · {c.time}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                emptyTab("mail", "No communication yet", "WhatsApp, email and SMS history will appear here.")
              )}
            </section>
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">POST-SALES</p><h2>Feedback & support</h2></div>
                <Button variant="secondary" onClick={() => onOpenPostSales?.()}>Open workspace</Button>
              </div>
              {customerFeedback.length === 0 && customerTickets.length === 0 ? (
                emptyTab("help", "Nothing after the sale yet", "Ratings, reviews and support requests appear here once recorded.")
              ) : (
                <>
                  {customerFeedback.map(f => (
                    <div className="detail-list" key={f.id}>
                      <div>
                        <span>{f.id} · {f.channel} · {f.date}</span>
                        <strong>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)} {f.published ? "· published" : "· private"}</strong>
                      </div>
                    </div>
                  ))}
                  {customerTickets.length > 0 && (
                    <div className="related-list" style={{ marginTop: 12 }}>
                      {customerTickets.map(t => (
                        <button key={t.id} type="button" onClick={() => onOpenPostSales?.()}>
                          <span className="doc-icon"><Icon name="help" /></span>
                          <span><strong>{t.id} · {t.subject}</strong><small>{t.assignedTo} · due {t.dueDate}</small></span>
                          <Badge tone={ticketStatusTone[t.status]}>{t.status}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === "Orders" && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">ORDERS</p><h2>{orderRows.length} orders</h2></div></div>
          {orderRows.length ? (
            <RecordTable rows={orderRows} itemLabel="Item" linkIds={liveOrderIds} onOpen={onOpenOrder} />
          ) : (
            emptyTab("grid", "No orders yet", "Orders are created from accepted quotations in Sales.")
          )}
        </section>
      )}
      {tab === "Quotations" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">QUOTATIONS</p><h2>{quoteRows.length} quotations</h2></div>
            <Button variant="secondary" onClick={() => onNewQuotation(customer.id)}><Icon name="plus" /> New quotation</Button>
          </div>
          {quoteRows.length ? (
            <RecordTable rows={quoteRows} itemLabel="Item" linkIds={liveQuoteIds} onOpen={onOpenQuotation} />
          ) : (
            emptyTab("component", "No quotations yet", "Create the first quotation for this customer.")
          )}
        </section>
      )}
      {tab === "Payments" && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">PAYMENTS</p><h2>{paymentRows.length} receipts</h2></div></div>
          {paymentRows.length ? (
            <RecordTable rows={paymentRows} itemLabel="Mode" linkIds={livePaymentIds} onOpen={onOpenFinanceDoc} />
          ) : (
            emptyTab("check", "No payments yet", "Receipts appear as payments are recorded against invoices.")
          )}
        </section>
      )}
      {tab === "Invoices" && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">INVOICES</p><h2>{invoiceRows.length} invoices</h2></div></div>
          {invoiceRows.length ? (
            <RecordTable rows={invoiceRows} itemLabel="Item" linkIds={liveInvoiceIds} onOpen={onOpenFinanceDoc} />
          ) : (
            emptyTab("component", "No invoices yet", "Invoices raised in Sales or Accounts appear here.")
          )}
        </section>
      )}
      {tab === "Returns & Repairs" && (
        <div className="two-col">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">RETURNS</p><h2>{returnRows.length} returns</h2></div></div>
            {returnRows.length ? (
              <RecordTable rows={returnRows} itemLabel="Item" linkIds={liveReturnIds} onOpen={onOpenReturn} />
            ) : (
              emptyTab("check", "No returns", "This customer has never returned an item.")
            )}
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">REPAIRS</p><h2>{repairRows.length} repairs</h2></div></div>
            {repairRows.length ? (
              <RecordTable rows={repairRows} itemLabel="Work" linkIds={liveRepairIds} onOpen={onOpenRepair} />
            ) : (
              emptyTab("settings", "No repairs", "Repair jobs from the Workshop appear here.")
            )}
          </section>
        </div>
      )}
      {tab === "Documents" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">DOCUMENTS</p><h2>{customer.documents.length} on file</h2></div>
            <Button variant="secondary" onClick={uploadDocument}><Icon name="upload" /> Upload document</Button>
          </div>
          {customer.documents.length ? (
            <div className="doc-list">
              {customer.documents.map((doc, i) => (
                <div key={i}>
                  <span className="doc-icon"><Icon name={doc.type === "Certificate" ? "shield" : "component"} /></span>
                  <div><strong>{doc.name}</strong><small>Added {doc.added}</small></div>
                  <Badge tone={doc.type === "Certificate" ? "gold" : "neutral"}>{doc.type}</Badge>
                  <button type="button" className="link-btn" onClick={() => toast({ tone: "info", title: "Preparing download", message: `${doc.name} (demo)` })}>Download</button>
                </div>
              ))}
            </div>
          ) : (
            emptyTab("upload", "No documents", "KYC, GST and certificates attach here.")
          )}
        </section>
      )}
      {tab === "Notes" && (
        <section className="panel">
          <div className="section-head"><div><p className="kicker">NOTES</p><h2>Team notes</h2></div></div>
          <TextAreaField
            label="Add a note"
            placeholder="Preferences, sizing, occasions, service history..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <div className="note-actions">
            <Button variant="secondary" onClick={addNote} disabled={!noteText.trim()}>Add note</Button>
          </div>
          {customer.notes.length ? (
            <div className="note-list">
              {customer.notes.map((note, i) => (
                <div key={i}><p>{note.text}</p><small>{note.author} · {note.time}</small></div>
              ))}
            </div>
          ) : (
            <p className="muted">No notes yet.</p>
          )}
        </section>
      )}

      <FollowUpModal open={followOpen} onClose={() => setFollowOpen(false)} leadName={customer.name} onSchedule={scheduleFollowUp} />

      <Drawer
        open={Boolean(messageDetail)}
        onClose={() => setMessageDetail(null)}
        eyebrow={messageDetail ? `${messageDetail.channel.toUpperCase()} · ${messageDetail.partyKind.toUpperCase()}` : undefined}
        title={messageDetail ? messageDetail.templateName : ""}
      >
        {messageDetail && (
          <div className="page-stack">
            <div className="detail-list">
              <div><span>Status</span><strong>{messageDetail.status}</strong></div>
              <div><span>Channel</span><strong>{messageDetail.channel}</strong></div>
              <div><span>Recipient</span><strong>{messageDetail.partyName}</strong></div>
              {messageDetail.reference && <div><span>Related record</span><strong>{messageDetail.reference}</strong></div>}
              <div><span>Sent by</span><strong>{messageDetail.createdBy ?? "—"}</strong></div>
              <div><span>When</span><strong>{messageDetail.sentAt ?? messageDetail.time}</strong></div>
            </div>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">MESSAGE</p><h2>As the customer saw it</h2></div></div>
              <p className="requirement-quote">{messageDetail.body ?? messageDetail.preview}</p>
            </section>
            {messageDetail.failureReason && <Alert tone="danger" title="Delivery failed">{messageDetail.failureReason}</Alert>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
