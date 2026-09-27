import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  seedAssignments,
  seedBoms,
  seedManufacturers,
  seedMaterials,
  seedProductionOrders,
  seedStockLots,
} from "@/data/productionData";
import type {
  Bom,
  BomLine,
  CmAssignment,
  ContractManufacturer,
  DailyProductionEntry,
  MaterialItem,
  ProductionOrder,
  StockLot,
} from "@/types";

interface ProductionStore {
  materials: MaterialItem[];
  boms: Bom[];
  orders: ProductionOrder[];
  lots: StockLot[];
  manufacturers: ContractManufacturer[];
  assignments: CmAssignment[];
  addProductionOrder: (draft: Omit<ProductionOrder, "id" | "producedQty" | "rejectedQty" | "status" | "created" | "entries" | "timeline">, event?: string) => ProductionOrder;
  updateProductionOrder: (id: string, patch: Partial<ProductionOrder>, event?: string) => void;
  /** Issues material and stamps the manufacturing batch for traceability. */
  issueMaterials: (id: string) => void;
  /** Revises a formulation into a new version; the old one is preserved. */
  reviseBom: (id: string, lines: BomLine[], reason: string, revisedBy: string) => Bom | undefined;
  addDailyEntry: (id: string, draft: Omit<DailyProductionEntry, "id">) => DailyProductionEntry;
  adjustPlan: (id: string, newQty: number, by: string, remarks: string) => void;
  addBom: (draft: Omit<Bom, "id" | "created" | "version">) => Bom;
  addMaterial: (draft: Omit<MaterialItem, "id" | "movements" | "consumed" | "reserved">) => MaterialItem;
  logMaterialMovement: (id: string, text: string, qty: number) => void;
  addLot: (draft: Omit<StockLot, "id" | "remaining">) => StockLot;
  consumeFifo: (sku: string, qty: number) => { lotId: string; qty: number; rate: number }[];
  addManufacturer: (draft: Omit<ContractManufacturer, "id" | "since" | "active">) => ContractManufacturer;
  updateManufacturer: (id: string, patch: Partial<ContractManufacturer>) => void;
  addAssignment: (draft: Omit<CmAssignment, "id" | "readyQty" | "status" | "updates">, event?: string) => CmAssignment;
  updateAssignment: (id: string, patch: Partial<CmAssignment>, event?: string) => void;
}

const ProductionContext = createContext<ProductionStore | null>(null);

export function useProduction(): ProductionStore {
  const ctx = useContext(ProductionContext);
  if (!ctx) throw new Error("useProduction must be used inside ProductionProvider");
  return ctx;
}

/* Batch codes read like the plant's own: MS/<plant line>/<order serial>.
   Deterministic from the order id so the same order always shows the same batch. */
function batchFor(order: ProductionOrder) {
  if (order.batchNo) return order.batchNo;
  const serial = order.id.replace(/\D/g, "").slice(-4) || "0001";
  return `MS/${order.plant.includes("Line") ? order.plant.split("·").pop()?.trim().replace(/\s+/g, "") : "VAPI"}/B${serial}`;
}

export function ProductionProvider({ children }: { children: React.ReactNode }) {
  const [materials, setMaterials] = useState<MaterialItem[]>(seedMaterials);
  const [boms, setBoms] = useState<Bom[]>(seedBoms);
  const [orders, setOrders] = useState<ProductionOrder[]>(seedProductionOrders);
  const [lots, setLots] = useState<StockLot[]>(seedStockLots);
  const [manufacturers, setManufacturers] = useState<ContractManufacturer[]>(seedManufacturers);
  const [assignments, setAssignments] = useState<CmAssignment[]>(seedAssignments);

  const orderCounter = useRef(2604);
  const entryCounter = useRef(2608);
  const bomCounter = useRef(2604);
  const materialCounter = useRef(6);
  const lotCounter = useRef(2602);
  const cmCounter = useRef(4);
  const assignmentCounter = useRef(2603);

  const updateProductionOrder = useCallback<ProductionStore["updateProductionOrder"]>((id, patch, event) => {
    setOrders(list =>
      list.map(o =>
        o.id === id
          ? { ...o, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...o.timeline] : o.timeline }
          : o,
      ),
    );
  }, []);

  const addProductionOrder = useCallback<ProductionStore["addProductionOrder"]>((draft, event) => {
    const full: ProductionOrder = {
      ...draft,
      id: `PRD-${orderCounter.current++}`,
      producedQty: 0,
      rejectedQty: 0,
      status: "Planned",
      created: "08 Mar 2026",
      entries: [],
      timeline: [{ text: event ?? "Production order created", time: "Just now" }],
    };
    setOrders(list => [full, ...list]);
    return full;
  }, []);

  /* Issuing reserves the planned quantity out of raw material and packaging. */
  const reviseBom = useCallback<ProductionStore["reviseBom"]>((id, lines, reason, revisedBy) => {
    let created: Bom | undefined;
    setBoms(list => {
      const source = list.find(b => b.id === id);
      if (!source) return list;
      const baseId = source.baseId ?? source.id;
      const version = (source.version ?? 1) + 1;
      created = {
        ...source,
        id: `${baseId}-V${version}`,
        version,
        lines,
        baseId,
        previousVersionId: source.id,
        supersededById: undefined,
        revisionReason: reason,
        createdBy: revisedBy,
        created: "Just now",
      };
      return [created, ...list.map(b => (b.id === id ? { ...b, supersededById: created!.id } : b))];
    });
    return created;
  }, []);

  const issueMaterials = useCallback<ProductionStore["issueMaterials"]>(id => {
    setOrders(list =>
      list.map(o => {
        if (o.id !== id) return o;
        setMaterials(mats =>
          mats.map(m => {
            const line = o.consumption.find(c => c.materialId === m.id);
            if (!line) return m;
            return {
              ...m,
              available: Math.max(0, m.available - line.planned),
              reserved: m.reserved + line.planned,
              movements: [
                { text: `Issued to ${o.id} · ${o.product} · batch ${batchFor(o)}`, qty: -line.planned, time: "Just now" },
                ...m.movements,
              ],
            };
          }),
        );
        const batchNo = batchFor(o);
        return {
          ...o,
          status: "Material Issued",
          batchNo,
          mfgDate: o.mfgDate ?? "08 Mar 2026",
          /* Each material carries the supplier lot it came out of, so a finished
             batch can be traced back to the exact incoming consignment. */
          consumption: o.consumption.map(c => ({
            ...c,
            issuedLot: c.issuedLot ?? `${c.materialId.toUpperCase()}/LOT-${batchNo.slice(-3)}`,
          })),
          timeline: [
            { text: `Material issued against ${o.bomId ?? "the formulation"} · batch ${batchNo}`, time: "Just now" },
            ...o.timeline,
          ],
        };
      }),
    );
  }, []);

  const addDailyEntry = useCallback<ProductionStore["addDailyEntry"]>((id, draft) => {
    const full: DailyProductionEntry = { ...draft, id: `DPR-${entryCounter.current++}` };
    setOrders(list =>
      list.map(o => {
        if (o.id !== id) return o;
        const producedQty = o.producedQty + draft.produced;
        const rejectedQty = o.rejectedQty + draft.rejected;
        return {
          ...o,
          producedQty,
          rejectedQty,
          status: o.status === "Planned" || o.status === "Material Issued" ? "In Production" : o.status,
          entries: [full, ...o.entries],
          timeline: [
            { text: `Daily report ${full.id} — ${draft.produced} produced${draft.rejected ? `, ${draft.rejected} rejected` : ""}`, time: "Just now" },
            ...o.timeline,
          ],
        };
      }),
    );
    return full;
  }, []);

  const adjustPlan = useCallback<ProductionStore["adjustPlan"]>((id, newQty, by, remarks) => {
    setOrders(list =>
      list.map(o => {
        if (o.id !== id) return o;
        const pct = Math.round((newQty / o.plannedQty) * 100);
        return {
          ...o,
          plannedQty: newQty,
          adjustmentPct: pct,
          adjustedBy: by,
          timeline: [{ text: `Plan adjusted to ${newQty} units (${pct}% of original) by ${by} — “${remarks}”`, time: "Just now" }, ...o.timeline],
        };
      }),
    );
  }, []);

  const addBom = useCallback<ProductionStore["addBom"]>(draft => {
    const full: Bom = { ...draft, id: `BOM-${bomCounter.current++}`, version: 1, created: "08 Mar 2026" };
    setBoms(list => [full, ...list]);
    return full;
  }, []);

  const addMaterial = useCallback<ProductionStore["addMaterial"]>(draft => {
    const prefix = draft.kind === "Packaging" ? "pkg" : "mat";
    const full: MaterialItem = {
      ...draft,
      id: `${prefix}-${String(materialCounter.current++).padStart(2, "0")}`,
      reserved: 0,
      consumed: 0,
      movements: [{ text: "Opening stock recorded", qty: draft.available, time: "Just now" }],
    };
    setMaterials(list => [...list, full]);
    return full;
  }, []);

  const logMaterialMovement = useCallback<ProductionStore["logMaterialMovement"]>((id, text, qty) => {
    setMaterials(list =>
      list.map(m =>
        m.id === id
          ? {
              ...m,
              available: Math.max(0, m.available + qty),
              consumed: qty < 0 ? m.consumed - qty : m.consumed,
              movements: [{ text, qty, time: "Just now" }, ...m.movements],
            }
          : m,
      ),
    );
  }, []);

  const addLot = useCallback<ProductionStore["addLot"]>(draft => {
    const full: StockLot = { ...draft, id: `FG-LOT-${lotCounter.current++}`, remaining: draft.qty };
    setLots(list => [...list, full]);
    return full;
  }, []);

  /* FIFO: consume the oldest remaining lot first and report what was taken. */
  const consumeFifo = useCallback<ProductionStore["consumeFifo"]>((sku, qty) => {
    const taken: { lotId: string; qty: number; rate: number }[] = [];
    setLots(list => {
      let left = qty;
      const ordered = [...list].sort((a, b) => a.dateRank - b.dateRank);
      const next = ordered.map(lot => {
        if (left <= 0 || lot.sku !== sku || lot.remaining <= 0) return lot;
        const use = Math.min(lot.remaining, left);
        left -= use;
        taken.push({ lotId: lot.id, qty: use, rate: lot.rate });
        return { ...lot, remaining: lot.remaining - use };
      });
      return next;
    });
    return taken;
  }, []);

  const addManufacturer = useCallback<ProductionStore["addManufacturer"]>(draft => {
    const full: ContractManufacturer = { ...draft, id: `cm-${String(cmCounter.current++).padStart(2, "0")}`, since: "2026", active: true };
    setManufacturers(list => [...list, full]);
    return full;
  }, []);

  const updateManufacturer = useCallback<ProductionStore["updateManufacturer"]>((id, patch) => {
    setManufacturers(list => list.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const addAssignment = useCallback<ProductionStore["addAssignment"]>((draft, event) => {
    const full: CmAssignment = {
      ...draft,
      id: `CMA-${assignmentCounter.current++}`,
      readyQty: 0,
      status: "Sent",
      updates: [{ text: event ?? "Approved PI and specifications sent to the contract manufacturer", time: "Just now" }],
    };
    setAssignments(list => [full, ...list]);
    return full;
  }, []);

  const updateAssignment = useCallback<ProductionStore["updateAssignment"]>((id, patch, event) => {
    setAssignments(list =>
      list.map(a =>
        a.id === id
          ? { ...a, ...patch, updates: event ? [{ text: event, time: "Just now" }, ...a.updates] : a.updates }
          : a,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      materials, boms, orders, lots, manufacturers, assignments,
      addProductionOrder, updateProductionOrder, issueMaterials, addDailyEntry, adjustPlan,
      addBom, reviseBom, addMaterial, logMaterialMovement, addLot, consumeFifo,
      addManufacturer, updateManufacturer, addAssignment, updateAssignment,
    }),
    [
      materials, boms, orders, lots, manufacturers, assignments,
      addProductionOrder, updateProductionOrder, issueMaterials, addDailyEntry, adjustPlan,
      addBom, reviseBom, addMaterial, logMaterialMovement, addLot, consumeFifo,
      addManufacturer, updateManufacturer, addAssignment, updateAssignment,
    ],
  );

  return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>;
}
