import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedCustomOrders, seedRepairs } from "@/data/workshopData";
import type { CustomOrder, OrderPayment, ProductImage, RepairJob } from "@/types";

interface WorkshopStore {
  customOrders: CustomOrder[];
  repairs: RepairJob[];
  addCustomOrder: (order: Omit<CustomOrder, "id" | "created" | "timeline" | "payments" | "progress" | "stage" | "attachments"> & { attachments?: ProductImage[] }) => CustomOrder;
  updateCustomOrder: (id: string, patch: Partial<CustomOrder>, event?: string) => void;
  addCustomPayment: (id: string, payment: Omit<OrderPayment, "id" | "date">) => OrderPayment;
  addCustomAttachment: (id: string, attachment: Omit<ProductImage, "id">) => void;
  addRepair: (repair: Omit<RepairJob, "id" | "created" | "timeline" | "payments" | "notes" | "stage" | "photosBefore" | "photosAfter"> & { photosBefore?: ProductImage[] }) => RepairJob;
  updateRepair: (id: string, patch: Partial<RepairJob>, event?: string) => void;
  addRepairPhoto: (id: string, kind: "before" | "after", photo: Omit<ProductImage, "id">) => void;
  addRepairNote: (id: string, text: string) => void;
  addRepairPayment: (id: string, payment: Omit<OrderPayment, "id" | "date">) => OrderPayment;
}

const WorkshopContext = createContext<WorkshopStore | null>(null);

export function useWorkshop(): WorkshopStore {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error("useWorkshop must be used inside WorkshopProvider");
  return ctx;
}

export function WorkshopProvider({ children }: { children: React.ReactNode }) {
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>(seedCustomOrders);
  const [repairs, setRepairs] = useState<RepairJob[]>(seedRepairs);
  const customCounter = useRef(26014);
  const repairCounter = useRef(26023);
  const paymentCounter = useRef(26150);
  const photoCounter = useRef(1);

  const addCustomOrder = useCallback<WorkshopStore["addCustomOrder"]>(draft => {
    const full: CustomOrder = {
      ...draft,
      id: `CO-${customCounter.current++}`,
      attachments: draft.attachments ?? [],
      progress: 0,
      stage: "Artwork Requirement",
      payments: [],
      created: "Just now",
      timeline: [{ text: "Design requirement captured", time: "Just now" }],
    };
    setCustomOrders(list => [full, ...list]);
    return full;
  }, []);

  const updateCustomOrder = useCallback((id: string, patch: Partial<CustomOrder>, event?: string) => {
    setCustomOrders(list =>
      list.map(o =>
        o.id === id
          ? { ...o, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...o.timeline] : o.timeline }
          : o,
      ),
    );
  }, []);

  const addCustomPayment = useCallback((id: string, payment: Omit<OrderPayment, "id" | "date">) => {
    const full: OrderPayment = { ...payment, id: `RC-${paymentCounter.current++}`, date: "Just now" };
    setCustomOrders(list => list.map(o => (o.id === id ? { ...o, payments: [...o.payments, full] } : o)));
    return full;
  }, []);

  const addCustomAttachment = useCallback((id: string, attachment: Omit<ProductImage, "id">) => {
    setCustomOrders(list =>
      list.map(o =>
        o.id === id ? { ...o, attachments: [...o.attachments, { ...attachment, id: `co-att-${photoCounter.current++}` }] } : o,
      ),
    );
  }, []);

  const addRepair = useCallback<WorkshopStore["addRepair"]>(draft => {
    const full: RepairJob = {
      ...draft,
      id: `RJ-${repairCounter.current++}`,
      photosBefore: draft.photosBefore ?? [],
      photosAfter: [],
      stage: "Request",
      payments: [],
      notes: [],
      created: "Just now",
      timeline: [{ text: "Rework request logged", time: "Just now" }],
    };
    setRepairs(list => [full, ...list]);
    return full;
  }, []);

  const updateRepair = useCallback((id: string, patch: Partial<RepairJob>, event?: string) => {
    setRepairs(list =>
      list.map(r =>
        r.id === id
          ? { ...r, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...r.timeline] : r.timeline }
          : r,
      ),
    );
  }, []);

  const addRepairPhoto = useCallback((id: string, kind: "before" | "after", photo: Omit<ProductImage, "id">) => {
    setRepairs(list =>
      list.map(r =>
        r.id === id
          ? {
              ...r,
              [kind === "before" ? "photosBefore" : "photosAfter"]: [
                ...(kind === "before" ? r.photosBefore : r.photosAfter),
                { ...photo, id: `rj-photo-${photoCounter.current++}` },
              ],
            }
          : r,
      ),
    );
  }, []);

  const addRepairNote = useCallback((id: string, text: string) => {
    setRepairs(list =>
      list.map(r => (r.id === id ? { ...r, notes: [{ text, author: "Arjun Sharma", time: "Just now" }, ...r.notes] } : r)),
    );
  }, []);

  const addRepairPayment = useCallback((id: string, payment: Omit<OrderPayment, "id" | "date">) => {
    const full: OrderPayment = { ...payment, id: `RC-${paymentCounter.current++}`, date: "Just now" };
    setRepairs(list => list.map(r => (r.id === id ? { ...r, payments: [...r.payments, full] } : r)));
    return full;
  }, []);

  const value = useMemo(
    () => ({
      customOrders, repairs,
      addCustomOrder, updateCustomOrder, addCustomPayment, addCustomAttachment,
      addRepair, updateRepair, addRepairPhoto, addRepairNote, addRepairPayment,
    }),
    [customOrders, repairs, addCustomOrder, updateCustomOrder, addCustomPayment, addCustomAttachment, addRepair, updateRepair, addRepairPhoto, addRepairNote, addRepairPayment],
  );

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
}
