import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { packingChecklist, seedMessages, seedShipments } from "@/data/dispatchData";
import type { CommMessage, Shipment } from "@/types";

interface DispatchStore {
  shipments: Shipment[];
  messages: CommMessage[];
  addShipment: (draft: Omit<Shipment, "id" | "status" | "checklist" | "created" | "timeline">) => Shipment;
  updateShipment: (id: string, patch: Partial<Shipment>, event?: string) => void;
  toggleChecklist: (id: string, index: number) => void;
  addMessage: (message: Omit<CommMessage, "id" | "time" | "status"> & { status?: CommMessage["status"] }) => CommMessage;
  /** Moves a simulated message between Draft → Sending → Sent / Failed. */
  updateMessage: (id: string, patch: Partial<CommMessage>) => void;
}

const DispatchContext = createContext<DispatchStore | null>(null);

export function useDispatch(): DispatchStore {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used inside DispatchProvider");
  return ctx;
}

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const [shipments, setShipments] = useState<Shipment[]>(seedShipments);
  const [messages, setMessages] = useState<CommMessage[]>(seedMessages);
  const shipmentCounter = useRef(2604);
  const messageCounter = useRef(2619);

  const addShipment = useCallback<DispatchStore["addShipment"]>(draft => {
    const full: Shipment = {
      ...draft,
      id: `DS-${shipmentCounter.current++}`,
      status: "Ready to Dispatch",
      checklist: packingChecklist(),
      created: "Just now",
      timeline: [{ text: `Shipment created from ${draft.orderId}`, time: "Just now" }],
    };
    setShipments(list => [full, ...list]);
    return full;
  }, []);

  const updateShipment = useCallback((id: string, patch: Partial<Shipment>, event?: string) => {
    setShipments(list =>
      list.map(s =>
        s.id === id
          ? { ...s, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...s.timeline] : s.timeline }
          : s,
      ),
    );
  }, []);

  const toggleChecklist = useCallback((id: string, index: number) => {
    setShipments(list =>
      list.map(s =>
        s.id === id
          ? { ...s, checklist: s.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item)) }
          : s,
      ),
    );
  }, []);

  const addMessage = useCallback<DispatchStore["addMessage"]>(message => {
    const full: CommMessage = {
      status: "Sent",
      ...message,
      id: `msg-${messageCounter.current++}`,
      time: "Just now",
    };
    setMessages(list => [full, ...list]);
    return full;
  }, []);

  const updateMessage = useCallback<DispatchStore["updateMessage"]>((id, patch) => {
    setMessages(list => list.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const value = useMemo(
    () => ({ shipments, messages, addShipment, updateShipment, toggleChecklist, addMessage, updateMessage }),
    [shipments, messages, addShipment, updateShipment, toggleChecklist, addMessage, updateMessage],
  );

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}
