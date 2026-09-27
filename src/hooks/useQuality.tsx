import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedInspections, seedReturns } from "@/data/qualityData";
import type { InspectionRecord, ProductImage, ReturnCase } from "@/types";

interface QualityStore {
  inspections: InspectionRecord[];
  returns: ReturnCase[];
  addInspection: (inspection: Omit<InspectionRecord, "id" | "timeline">, firstEvent: string) => InspectionRecord;
  updateInspection: (id: string, patch: Partial<InspectionRecord>, event?: string) => void;
  addInspectionPhoto: (id: string, photo: Omit<ProductImage, "id">) => void;
  addReturn: (ret: Omit<ReturnCase, "id" | "timeline" | "status" | "requested">) => ReturnCase;
  updateReturn: (id: string, patch: Partial<ReturnCase>, event?: string) => void;
  nextCreditNoteId: () => string;
}

const QualityContext = createContext<QualityStore | null>(null);

export function useQuality(): QualityStore {
  const ctx = useContext(QualityContext);
  if (!ctx) throw new Error("useQuality must be used inside QualityProvider");
  return ctx;
}

export function QualityProvider({ children }: { children: React.ReactNode }) {
  const [inspections, setInspections] = useState<InspectionRecord[]>(seedInspections);
  const [returns, setReturns] = useState<ReturnCase[]>(seedReturns);
  const inspectionCounter = useRef(2611);
  const returnCounter = useRef(260008);
  const creditNoteCounter = useRef(26002);
  const photoCounter = useRef(1);

  const addInspection = useCallback((inspection: Omit<InspectionRecord, "id" | "timeline">, firstEvent: string) => {
    const full: InspectionRecord = {
      ...inspection,
      id: `QI-${inspectionCounter.current++}`,
      timeline: [{ text: firstEvent, time: "Just now" }],
    };
    setInspections(list => [full, ...list]);
    return full;
  }, []);

  const updateInspection = useCallback((id: string, patch: Partial<InspectionRecord>, event?: string) => {
    setInspections(list =>
      list.map(i =>
        i.id === id
          ? { ...i, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...i.timeline] : i.timeline }
          : i,
      ),
    );
  }, []);

  const addInspectionPhoto = useCallback((id: string, photo: Omit<ProductImage, "id">) => {
    setInspections(list =>
      list.map(i =>
        i.id === id ? { ...i, photos: [...i.photos, { ...photo, id: `qi-photo-${photoCounter.current++}` }] } : i,
      ),
    );
  }, []);

  const addReturn = useCallback((ret: Omit<ReturnCase, "id" | "timeline" | "status" | "requested">) => {
    const full: ReturnCase = {
      ...ret,
      id: `RT-${returnCounter.current++}`,
      requested: "Just now",
      status: "Requested",
      timeline: [{ text: "Return requested", time: "Just now" }],
    };
    setReturns(list => [full, ...list]);
    return full;
  }, []);

  const updateReturn = useCallback((id: string, patch: Partial<ReturnCase>, event?: string) => {
    setReturns(list =>
      list.map(r =>
        r.id === id
          ? { ...r, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...r.timeline] : r.timeline }
          : r,
      ),
    );
  }, []);

  const nextCreditNoteId = useCallback(() => `CN-${creditNoteCounter.current++}`, []);

  const value = useMemo(
    () => ({ inspections, returns, addInspection, updateInspection, addInspectionPhoto, addReturn, updateReturn, nextCreditNoteId }),
    [inspections, returns, addInspection, updateInspection, addInspectionPhoto, addReturn, updateReturn, nextCreditNoteId],
  );

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}
