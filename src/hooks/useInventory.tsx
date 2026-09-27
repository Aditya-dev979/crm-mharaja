import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedGatePasses, seedSessions, seedTransfers } from "@/data/inventoryData";
import type { GatePass, TransferRequest, VerificationLine, VerificationSession } from "@/types";

interface InventoryStore {
  transfers: TransferRequest[];
  sessions: VerificationSession[];
  addTransfer: (transfer: Omit<TransferRequest, "id" | "date" | "status">) => TransferRequest;
  updateTransfer: (id: string, patch: Partial<TransferRequest>) => void;
  addSession: (location: string, lines: VerificationLine[]) => VerificationSession;
  updateSession: (id: string, patch: Partial<VerificationSession>) => void;
  setCount: (sessionId: string, productId: string, counted: number | null) => void;
  gatePasses: GatePass[];
  addGatePass: (draft: Omit<GatePass, "id" | "status" | "timeline">, event?: string) => GatePass;
  updateGatePass: (id: string, patch: Partial<GatePass>, event?: string) => void;
}

const InventoryContext = createContext<InventoryStore | null>(null);

export function useInventory(): InventoryStore {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside InventoryProvider");
  return ctx;
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [transfers, setTransfers] = useState<TransferRequest[]>(seedTransfers);
  const [sessions, setSessions] = useState<VerificationSession[]>(seedSessions);
  const [gatePasses, setGatePasses] = useState<GatePass[]>(seedGatePasses);
  const gatePassCounter = useRef(2604);
  const transferCounter = useRef(26013);
  const sessionCounter = useRef(2604);

  const addTransfer = useCallback((transfer: Omit<TransferRequest, "id" | "date" | "status">) => {
    const full: TransferRequest = {
      ...transfer,
      id: `TR-${transferCounter.current++}`,
      date: "Just now",
      status: "Pending Approval",
    };
    setTransfers(list => [full, ...list]);
    return full;
  }, []);

  const updateTransfer = useCallback((id: string, patch: Partial<TransferRequest>) => {
    setTransfers(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addSession = useCallback((location: string, lines: VerificationLine[]) => {
    const full: VerificationSession = {
      id: `PV-${sessionCounter.current++}`,
      location,
      startedBy: "Arjun Sharma",
      date: "Just now",
      status: "In Progress",
      lines,
    };
    setSessions(list => [full, ...list]);
    return full;
  }, []);

  const updateSession = useCallback((id: string, patch: Partial<VerificationSession>) => {
    setSessions(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addGatePass = useCallback<InventoryStore["addGatePass"]>((draft, event) => {
    const full: GatePass = {
      ...draft,
      id: `GP-${gatePassCounter.current++}`,
      status: "Pending Approval",
      timeline: [{ text: event ?? "Gate pass raised", time: "Just now" }],
    };
    setGatePasses(list => [full, ...list]);
    return full;
  }, []);

  const updateGatePass = useCallback<InventoryStore["updateGatePass"]>((id, patch, event) => {
    setGatePasses(list =>
      list.map(g =>
        g.id === id
          ? { ...g, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...g.timeline] : g.timeline }
          : g,
      ),
    );
  }, []);

  const setCount = useCallback((sessionId: string, productId: string, counted: number | null) => {
    setSessions(list =>
      list.map(s =>
        s.id === sessionId
          ? { ...s, lines: s.lines.map(l => (l.productId === productId ? { ...l, counted } : l)) }
          : s,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ transfers, sessions, addTransfer, updateTransfer, addSession, updateSession, setCount, gatePasses, addGatePass, updateGatePass }),
    [transfers, sessions, addTransfer, updateTransfer, addSession, updateSession, setCount, gatePasses, addGatePass, updateGatePass],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
