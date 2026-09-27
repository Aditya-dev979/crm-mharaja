import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedOrders, seedQuotations } from "@/data/salesData";
import type { OrderPayment, SalesOrder, SalesQuotation } from "@/types";

interface SalesStore {
  quotations: SalesQuotation[];
  orders: SalesOrder[];
  addQuotation: (quote: Omit<SalesQuotation, "id" | "created" | "timeline">) => SalesQuotation;
  updateQuotation: (id: string, patch: Partial<SalesQuotation>, event?: string) => void;
  /** Creates the next version of a quotation; the old one is superseded but kept. */
  reviseQuotation: (id: string, patch: Partial<SalesQuotation>, reason: string) => SalesQuotation | undefined;
  addOrder: (order: Omit<SalesOrder, "id" | "created" | "timeline" | "payments">, firstEvent: string) => SalesOrder;
  updateOrder: (id: string, patch: Partial<SalesOrder>, event?: string) => void;
  addPayment: (orderId: string, payment: Omit<OrderPayment, "id" | "date">) => OrderPayment;
  nextInvoiceId: () => string;
}

const SalesContext = createContext<SalesStore | null>(null);

export function useSales(): SalesStore {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error("useSales must be used inside SalesProvider");
  return ctx;
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [quotations, setQuotations] = useState<SalesQuotation[]>(seedQuotations);
  const [orders, setOrders] = useState<SalesOrder[]>(seedOrders);
  const quoteCounter = useRef(260186);
  const orderCounter = useRef(260186);
  const receiptCounter = useRef(26141);
  const invoiceCounter = useRef(26098);

  const addQuotation = useCallback((quote: Omit<SalesQuotation, "id" | "created" | "timeline">) => {
    const full: SalesQuotation = {
      ...quote,
      id: `QT-${quoteCounter.current++}`,
      created: "Just now",
      timeline: [{ text: `Quotation created by ${quote.executive}`, time: "Just now" }],
    };
    setQuotations(list => [full, ...list]);
    return full;
  }, []);

  /* A revision never edits history in place: the current version is marked
     superseded and a new Draft version is created from it. */
  const reviseQuotation = useCallback<SalesStore["reviseQuotation"]>((id, patch, reason) => {
    let created: SalesQuotation | undefined;
    setQuotations(list => {
      const source = list.find(q => q.id === id);
      if (!source) return list;
      const baseId = source.baseId ?? source.id;
      const nextVersion = Math.max(...list.filter(q => (q.baseId ?? q.id) === baseId).map(q => q.version ?? 1)) + 1;
      created = {
        ...source,
        ...patch,
        id: `${baseId}-R${nextVersion}`,
        version: nextVersion,
        baseId,
        previousVersionId: source.id,
        supersededById: undefined,
        status: "Draft",
        orderId: undefined,
        created: "Just now",
        timeline: [{ text: `Version ${nextVersion} drafted from ${source.id} — ${reason}`, time: "Just now" }],
      };
      return [
        created,
        ...list.map(q =>
          q.id === id
            ? {
                ...q,
                supersededById: created!.id,
                timeline: [{ text: `Superseded by ${created!.id} — ${reason}`, time: "Just now" }, ...q.timeline],
              }
            : q,
        ),
      ];
    });
    return created;
  }, []);

  const updateQuotation = useCallback((id: string, patch: Partial<SalesQuotation>, event?: string) => {
    setQuotations(list =>
      list.map(q =>
        q.id === id
          ? { ...q, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...q.timeline] : q.timeline }
          : q,
      ),
    );
  }, []);

  const addOrder = useCallback((order: Omit<SalesOrder, "id" | "created" | "timeline" | "payments">, firstEvent: string) => {
    const full: SalesOrder = {
      ...order,
      id: `SO-${orderCounter.current++}`,
      created: "Just now",
      payments: [],
      timeline: [{ text: firstEvent, time: "Just now" }],
    };
    setOrders(list => [full, ...list]);
    return full;
  }, []);

  const updateOrder = useCallback((id: string, patch: Partial<SalesOrder>, event?: string) => {
    setOrders(list =>
      list.map(o =>
        o.id === id
          ? { ...o, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...o.timeline] : o.timeline }
          : o,
      ),
    );
  }, []);

  const addPayment = useCallback((orderId: string, payment: Omit<OrderPayment, "id" | "date">) => {
    const full: OrderPayment = { ...payment, id: `RC-${receiptCounter.current++}`, date: "Just now" };
    setOrders(list => list.map(o => (o.id === orderId ? { ...o, payments: [...o.payments, full] } : o)));
    return full;
  }, []);

  const nextInvoiceId = useCallback(() => `INV-${invoiceCounter.current++}`, []);

  const value = useMemo(
    () => ({ quotations, orders, addQuotation, updateQuotation, reviseQuotation, addOrder, updateOrder, addPayment, nextInvoiceId }),
    [quotations, orders, addQuotation, updateQuotation, reviseQuotation, addOrder, updateOrder, addPayment, nextInvoiceId],
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}
