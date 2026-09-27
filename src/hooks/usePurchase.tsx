import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { poTotals, seedDeviations, seedGrns, seedPOs, seedQuotationsPurchase, seedRequests, seedSuppliers } from "@/data/purchaseData";
import type { Grn, GrnDeviation, GrnLine, OrderPayment, POLine, PORevision, PurchaseOrder, PurchaseRequest, Supplier, SupplierQuotation } from "@/types";
import { formatINR } from "@/utils";

export interface PORevisionDraft {
  lines: POLine[];
  transport: number;
  deliveryDate: string;
  paymentTerms: string;
  transporter?: string;
  creditDays?: number;
}

interface PurchaseStore {
  suppliers: Supplier[];
  requests: PurchaseRequest[];
  pos: PurchaseOrder[];
  grns: Grn[];
  quotations: SupplierQuotation[];
  deviations: GrnDeviation[];
  addSupplierQuotation: (draft: Omit<SupplierQuotation, "id" | "received">) => SupplierQuotation;
  selectSupplierQuotation: (prId: string, quotationId: string, remarks: string, selectedBy: string) => void;
  /** Records a supplier's revised quote as a new version, preserving the old one. */
  reviseSupplierQuotation: (id: string, patch: Partial<SupplierQuotation>, reason: string) => SupplierQuotation | undefined;
  addDeviation: (draft: Omit<GrnDeviation, "id" | "created" | "timeline" | "status">) => GrnDeviation;
  updateDeviation: (id: string, patch: Partial<GrnDeviation>, event?: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  addRequest: (request: Omit<PurchaseRequest, "id" | "date" | "status">) => PurchaseRequest;
  updateRequest: (id: string, patch: Partial<PurchaseRequest>) => void;
  addPO: (po: Omit<PurchaseOrder, "id" | "created" | "grnIds" | "payments" | "timeline">, firstEvent: string) => PurchaseOrder;
  updatePO: (id: string, patch: Partial<PurchaseOrder>, event?: string) => void;
  /** Supersedes the current PO terms with a new version and keeps the old one on record. */
  revisePO: (id: string, next: PORevisionDraft, reason: string, revisedBy: string) => void;
  addPOPayment: (poId: string, payment: Omit<OrderPayment, "id" | "date">) => OrderPayment;
  addGrn: (grn: Omit<Grn, "id" | "timeline">, firstEvent: string) => Grn;
  updateGrn: (id: string, patch: Partial<Grn>, event?: string) => void;
  updateGrnLine: (grnId: string, index: number, patch: Partial<GrnLine>) => void;
}

const PurchaseContext = createContext<PurchaseStore | null>(null);

export function usePurchase(): PurchaseStore {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside PurchaseProvider");
  return ctx;
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(seedSuppliers);
  const [requests, setRequests] = useState<PurchaseRequest[]>(seedRequests);
  const [pos, setPOs] = useState<PurchaseOrder[]>(seedPOs);
  const [grns, setGrns] = useState<Grn[]>(seedGrns);
  const [quotations, setQuotations] = useState<SupplierQuotation[]>(seedQuotationsPurchase);
  const [deviations, setDeviations] = useState<GrnDeviation[]>(seedDeviations);
  const sqCounter = useRef(2604);
  const devCounter = useRef(2602);
  const supplierCounter = useRef(6);
  const prCounter = useRef(26032);
  const poCounter = useRef(260093);
  const grnCounter = useRef(260082);
  const paymentCounter = useRef(2612);

  const addSupplier = useCallback((supplier: Omit<Supplier, "id">) => {
    const full: Supplier = { ...supplier, id: `sup-${String(supplierCounter.current++).padStart(2, "0")}` };
    setSuppliers(list => [full, ...list]);
    return full;
  }, []);

  const updateSupplier = useCallback((id: string, patch: Partial<Supplier>) => {
    setSuppliers(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addRequest = useCallback((request: Omit<PurchaseRequest, "id" | "date" | "status">) => {
    const full: PurchaseRequest = { ...request, id: `PR-${prCounter.current++}`, date: "Just now", status: "Pending Approval" };
    setRequests(list => [full, ...list]);
    return full;
  }, []);

  const updateRequest = useCallback((id: string, patch: Partial<PurchaseRequest>) => {
    setRequests(list => list.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addPO = useCallback((po: Omit<PurchaseOrder, "id" | "created" | "grnIds" | "payments" | "timeline">, firstEvent: string) => {
    const full: PurchaseOrder = {
      ...po,
      id: `PO-${poCounter.current++}`,
      created: "Just now",
      grnIds: [],
      payments: [],
      timeline: [{ text: firstEvent, time: "Just now" }],
    };
    setPOs(list => [full, ...list]);
    return full;
  }, []);

  const updatePO = useCallback((id: string, patch: Partial<PurchaseOrder>, event?: string) => {
    setPOs(list =>
      list.map(po =>
        po.id === id
          ? { ...po, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...po.timeline] : po.timeline }
          : po,
      ),
    );
  }, []);

  /* A revised PO becomes a new version: the previous terms are archived, the
     approval is withdrawn and the order goes back to Draft for re-approval. */
  const revisePO = useCallback((id: string, next: PORevisionDraft, reason: string, revisedBy: string) => {
    setPOs(list =>
      list.map(po => {
        if (po.id !== id) return po;
        const previousTotal = poTotals(po).total;
        const newTotal = poTotals({ lines: next.lines, transport: next.transport, taxPct: po.taxPct }).total;
        const changes: string[] = [];
        next.lines.forEach((line, i) => {
          const before = po.lines[i];
          if (!before) return changes.push(`Line added — ${line.description}`);
          if (before.qty !== line.qty) changes.push(`${line.description}: qty ${before.qty} → ${line.qty}`);
          if (before.unitPrice !== line.unitPrice)
            changes.push(`${line.description}: rate ${formatINR(before.unitPrice)} → ${formatINR(line.unitPrice)}`);
        });
        if (po.transport !== next.transport)
          changes.push(`Transport & insurance ${formatINR(po.transport)} → ${formatINR(next.transport)}`);
        if (po.deliveryDate !== next.deliveryDate)
          changes.push(`Delivery ${po.deliveryDate} → ${next.deliveryDate}`);
        if (po.paymentTerms !== next.paymentTerms)
          changes.push(`Payment terms "${po.paymentTerms}" → "${next.paymentTerms}"`);
        if ((po.transporter ?? "") !== (next.transporter ?? ""))
          changes.push(`Transporter ${po.transporter || "unassigned"} → ${next.transporter || "unassigned"}`);
        if ((po.creditDays ?? 0) !== (next.creditDays ?? 0))
          changes.push(`Credit ${po.creditDays ?? 0} → ${next.creditDays ?? 0} days`);
        if (changes.length === 0) changes.push("Terms restated without a commercial change");

        const version = po.version ?? 1;
        const record: PORevision = {
          version,
          revisedOn: "Just now",
          revisedBy,
          reason,
          previousTotal,
          newTotal,
          changes,
          lines: po.lines,
          transport: po.transport,
          deliveryDate: po.deliveryDate,
          paymentTerms: po.paymentTerms,
        };
        return {
          ...po,
          lines: next.lines,
          transport: next.transport,
          deliveryDate: next.deliveryDate,
          paymentTerms: next.paymentTerms,
          transporter: next.transporter,
          creditDays: next.creditDays,
          version: version + 1,
          status: "Draft",
          approvedBy: undefined,
          approvedAt: undefined,
          revisions: [record, ...(po.revisions ?? [])],
          timeline: [
            { text: `Revised to version ${version + 1} by ${revisedBy} — ${reason}`, time: "Just now" },
            ...po.timeline,
          ],
        };
      }),
    );
  }, []);

  const addPOPayment = useCallback((poId: string, payment: Omit<OrderPayment, "id" | "date">) => {
    const full: OrderPayment = { ...payment, id: `SP-${paymentCounter.current++}`, date: "Just now" };
    setPOs(list => list.map(po => (po.id === poId ? { ...po, payments: [...po.payments, full] } : po)));
    return full;
  }, []);

  const addGrn = useCallback((grn: Omit<Grn, "id" | "timeline">, firstEvent: string) => {
    const full: Grn = { ...grn, id: `GRN-${grnCounter.current++}`, timeline: [{ text: firstEvent, time: "Just now" }] };
    setGrns(list => [full, ...list]);
    return full;
  }, []);

  const updateGrn = useCallback((id: string, patch: Partial<Grn>, event?: string) => {
    setGrns(list =>
      list.map(g =>
        g.id === id
          ? { ...g, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...g.timeline] : g.timeline }
          : g,
      ),
    );
  }, []);

  const updateGrnLine = useCallback((grnId: string, index: number, patch: Partial<GrnLine>) => {
    setGrns(list =>
      list.map(g =>
        g.id === grnId
          ? { ...g, lines: g.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }
          : g,
      ),
    );
  }, []);

  const addSupplierQuotation = useCallback<PurchaseStore["addSupplierQuotation"]>(draft => {
    const full: SupplierQuotation = { ...draft, id: `SQ-${sqCounter.current++}`, received: "Just now" };
    setQuotations(list => [...list, full]);
    return full;
  }, []);

  const reviseSupplierQuotation = useCallback<PurchaseStore["reviseSupplierQuotation"]>((id, patch, reason) => {
    let created: SupplierQuotation | undefined;
    setQuotations(list => {
      const source = list.find(q => q.id === id);
      if (!source) return list;
      const version = (source.version ?? 1) + 1;
      created = {
        ...source,
        ...patch,
        id: `${source.id}-R${version}`,
        version,
        revisionOfId: source.id,
        supersededById: undefined,
        selected: false,
        selectionRemarks: undefined,
        selectedBy: undefined,
        received: "Just now",
        remarks: reason,
      };
      return [created, ...list.map(q => (q.id === id ? { ...q, supersededById: created!.id } : q))];
    });
    return created;
  }, []);

  const selectSupplierQuotation = useCallback((prId: string, quotationId: string, remarks: string, selectedBy: string) => {
    setQuotations(list =>
      list.map(q =>
        q.prId === prId
          ? q.id === quotationId
            ? { ...q, selected: true, selectionRemarks: remarks, selectedBy, selectedAt: "Just now" }
            : { ...q, selected: false }
          : q,
      ),
    );
    setRequests(list => list.map(r => (r.id === prId ? { ...r, selectedQuotationId: quotationId } : r)));
  }, []);

  const addDeviation = useCallback<PurchaseStore["addDeviation"]>(draft => {
    const full: GrnDeviation = {
      ...draft,
      id: `DEV-${devCounter.current++}`,
      status: "Open",
      created: "Just now",
      timeline: [{ text: `Deviation raised from ${draft.grnId}`, time: "Just now" }],
    };
    setDeviations(list => [full, ...list]);
    return full;
  }, []);

  const updateDeviation = useCallback((id: string, patch: Partial<GrnDeviation>, event?: string) => {
    setDeviations(list =>
      list.map(d =>
        d.id === id
          ? { ...d, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...d.timeline] : d.timeline }
          : d,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      suppliers, requests, pos, grns, quotations, deviations,
      addSupplier, updateSupplier, addRequest, updateRequest,
      addPO, updatePO, revisePO, addPOPayment, addGrn, updateGrn, updateGrnLine,
      addSupplierQuotation, selectSupplierQuotation, reviseSupplierQuotation, addDeviation, updateDeviation,
    }),
    [suppliers, requests, pos, grns, quotations, deviations, addSupplier, updateSupplier, addRequest, updateRequest, addPO, updatePO, revisePO, addPOPayment, addGrn, updateGrn, updateGrnLine, addSupplierQuotation, selectSupplierQuotation, reviseSupplierQuotation, addDeviation, updateDeviation],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}
