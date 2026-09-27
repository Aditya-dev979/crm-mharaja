import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import type { PageId } from "@/components/layout/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { useCrm } from "@/hooks/useCrm";
import { useDispatch } from "@/hooks/useDispatch";
import { useFinance } from "@/hooks/useFinance";
import { useProducts } from "@/hooks/useProducts";
import { useProduction } from "@/hooks/useProduction";
import { usePurchase } from "@/hooks/usePurchase";
import { useQuality } from "@/hooks/useQuality";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils";
import {
  answer,
  contextPlaceholder,
  suggestionsFor,
  type AiContext,
  type AiData,
  type AiProposal,
  type AiReply,
} from "./aiEngine";

/* ============================================================================
   MAHARAJA AI · the ERP's own assistant surface.

   It composes existing primitives (Button, Badge, Icon) and reads existing
   stores through existing hooks. It writes only through flows that already
   exist — addTask for a follow-up, addLeadEvent for a note — so there is no
   second task system and no second data store.

   No AI model or API is involved: answers come from the rule engine in
   aiEngine.ts, which is why every surface is labelled Demo Mode.
   ========================================================================== */

interface Turn {
  id: number;
  role: "user" | "ai";
  text: string;
  reply?: AiReply;
  /** Set once a proposal on this turn has been carried out. */
  done?: string;
}

export default function MaharajaAi({
  page,
  pageName,
  contextId,
  contextLabel,
  onNavigate,
  onOpenRecord,
}: {
  page: PageId;
  pageName: string;
  contextId?: string;
  contextLabel?: string;
  onNavigate: (id: PageId, tab?: string, navKey?: string) => void;
  onOpenRecord: (recordId?: string, fallbackTarget?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(1);
  const timer = useRef<number | undefined>(undefined);

  const { leads, customers } = useCrm();
  const { orders, quotations } = useSales();
  const { products } = useProducts();
  const { materials, lots, orders: productionOrders } = useProduction();
  const { shipments } = useDispatch();
  const { returns } = useQuality();
  const { requests: purchaseRequests, pos, deviations, grns } = usePurchase();
  const { docs: financeDocs, bankTransactions, tallyEntries, expenses } = useFinance();
  const { tasks, teamNotifications, addTask, logAudit, addNotification } = useTeam();
  const { can, currentUser, activeRole } = useAdmin();
  const toast = useToast();

  const data = useMemo<AiData>(
    () => ({
      leads: leads as unknown as AiData["leads"],
      customers: customers as unknown as AiData["customers"],
      orders: orders as unknown as AiData["orders"],
      quotations: quotations as unknown as AiData["quotations"],
      products: products as unknown as AiData["products"],
      materials: materials as unknown as AiData["materials"],
      lots: lots as unknown as AiData["lots"],
      productionOrders: productionOrders as unknown as AiData["productionOrders"],
      shipments: shipments as unknown as AiData["shipments"],
      returns: returns as unknown as AiData["returns"],
      purchaseRequests: purchaseRequests as unknown as AiData["purchaseRequests"],
      pos: pos as unknown as AiData["pos"],
      deviations: deviations as unknown as AiData["deviations"],
      grns: grns as unknown as AiData["grns"],
      financeDocs: financeDocs as unknown as AiData["financeDocs"],
      bankLines: bankTransactions as unknown as AiData["bankLines"],
      tallyEntries: tallyEntries as unknown as AiData["tallyEntries"],
      tasks: tasks as unknown as AiData["tasks"],
      notifications: teamNotifications as unknown as AiData["notifications"],
      expenses: expenses as unknown as AiData["expenses"],
      customOrders: [],
      repairs: [],
      currentUser,
      activeRole,
      can,
    }),
    [
      leads, customers, orders, quotations, products, materials, lots, productionOrders,
      shipments, returns, purchaseRequests, pos, deviations, grns, financeDocs, bankTransactions,
      tallyEntries, tasks, teamNotifications, expenses, currentUser, activeRole, can,
    ],
  );

  const ctx = useMemo<AiContext>(
    () => ({ page, pageName, recordId: contextId, recordLabel: contextLabel }),
    [page, pageName, contextId, contextLabel],
  );
  const suggestions = suggestionsFor(page);

  /* Keep the newest turn in view. */
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [turns, thinking, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* Escape closes, matching every other overlay in the app. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const busy = useRef(false);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking || busy.current) return;
    busy.current = true;
    window.setTimeout(() => { busy.current = false; }, 360);
    setTurns(t => [...t, { id: seq.current++, role: "user", text: q }]);
    setDraft("");
    setThinking(true);
    /* A short pause so the exchange reads as a conversation. This is local
       interaction pacing, not network latency — nothing is being called. */
    timer.current = window.setTimeout(() => {
      try {
        const reply = answer(data, ctx, q);
        setTurns(t => [...t, { id: seq.current++, role: "ai", text: reply.text, reply }]);
      } finally {
        /* Always clears, so a bad answer can never leave the panel spinning. */
        setThinking(false);
      }
    }, 320);
  };

  const runProposal = (turnId: number, proposal: AiProposal) => {
    if (proposal.module && proposal.permission && !can(proposal.module, proposal.permission)) {
      toast({ tone: "error", title: "Not permitted", message: `${activeRole} cannot ${proposal.permission.toLowerCase()} in ${proposal.module}.` });
      return;
    }
    if (proposal.kind === "task") {
      /* Uses the existing task store — the same records the Tasks board shows. */
      const created = addTask({
        title: proposal.payload.title,
        detail: proposal.payload.detail,
        assignee: proposal.payload.assignee,
        due: proposal.payload.due,
        dueDay: 0,
        priority: "Medium",
        related: proposal.payload.related || undefined,
      });
      addNotification({
        type: "New Task",
        priority: "Normal",
        title: `${created.id} · ${created.title}`,
        message: `Created from Maharaja AI · ${created.assignee} · due ${created.due}`,
        reference: created.id,
        recordRef: { kind: "task", id: created.id },
      });
      logAudit({
        user: currentUser,
        action: "Task created from AI assistant",
        module: "CRM",
        record: `${created.id} · ${created.title}`,
        newValue: `${created.assignee} · due ${created.due}`,
      });
      setTurns(t => t.map(x => (x.id === turnId ? { ...x, done: `${created.id} created and assigned to ${created.assignee}.` } : x)));
      toast({ tone: "success", title: "Task created", message: `${created.id} · due ${created.due}` });
    }
  };

  const go = (nav: NonNullable<AiReply["navigate"]>) => {
    onNavigate(nav.page, nav.tab, nav.navKey);
    setOpen(false);
  };

  const openCard = (openId?: string, fallback?: string) => {
    if (!openId && !fallback) return;
    onOpenRecord(openId, fallback);
    setOpen(false);
  };

  return (
    <>
      {/* Launcher — navy with a champagne ring, clear of the content column. */}
      <button
        type="button"
        className={cn("ai-launcher", open && "is-open")}
        aria-label="Open Maharaja AI, your ERP assistant"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ai-launcher-mark" aria-hidden="true">
          <Icon name="droplet" size={19} />
        </span>
        <span className="ai-launcher-tip">Maharaja AI · ERP Assistant</span>
      </button>

      {open && <div className="ai-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        className={cn("ai-panel", open && "is-open")}
        role="dialog"
        aria-modal="false"
        aria-label="Maharaja AI ERP assistant"
        aria-hidden={!open}
      >
        <header className="ai-head">
          <div className="ai-head-id">
            <span className="ai-head-mark" aria-hidden="true"><Icon name="droplet" size={17} /></span>
            <div>
              <strong>MAHARAJA AI</strong>
              <small>ERP Assistant</small>
            </div>
          </div>
          <div className="ai-head-actions">
            <Badge tone="gold">Demo Mode</Badge>
            <button type="button" className="ai-icon-btn" aria-label="Start a new chat" onClick={() => setTurns([])}>
              <Icon name="plus" size={15} />
            </button>
            <button type="button" className="ai-icon-btn" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <Icon name="close" size={15} />
            </button>
          </div>
        </header>

        <div className="ai-context">
          <span>Current context</span>
          <strong>{contextId ? `${contextLabel ?? contextId}` : pageName}</strong>
        </div>

        <div className="ai-feed" ref={feedRef}>
          {turns.length === 0 && (
            <div className="ai-welcome">
              <span className="ai-welcome-mark" aria-hidden="true"><Icon name="droplet" size={24} /></span>
              <h3>How can I help you today?</h3>
              <p>
                Ask, analyse, create and navigate. I read this workspace's own records — orders, stock, production,
                dispatch and accounts — and answer from them.
              </p>
            </div>
          )}

          {turns.map(turn =>
            turn.role === "user" ? (
              <div key={turn.id} className="ai-turn user">
                <p>{turn.text}</p>
              </div>
            ) : (
              <div key={turn.id} className={cn("ai-turn ai", turn.reply?.tone && `tone-${turn.reply.tone}`)}>
                <p className="ai-answer">{turn.text}</p>
                {turn.reply?.detail && <p className="ai-detail">{turn.reply.detail}</p>}

                {turn.reply?.denied && (
                  <div className="ai-denied">
                    <Icon name="lock" size={14} />
                    <span>Needs {turn.reply.denied.permission} on {turn.reply.denied.module}.</span>
                    <button type="button" className="link-btn" onClick={() => { onNavigate("admin", "Roles & Permissions"); setOpen(false); }}>
                      Open permission details
                    </button>
                  </div>
                )}

                {turn.reply?.cards && turn.reply.cards.length > 0 && (
                  <ul className="ai-cards">
                    {turn.reply.cards.map(card => (
                      <li key={card.id}>
                        <div className="ai-card-body">
                          <strong>{card.title}</strong>
                          <small>{card.meta}</small>
                        </div>
                        {card.amount && <span className="ai-card-amount">{card.amount}</span>}
                        <Button variant="ghost" onClick={() => openCard(card.openId, card.fallback)}>
                          {card.actionLabel ?? "Open"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {turn.reply?.proposal && !turn.done && (
                  <div className="ai-proposal">
                    <h4>{turn.reply.proposal.kind === "task" ? "Task to create" : "Note to add"}</h4>
                    <ul>
                      {turn.reply.proposal.summary.map(line => <li key={line}>{line}</li>)}
                    </ul>
                    <div className="ai-proposal-actions">
                      <Button onClick={() => runProposal(turn.id, turn.reply!.proposal!)}>{turn.reply.proposal.label}</Button>
                      <Button
                        variant="secondary"
                        onClick={() => setTurns(t => t.map(x => (x.id === turn.id ? { ...x, done: "Cancelled — nothing was created." } : x)))}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {turn.done && (
                  <p className="ai-done"><Icon name="check" size={13} /> {turn.done}</p>
                )}

                {turn.reply?.navigate && (
                  <div className="ai-nav-action">
                    {turn.reply.confirm && <p className="ai-confirm-q">{turn.reply.confirm.question}</p>}
                    <Button variant="secondary" onClick={() => go(turn.reply!.navigate!)}>
                      {turn.reply.confirm ? "Confirm" : turn.reply.navigate.label}
                      <Icon name="arrow" size={14} />
                    </Button>
                    {turn.reply.confirm && (
                      <Button variant="ghost" onClick={() => setTurns(t => t.map(x => (x.id === turn.id ? { ...x, done: "Cancelled." } : x)))}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ),
          )}

          {thinking && (
            <div className="ai-turn ai">
              <p className="ai-working" role="status">
                <i /><i /><i /> Reading your ERP data…
              </p>
            </div>
          )}
        </div>

        <div className="ai-suggest">
          {suggestions.map(sug => (
            <button key={sug} type="button" onClick={() => ask(sug)} disabled={thinking}>{sug}</button>
          ))}
        </div>

        <form
          className="ai-composer"
          onSubmit={e => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={contextPlaceholder(ctx)}
            aria-label="Ask Maharaja AI"
          />
          <Button type="submit" disabled={!draft.trim() || thinking} aria-label="Send">
            <Icon name="send" size={15} />
          </Button>
        </form>
        <p className="ai-foot">Powered by ERP Demo Intelligence · answers are generated from this workspace's own data, not an external AI service.</p>
      </aside>
    </>
  );
}
