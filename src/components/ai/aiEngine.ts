import { lineTotal } from "@/data/salesData";
import type { PageId } from "@/components/layout/navigation";

/* ============================================================================
   MAHARAJA AI · ERP Demo Intelligence
   ----------------------------------------------------------------------------
   There is NO AI model and NO backend behind this. Every answer below is
   resolved by matching the question against a rule table and then reading the
   application's own stores — the same data the screens render. That is why the
   assistant is labelled "Demo Mode" everywhere it appears: it is an interactive
   prototype of the assistant experience, not a language model.

   Because it reads live store state, its numbers always agree with the screens.
   ========================================================================== */

/** One row inside an answer — a record the user can open. */
export interface AiRecordCard {
  id: string;
  title: string;
  meta: string;
  amount?: string;
  /** Record id handed to the existing openRecordById deep-link resolver. */
  openId?: string;
  /** Fallback workspace when the id prefix is not deep-linkable. */
  fallback?: PageId;
  actionLabel?: string;
}

/** A create/act proposal. Executed only after the user presses the button. */
export interface AiProposal {
  kind: "task" | "note";
  label: string;
  summary: string[];
  /** Permission the active role must hold, checked before the button runs. */
  module?: string;
  permission?: "View" | "Create" | "Edit" | "Approve";
  payload: Record<string, string>;
}

export interface AiReply {
  /** Headline sentence. Kept to one or two lines — detail goes in cards. */
  text: string;
  detail?: string;
  cards?: AiRecordCard[];
  /** Navigate straight to a workspace. */
  navigate?: { label: string; page: PageId; tab?: string; navKey?: string };
  proposal?: AiProposal;
  /** Sensitive operations must be confirmed before anything is written. */
  confirm?: { question: string };
  tone?: "neutral" | "warning" | "success" | "error";
  /** Set when the active role may not do what was asked. */
  denied?: { module: string; permission: "View" | "Create" | "Edit" | "Approve" };
}

/** Everything the engine is allowed to read. All of it already exists. */
export interface AiData {
  leads: Array<{ id: string; name: string; status: string; budget: number; executive: string; priority: string; source: string }>;
  customers: Array<{ id: string; name: string; city?: string; outstanding?: number }>;
  orders: Array<{
    id: string; customerId: string; customerName: string; status: string; created: string;
    lines: Array<{ qty: number; price: number; discountPct?: number }>;
    payments: Array<{ amount: number }>;
  }>;
  quotations: Array<{ id: string; customerName: string; status: string; total?: number; version?: number; supersededById?: string }>;
  products: Array<{ id: string; sku: string; name: string; stock: number; minStock?: number }>;
  materials: Array<{ id: string; name: string; available: number; reorderLevel: number; unit: string }>;
  lots: Array<{ id: string; sku: string; product: string; remaining: number; batchNo?: string }>;
  productionOrders: Array<{ id: string; product: string; status: string; plannedQty: number; producedQty: number; batchNo?: string }>;
  shipments: Array<{ id: string; orderId: string; customerName: string; status: string; expectedDelivery?: string }>;
  returns: Array<{ id: string; customerName: string; sku: string; status: string; qty: number; amount: number }>;
  purchaseRequests: Array<{ id: string; items: string; qty: number; status: string; estimatedCost?: number }>;
  pos: Array<{ id: string; supplierName: string; status: string; lines: Array<{ qty: number; unitPrice: number }> }>;
  deviations: Array<{ id: string; supplierName: string; status: string; deviationPct: number; grnId: string }>;
  grns: Array<{ id: string; supplierName: string; status: string }>;
  financeDocs: Array<{
    id: string; type: string; partyName: string; status?: string; paid: number;
    gstPct?: number;
    lines: Array<{ qty: number; price: number; discountPct?: number }>;
    pi?: { status: string };
  }>;
  bankLines: Array<{ id: string; narration: string; amount: number; matchState: string }>;
  tallyEntries: Array<{ id: string; voucherType: string; party: string; status: string; amount: number }>;
  tasks: Array<{ id: string; title: string; assignee: string; status: string; due: string; related?: string; priority: string }>;
  notifications: Array<{ id: string; title: string; message: string; unread?: boolean; type: string; reference?: string }>;
  expenses: Array<{ id: string; category: string; amount: number; status: string; date: string; method: string; description: string }>;
  customOrders: Array<{ id: string; customerName: string; payments: Array<{ amount: number }> }>;
  repairs: Array<{ id: string; customerName: string; payments: Array<{ amount: number }> }>;
  currentUser: string;
  activeRole: string;
  /** The existing permission check, narrowed to the keys the engine uses. */
  can: (module: string, permission: "View" | "Create" | "Edit" | "Approve") => boolean;
}

export interface AiContext {
  page: PageId;
  pageName: string;
  /** The record the user is looking at, when a detail view is open. */
  recordId?: string;
  recordLabel?: string;
}

const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* Values are computed with the same helpers the screens use, so the numbers the
   assistant quotes always match the numbers on the page. */
const orderValue = (o: AiData["orders"][number]) =>
  (o.lines ?? []).reduce((s, l) => s + lineTotal({ ...l, discountPct: l.discountPct ?? 0 } as Parameters<typeof lineTotal>[0]), 0);
const orderPaid = (o: AiData["orders"][number]) => o.payments.reduce((s, p) => s + p.amount, 0);
/* A document's value is the sum of its lines — `paid` is only what has been
   received against it, which is why it must never be shown as the amount. */
const docValue = (x: AiData["financeDocs"][number]) =>
  (x.lines ?? []).reduce((s, l) => s + lineTotal({ ...l, discountPct: l.discountPct ?? 0 } as Parameters<typeof lineTotal>[0]), 0);

/* ---------------------------------------------------------------- receivables */
function receivables(d: AiData) {
  const open = d.orders.filter(o => !["Cancelled", "Draft"].includes(o.status));
  const rows = open
    .map(o => ({ o, due: orderValue(o) - orderPaid(o) }))
    .filter(r => r.due > 0)
    .sort((a, b) => b.due - a.due);
  return { rows, total: rows.reduce((s, r) => s + r.due, 0) };
}

/* ---------------------------------------------------------------- approvals */
function pendingApprovals(d: AiData) {
  const cards: AiRecordCard[] = [];
  d.financeDocs
    .filter(x => x.type === "Proforma Invoice" && x.pi?.status === "Pending Approval")
    .forEach(x => cards.push({
      id: x.id, title: `${x.id} · proforma invoice`, meta: `${x.partyName} · awaiting approval`,
      amount: inr(docValue(x)), openId: x.id, fallback: "finance", actionLabel: "Review",
    }));
  d.purchaseRequests
    .filter(p => /Pending|Submitted|Approval/i.test(p.status))
    .forEach(p => cards.push({
      id: p.id, title: `${p.id} · purchase request`, meta: `${p.items} · ${p.qty} · ${p.status}`,
      amount: p.estimatedCost ? inr(p.estimatedCost) : undefined, openId: p.id, fallback: "purchase", actionLabel: "Review",
    }));
  d.deviations
    .filter(x => x.status === "Pending Manager Approval" || x.status === "Open")
    .forEach(x => cards.push({
      id: x.id, title: `${x.id} · GRN deviation`, meta: `${x.supplierName} · ${x.deviationPct}% on ${x.grnId}`,
      openId: x.id, fallback: "purchase", actionLabel: "Decide",
    }));
  return cards;
}

/* ---------------------------------------------------------------- intents */
type Rule = {
  /** Every listed word (or one of the slash-separated alternatives) must appear. */
  match: RegExp;
  run: (d: AiData, ctx: AiContext, q: string) => AiReply;
};

const RULES: Rule[] = [
  /* ---- navigation ------------------------------------------------------- */
  {
    match: /^(open|go to|show me|take me to|navigate to)\s+(purchase order|purchase orders)/i,
    run: () => ({ text: "Opening purchase orders.", navigate: { label: "Purchase Orders", page: "purchase", tab: "Purchase Orders", navKey: "pur-po" } }),
  },
  {
    match: /^(open|go to|show me|take me to|navigate to)\s+(dispatch|shipments?)/i,
    run: () => ({ text: "Opening dispatch.", navigate: { label: "Dispatch & LR", page: "dispatch", navKey: "dsp-ship" } }),
  },
  {
    match: /^(open|go to|show)\s+receivables?/i,
    run: d => {
      const { total, rows } = receivables(d);
      return {
        text: `${inr(total)} is outstanding across ${rows.length} order${rows.length === 1 ? "" : "s"}.`,
        navigate: { label: "Receivables", page: "finance", tab: "Receivables", navKey: "fin-recv" },
      };
    },
  },
  {
    match: /^(open|go to|show)\s+(inventory|stock|warehouse)/i,
    run: () => ({ text: "Opening inventory.", navigate: { label: "Inventory", page: "inventory", navKey: "inv-stock" } }),
  },
  {
    match: /^(open|go to|show)\s+(production|manufacturing|plant)/i,
    run: () => ({ text: "Opening manufacturing.", navigate: { label: "Production Orders", page: "production", tab: "Production Orders", navKey: "prd-orders" } }),
  },
  {
    match: /^(open|go to|show)\s+(tally|accounting)/i,
    run: () => ({ text: "Opening the accounting queue.", navigate: { label: "Tally (prototype)", page: "finance", tab: "Tally", navKey: "fin-tally" } }),
  },
  {
    match: /^(open|go to|show)\s+bank/i,
    run: () => ({ text: "Opening bank reconciliation.", navigate: { label: "Bank Recon. (prototype)", page: "finance", tab: "Bank", navKey: "fin-bank" } }),
  },

  /* ---- what needs attention -------------------------------------------- */
  {
    match: /(what needs attention|needs attention|what'?s pending|whats pending|what is pending|anything urgent)/i,
    run: d => {
      const approvals = pendingApprovals(d);
      const { total } = receivables(d);
      const lowStock = d.materials.filter(m => m.available <= m.reorderLevel).length;
      const unmatched = d.bankLines.filter(b => b.matchState === "Unmatched").length;
      const failed = d.tallyEntries.filter(t => t.status === "Failed").length;
      const dueTasks = d.tasks.filter(t => t.status !== "Completed").length;
      return {
        text: `${approvals.length} approval${approvals.length === 1 ? "" : "s"} waiting, ${inr(total)} receivable, ${lowStock} material line${lowStock === 1 ? "" : "s"} below reorder.`,
        detail: `${unmatched} bank line${unmatched === 1 ? "" : "s"} unmatched · ${failed} accounting entr${failed === 1 ? "y" : "ies"} failed · ${dueTasks} open task${dueTasks === 1 ? "" : "s"}.`,
        cards: approvals.slice(0, 4),
        tone: approvals.length || failed ? "warning" : "neutral",
      };
    },
  },

  /* ---- approvals -------------------------------------------------------- */
  {
    match: /(pending approvals?|approvals? (pending|today|required)|awaiting approval|approval queue)/i,
    run: d => {
      const cards = pendingApprovals(d);
      if (!cards.length) return { text: "Nothing is waiting for approval right now.", tone: "success" };
      return {
        text: `${cards.length} approval${cards.length === 1 ? "" : "s"} require attention.`,
        cards,
        tone: "warning",
      };
    },
  },

  /* ---- receivables / outstanding --------------------------------------- */
  {
    match: /(receivable|outstanding|payment due|who owes|collections?)/i,
    run: (d, ctx) => {
      const { rows, total } = receivables(d);
      /* On a customer page the question is about that customer. */
      if (ctx.recordId?.startsWith("cust-")) {
        const cust = d.customers.find(c => c.id === ctx.recordId);
        const mine = rows.filter(r => r.o.customerId === ctx.recordId);
        const sum = mine.reduce((s, r) => s + r.due, 0);
        return {
          text: sum > 0
            ? `${cust?.name ?? "This customer"} owes ${inr(sum)} across ${mine.length} order${mine.length === 1 ? "" : "s"}.`
            : `${cust?.name ?? "This customer"} has nothing outstanding.`,
          cards: mine.slice(0, 4).map(r => ({
            id: r.o.id, title: r.o.id, meta: `${r.o.status} · raised ${r.o.created}`,
            amount: inr(r.due), openId: r.o.id, fallback: "sales", actionLabel: "Open",
          })),
          tone: sum > 0 ? "warning" : "success",
        };
      }
      return {
        text: `${inr(total)} outstanding across ${rows.length} order${rows.length === 1 ? "" : "s"}.`,
        cards: rows.slice(0, 4).map(r => ({
          id: r.o.id, title: `${r.o.id} · ${r.o.customerName}`, meta: `${r.o.status} · raised ${r.o.created}`,
          amount: inr(r.due), openId: r.o.id, fallback: "sales", actionLabel: "Open",
        })),
        navigate: { label: "Receivables", page: "finance", tab: "Receivables", navKey: "fin-recv" },
        tone: "neutral",
      };
    },
  },

  /* ---- dispatch due ----------------------------------------------------- */
  {
    match: /(dispatch(es)? due|due today|shipments? due|delivery due|deliveries due)/i,
    run: d => {
      const moving = d.shipments.filter(s => !["Delivered", "Returned"].includes(s.status));
      const today = moving.filter(s => /today/i.test(s.expectedDelivery ?? ""));
      const list = today.length ? today : moving;
      return {
        text: today.length
          ? `${today.length} shipment${today.length === 1 ? " is" : "s are"} due today.`
          : `No shipment is dated today. ${moving.length} shipment${moving.length === 1 ? " is" : "s are"} still moving.`,
        cards: list.slice(0, 4).map(s => ({
          id: s.id, title: `${s.id} · ${s.customerName}`,
          meta: `${s.status} · ${s.orderId}${s.expectedDelivery ? ` · expected ${s.expectedDelivery}` : ""}`,
          openId: s.id, fallback: "dispatch", actionLabel: "Open",
        })),
        navigate: { label: "Dispatch & LR", page: "dispatch", navKey: "dsp-ship" },
        tone: today.length ? "warning" : "neutral",
      };
    },
  },

  /* ---- stock ------------------------------------------------------------ */
  {
    match: /(low stock|below reorder|material shortage|shortage|reorder)/i,
    run: d => {
      const low = d.materials.filter(m => m.available <= m.reorderLevel);
      const lowSku = d.products.filter(p => p.minStock !== undefined && p.stock <= (p.minStock ?? 0));
      if (!low.length && !lowSku.length) return { text: "Nothing is below its reorder level.", tone: "success" };
      return {
        text: `${low.length} material line${low.length === 1 ? "" : "s"} and ${lowSku.length} SKU${lowSku.length === 1 ? "" : "s"} are at or below reorder level.`,
        cards: [
          ...low.slice(0, 3).map(m => ({
            id: m.id, title: m.name, meta: `Available ${m.available} ${m.unit} · reorder at ${m.reorderLevel}`,
            fallback: "production" as PageId, actionLabel: "Open materials",
          })),
          ...lowSku.slice(0, 2).map(p => ({
            id: p.sku, title: p.name, meta: `Stock ${p.stock} · minimum ${p.minStock}`,
            openId: p.sku, fallback: "products" as PageId, actionLabel: "Open SKU",
          })),
        ],
        tone: "warning",
      };
    },
  },
  {
    match: /(finished (goods|stock)|how much stock|stock available|available stock|fifo)/i,
    run: d => {
      const units = d.lots.reduce((n, l) => n + l.remaining, 0);
      const openLots = d.lots.filter(l => l.remaining > 0);
      const oldest = openLots[0];
      return {
        text: `Finished goods currently available: ${units.toLocaleString("en-IN")} unit${units === 1 ? "" : "s"} across ${openLots.length} open FIFO lot${openLots.length === 1 ? "" : "s"}.`,
        detail: oldest ? `Next lot to issue is ${oldest.id}${oldest.batchNo ? ` · batch ${oldest.batchNo}` : ""}.` : undefined,
        cards: openLots.slice(0, 4).map(l => ({
          id: l.id, title: `${l.id} · ${l.product}`,
          meta: `${l.remaining} remaining${l.batchNo ? ` · batch ${l.batchNo}` : " · bought in"}`,
          fallback: "production" as PageId, actionLabel: "Open lots",
        })),
        navigate: { label: "Finished Goods", page: "production", tab: "Finished Goods", navKey: "prd-fg" },
      };
    },
  },

  /* ---- production ------------------------------------------------------- */
  {
    match: /(today'?s production|production (status|variance|today)|batch|in production)/i,
    run: d => {
      const active = d.productionOrders.filter(o => !["Completed"].includes(o.status));
      const variance = d.productionOrders.filter(o => o.producedQty < o.plannedQty && o.status !== "Planned");
      return {
        text: `${active.length} production order${active.length === 1 ? " is" : "s are"} open at the plant.`,
        detail: variance.length ? `${variance.length} order${variance.length === 1 ? " is" : "s are"} short of the planned quantity.` : "Every open order is on or above plan.",
        cards: active.slice(0, 4).map(o => ({
          id: o.id, title: `${o.id} · ${o.product}`,
          meta: `${o.status} · ${o.producedQty} of ${o.plannedQty}${o.batchNo ? ` · batch ${o.batchNo}` : ""}`,
          openId: o.id, fallback: "production", actionLabel: "Open",
        })),
        tone: variance.length ? "warning" : "neutral",
      };
    },
  },

  /* ---- sales ------------------------------------------------------------ */
  {
    match: /(today'?s sales|sales summary|summari[sz]e sales|sales total|revenue)/i,
    run: d => {
      const live = d.orders.filter(o => !["Cancelled", "Draft"].includes(o.status));
      const value = live.reduce((s, o) => s + orderValue(o), 0);
      const collected = live.reduce((s, o) => s + orderPaid(o), 0);
      return {
        text: `${live.length} live order${live.length === 1 ? "" : "s"} worth ${inr(value)}.`,
        detail: `${inr(collected)} collected · ${inr(value - collected)} still receivable.`,
        cards: live.slice(0, 4).map(o => ({
          id: o.id, title: `${o.id} · ${o.customerName}`, meta: o.status,
          amount: inr(orderValue(o)), openId: o.id, fallback: "sales", actionLabel: "Open",
        })),
        navigate: { label: "Sales & Orders", page: "sales", navKey: "sal-orders" },
      };
    },
  },

  /* ---- purchase -------------------------------------------------------- */
  {
    match: /(supplier (comparison|quotes?|quotations?)|purchase deviation|grn pending|pending grn|supplier approvals?)/i,
    run: d => {
      const openGrn = d.grns.filter(g => g.status !== "Posted" && g.status !== "Closed");
      const devs = d.deviations.filter(x => !["Approved", "Rejected", "Partially Approved"].includes(x.status));
      return {
        text: `${openGrn.length} GRN${openGrn.length === 1 ? "" : "s"} in progress and ${devs.length} deviation${devs.length === 1 ? "" : "s"} open.`,
        cards: [
          ...devs.slice(0, 3).map(x => ({
            id: x.id, title: `${x.id} · deviation`, meta: `${x.supplierName} · ${x.deviationPct}% on ${x.grnId}`,
            openId: x.id, fallback: "purchase" as PageId, actionLabel: "Decide",
          })),
          ...openGrn.slice(0, 2).map(g => ({
            id: g.id, title: `${g.id} · goods received`, meta: `${g.supplierName} · ${g.status}`,
            openId: g.id, fallback: "purchase" as PageId, actionLabel: "Open",
          })),
        ],
        tone: devs.length ? "warning" : "neutral",
      };
    },
  },

  /* ---- finance: bank + tally ------------------------------------------- */
  {
    match: /(bank difference|reconcil|unmatched|bank lines?)/i,
    run: d => {
      const unmatched = d.bankLines.filter(b => b.matchState === "Unmatched");
      const partial = d.bankLines.filter(b => b.matchState === "Partially Matched");
      return {
        text: `${unmatched.length} bank line${unmatched.length === 1 ? "" : "s"} unmatched and ${partial.length} partially matched.`,
        cards: [...unmatched, ...partial].slice(0, 4).map(b => ({
          id: b.id, title: `${b.id} · ${b.matchState}`, meta: b.narration,
          amount: inr(b.amount), openId: b.id, fallback: "finance" as PageId, actionLabel: "Open",
        })),
        navigate: { label: "Bank Recon. (prototype)", page: "finance", tab: "Bank", navKey: "fin-bank" },
        tone: unmatched.length ? "warning" : "neutral",
      };
    },
  },
  {
    match: /(tally queue|accounting queue|voucher|posting failed|failed posting)/i,
    run: d => {
      const failed = d.tallyEntries.filter(t => t.status === "Failed");
      const pending = d.tallyEntries.filter(t => t.status === "Pending" || t.status === "Retry");
      return {
        text: `${pending.length} voucher${pending.length === 1 ? "" : "s"} waiting to post and ${failed.length} failed.`,
        detail: "Tally is an integration prototype here — nothing is sent to a live company file.",
        cards: [...failed, ...pending].slice(0, 4).map(t => ({
          id: t.id, title: `${t.id} · ${t.voucherType}`, meta: `${t.party} · ${t.status}`,
          amount: inr(t.amount), openId: t.id, fallback: "finance" as PageId, actionLabel: "Open",
        })),
        navigate: { label: "Tally (prototype)", page: "finance", tab: "Tally", navKey: "fin-tally" },
        tone: failed.length ? "warning" : "neutral",
      };
    },
  },

  /* ---- tasks & notifications ------------------------------------------- */
  {
    match: /(my tasks?|pending tasks?|open tasks?|task list)/i,
    run: d => {
      const mine = d.tasks.filter(t => t.assignee === d.currentUser && t.status !== "Completed");
      const all = d.tasks.filter(t => t.status !== "Completed");
      const list = mine.length ? mine : all;
      return {
        text: mine.length
          ? `You have ${mine.length} open task${mine.length === 1 ? "" : "s"}.`
          : `Nothing is assigned to you. ${all.length} task${all.length === 1 ? " is" : "s are"} open across the team.`,
        cards: list.slice(0, 4).map(t => ({
          id: t.id, title: t.title, meta: `${t.assignee} · due ${t.due} · ${t.priority}`,
          openId: t.related ?? t.id, fallback: "team", actionLabel: t.related ? "Act on record" : "Open",
        })),
        navigate: { label: "Team & Tasks", page: "team", tab: "Tasks", navKey: "tm-task" },
      };
    },
  },
  {
    match: /(notification|unread|alerts?)/i,
    run: d => {
      const unread = d.notifications.filter(n => n.unread);
      const list = unread.length ? unread : d.notifications;
      return {
        text: unread.length
          ? `${unread.length} unread notification${unread.length === 1 ? "" : "s"}.`
          : `No unread notifications. Showing the ${Math.min(4, list.length)} most recent.`,
        cards: list.slice(0, 4).map(n => ({
          id: n.id, title: n.title, meta: n.message,
          openId: n.reference, fallback: "team", actionLabel: "Open",
        })),
        navigate: { label: "Notifications", page: "team", tab: "Notifications", navKey: "tm-notif" },
      };
    },
  },

  /* ---- returns --------------------------------------------------------- */
  {
    match: /(returns?|reprocess|credit note)/i,
    run: d => {
      const open = d.returns.filter(r => !["Refund Processed", "Credit Note Issued", "Rejected"].includes(r.status));
      return {
        text: `${open.length} return${open.length === 1 ? " is" : "s are"} still in progress.`,
        cards: open.slice(0, 4).map(r => ({
          id: r.id, title: `${r.id} · ${r.customerName}`, meta: `${r.sku} · ${r.qty} unit(s) · ${r.status}`,
          amount: inr(r.amount), openId: r.id, fallback: "quality", actionLabel: "Open",
        })),
        navigate: { label: "Returns & Reprocessing", page: "quality", tab: "Returns", navKey: "qly-ret" },
        tone: open.length ? "warning" : "success",
      };
    },
  },
];

/* ---------------------------------------------------------------- lookups */
function findEntity(d: AiData, q: string): AiReply | null {
  /* An explicit record id always wins. */
  const idMatch = q.match(/\b([A-Z]{2,5}-[0-9]{3,7}(?:-R[0-9]+)?)\b/i);
  if (idMatch) {
    const id = idMatch[1].toUpperCase();
    const order = d.orders.find(o => o.id.toUpperCase() === id);
    if (order) {
      const due = orderValue(order) - orderPaid(order);
      return {
        text: `${order.id} · ${order.customerName} — ${order.status}.`,
        detail: `Order value ${inr(orderValue(order))} · received ${inr(orderPaid(order))} · balance ${inr(due)}.`,
        cards: [{
          id: order.id, title: order.id, meta: `${order.customerName} · ${order.status} · raised ${order.created}`,
          amount: inr(orderValue(order)), openId: order.id, fallback: "sales", actionLabel: "Open order",
        }],
      };
    }
    const ship = d.shipments.find(x => x.id.toUpperCase() === id);
    if (ship) {
      return {
        text: `${ship.id} · ${ship.customerName} — ${ship.status}.`,
        detail: ship.expectedDelivery ? `Against ${ship.orderId} · expected ${ship.expectedDelivery}.` : `Against ${ship.orderId}.`,
        cards: [{ id: ship.id, title: ship.id, meta: `${ship.status} · ${ship.orderId}`, openId: ship.id, fallback: "dispatch", actionLabel: "Open shipment" }],
      };
    }
    const prod = d.productionOrders.find(x => x.id.toUpperCase() === id);
    if (prod) {
      return {
        text: `${prod.id} · ${prod.product} — ${prod.status}.`,
        detail: `${prod.producedQty} of ${prod.plannedQty} produced${prod.batchNo ? ` · batch ${prod.batchNo}` : ""}.`,
        cards: [{ id: prod.id, title: prod.id, meta: prod.status, openId: prod.id, fallback: "production", actionLabel: "Open order" }],
      };
    }
    const quote = d.quotations.find(x => x.id.toUpperCase() === id);
    if (quote) {
      return {
        text: `${quote.id} · ${quote.customerName} — ${quote.status}${quote.version && quote.version > 1 ? ` (version ${quote.version})` : ""}.`,
        detail: quote.supersededById ? `Superseded by ${quote.supersededById}.` : undefined,
        cards: [{ id: quote.id, title: quote.id, meta: `${quote.customerName} · ${quote.status}`, openId: quote.id, fallback: "sales", actionLabel: "Open quotation" }],
      };
    }
    const doc = d.financeDocs.find(x => x.id.toUpperCase() === id);
    if (doc) {
      return {
        text: `${doc.id} · ${doc.type} for ${doc.partyName}.`,
        detail: doc.status ? `Status ${doc.status}.` : undefined,
        cards: [{ id: doc.id, title: doc.id, meta: `${doc.type} · ${doc.partyName}`, openId: doc.id, fallback: "finance", actionLabel: "Open document" }],
      };
    }
    return {
      text: `I could not find ${id} in this workspace.`,
      detail: "Check the id, or open the module and search there.",
      tone: "error",
    };
  }

  /* Otherwise try a customer / lead by name. */
  /* Strip the verb and any leading noun ("find customer X", "open lead Y") so
     the remainder is just the name the user typed. */
  const name = q
    .replace(/^(find|search|look ?up|show( me)?|open|about|summari[sz]e|who is|details? (of|for)|tell me about)\s+/i, "")
    .replace(/^(the\s+)?(customer|client|distributor|party|lead|enquiry|supplier|account)\s+/i, "")
    .replace(/'s.*$/i, "")
    .replace(/[?.!]$/, "")
    .trim();
  if (name.length < 3) return null;
  const needle = name.toLowerCase();
  const cust = d.customers.find(c => c.name.toLowerCase().includes(needle));
  if (cust) {
    const theirs = d.orders.filter(o => o.customerId === cust.id && !["Cancelled", "Draft"].includes(o.status));
    const due = theirs.reduce((s, o) => s + (orderValue(o) - orderPaid(o)), 0);
    const last = theirs[0];
    return {
      text: `${cust.name}${cust.city ? ` · ${cust.city}` : ""}`,
      detail: `Outstanding ${inr(due)} · open orders ${theirs.length}${last ? ` · last order ${last.id}` : ""}.`,
      cards: [{
        id: cust.id, title: cust.name, meta: `${theirs.length} open order(s) · ${inr(due)} outstanding`,
        openId: cust.id, fallback: "customers", actionLabel: "Open Customer 360",
      }],
    };
  }
  const supplier = d.pos.find(p => p.supplierName.toLowerCase().includes(needle));
  const lead = d.leads.find(l => l.name.toLowerCase().includes(needle));
  if (lead) {
    return {
      text: `${lead.name} · ${lead.status} lead`,
      detail: `${inr(lead.budget)} potential · ${lead.priority} priority · ${lead.executive} · via ${lead.source}.`,
      cards: [{ id: lead.id, title: lead.name, meta: `${lead.status} · ${lead.executive}`, openId: lead.id, fallback: "leads", actionLabel: "Open lead" }],
    };
  }
  if (supplier) {
    const theirs = d.pos.filter(p => p.supplierName === supplier.supplierName);
    const value = theirs.reduce((sum, p) => sum + p.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0), 0);
    const devs = d.deviations.filter(x => x.supplierName === supplier.supplierName);
    return {
      text: `${supplier.supplierName} · supplier`,
      detail: `${theirs.length} purchase order(s) worth ${inr(value)}${devs.length ? ` · ${devs.length} deviation(s) on record` : ""}.`,
      cards: theirs.slice(0, 3).map(p => ({
        id: p.id, title: p.id, meta: `${p.supplierName} · ${p.status}`,
        amount: inr(p.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0)),
        openId: p.id, fallback: "purchase" as PageId, actionLabel: "Open PO",
      })),
    };
  }
  return null;
}

/* ---------------------------------------------------------------- create */
function createIntent(d: AiData, ctx: AiContext, q: string): AiReply | null {
  const wantsTask = /(create|add|make|schedule|set)\s+(a\s+)?(follow[- ]?up|task|reminder|call back)/i.test(q);
  if (!wantsTask) return null;

  /* Who is it for? An explicit name wins, otherwise the record in context. */
  const forMatch = q.match(/for\s+([a-z0-9&.\-' ]+?)(?:\s+(?:tomorrow|today|next week|on|at|due)\b|[?.]|$)/i);
  let party = forMatch?.[1]?.trim();
  if (!party && ctx.recordLabel) party = ctx.recordLabel;
  const resolved =
    (party && d.customers.find(c => c.name.toLowerCase().includes(party!.toLowerCase()))?.name) ??
    (party && d.leads.find(l => l.name.toLowerCase().includes(party!.toLowerCase()))?.name) ??
    party;

  const when = /tomorrow/i.test(q) ? "Tomorrow" : /next week/i.test(q) ? "Next week" : /today/i.test(q) ? "Today" : "Tomorrow";

  /* A follow-up task is CRM work, so it is gated on the CRM module that
     actually exists in the permission matrix. */
  if (!d.can("CRM", "Create") && !d.can("CRM", "Edit")) {
    return {
      text: `You don't have permission to create tasks as ${d.activeRole}.`,
      denied: { module: "CRM", permission: "Create" },
      tone: "error",
    };
  }

  return {
    text: resolved ? `I can prepare this follow-up task for ${resolved}.` : "I can prepare this follow-up task.",
    detail: "Nothing is saved until you press Create task.",
    proposal: {
      kind: "task",
      label: "Create task",
      module: "CRM",
      permission: "Create",
      summary: [
        `Title · Follow up${resolved ? ` — ${resolved}` : ""}`,
        `Owner · ${d.currentUser}`,
        `Due · ${when}`,
        ctx.recordId ? `Linked record · ${ctx.recordId}` : "Linked record · none",
      ],
      payload: {
        title: `Follow up${resolved ? ` — ${resolved}` : ""}`,
        detail: q.trim(),
        assignee: d.currentUser,
        due: when,
        related: ctx.recordId ?? "",
      },
    },
  };
}

/* ---------------------------------------------------------------- sensitive */
const SENSITIVE = /(approve|reject|pay|payment|refund|dispatch now|post to tally|adjust stock|delete|cancel|void|write off)/i;

function sensitiveIntent(d: AiData, q: string): AiReply | null {
  if (!SENSITIVE.test(q)) return null;
  /* The assistant never performs these. It explains and hands over to the
     screen that owns the control, where the real permission check lives. */
  const needs: Array<[RegExp, string, "View" | "Create" | "Edit" | "Approve", { label: string; page: PageId; tab?: string; navKey?: string }]> = [
    [/approve|reject/i, "Sales", "Approve", { label: "PI & Approvals", page: "finance", tab: "PI Approvals", navKey: "sal-pi" }],
    [/refund|write off/i, "Returns", "Approve", { label: "Returns", page: "quality", tab: "Returns", navKey: "qly-ret" }],
    [/pay|payment/i, "Payments", "Edit", { label: "Payables", page: "finance", tab: "Payables", navKey: "fin-pay" }],
    [/post to tally/i, "Payments", "Edit", { label: "Tally (prototype)", page: "finance", tab: "Tally", navKey: "fin-tally" }],
    [/dispatch now/i, "Dispatch", "Edit", { label: "Dispatch & LR", page: "dispatch", navKey: "dsp-ship" }],
    [/adjust stock/i, "Inventory", "Edit", { label: "Inventory", page: "inventory", navKey: "inv-stock" }],
  ];
  const hit = needs.find(([re]) => re.test(q));
  if (!hit) return null;
  const [, module, permission, nav] = hit;
  if (!d.can(module, permission)) {
    return {
      text: `You don't have permission to perform this action as ${d.activeRole}.`,
      detail: `It needs ${permission} on ${module}.`,
      denied: { module, permission },
      tone: "error",
    };
  }
  return {
    text: "This changes records, money or stock, so I won't do it from chat.",
    detail: "Open the screen that owns the control and confirm it there — the approval trail records who acted.",
    confirm: { question: `Take me to ${nav.label}?` },
    navigate: nav,
    tone: "warning",
  };
}

/* ---------------------------------------------------------------- entry */
export function answer(d: AiData, ctx: AiContext, question: string): AiReply {
  try {
    return resolve(d, ctx, question);
  } catch {
    /* A rule bug must never leave the assistant hanging — say so plainly. */
    return {
      text: "Something went wrong reading that.",
      detail: "The assistant could not resolve this question from the current data. Try a different question, or open the module directly.",
      tone: "error",
    };
  }
}

function resolve(d: AiData, ctx: AiContext, question: string): AiReply {
  const q = question.trim();
  if (!q) return { text: "Ask me about orders, stock, production, dispatch or accounts." };

  const sensitive = sensitiveIntent(d, q);
  if (sensitive) return sensitive;

  const create = createIntent(d, ctx, q);
  if (create) return create;

  for (const rule of RULES) {
    if (rule.match.test(q)) return rule.run(d, ctx, q);
  }

  const entity = findEntity(d, q);
  if (entity) return entity;

  /* Honest fallback — no invented answer. */
  return {
    text: "I can't answer that one yet.",
    detail:
      "This assistant runs on rules over your own ERP data, so it handles questions about pending work, receivables, stock, production, dispatch, returns, accounts, tasks and specific record ids. Try one of the suggestions below.",
    tone: "neutral",
  };
}

/* ---------------------------------------------------------------- prompts */
export function suggestionsFor(page: PageId): string[] {
  switch (page) {
    case "dashboard":
      return ["What needs attention?", "Today's sales", "Pending approvals", "Low stock", "Dispatch due today"];
    case "leads":
    case "customers":
      return ["Show outstanding", "Pending approvals", "My tasks", "Today's sales"];
    case "sales":
      return ["Show receivables", "Dispatch due today", "Today's sales", "Pending approvals"];
    case "purchase":
      return ["Pending supplier approvals", "GRN pending", "Purchase deviations", "Low stock"];
    case "production":
      return ["Today's production", "Material shortage", "Finished stock available", "Production variance"];
    case "inventory":
      return ["Low stock", "Finished stock available", "FIFO status", "Open gate passes"];
    case "quality":
      return ["Returns in progress", "Reprocessing status", "Pending approvals"];
    case "dispatch":
      return ["Dispatch due today", "Shipment status", "Low stock", "Delivery issues"];
    case "finance":
      return ["Outstanding receivables", "Bank difference", "Tally queue", "Payment due"];
    case "team":
      return ["My tasks", "Unread notifications", "Pending approvals"];
    default:
      return ["What needs attention?", "Show receivables", "Low stock", "My tasks"];
  }
}

/** Context line shown in the composer, so the assistant feels situated. */
export function contextPlaceholder(ctx: AiContext): string {
  if (ctx.recordId) return `Ask about ${ctx.recordLabel ?? ctx.recordId}...`;
  switch (ctx.page) {
    case "customers": return "Ask about this customer...";
    case "sales": return "Ask about orders, quotations or payments...";
    case "production": return "Ask about production...";
    case "finance": return "Ask about payments, receivables or accounting...";
    case "dispatch": return "Ask about dispatch and delivery...";
    case "purchase": return "Ask about suppliers, GRN or deviations...";
    case "inventory": return "Ask about stock and warehouse...";
    case "quality": return "Ask about returns and inspections...";
    default: return "Ask anything about your ERP...";
  }
}

export { inr as aiFormatINR };
