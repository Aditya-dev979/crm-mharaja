import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedFeedback, seedTickets } from "@/data/postSalesData";
import type { CustomerFeedback, SupportTicket } from "@/types";

interface PostSalesStore {
  feedback: CustomerFeedback[];
  tickets: SupportTicket[];
  addFeedback: (draft: Omit<CustomerFeedback, "id" | "date" | "published">) => CustomerFeedback;
  updateFeedback: (id: string, patch: Partial<CustomerFeedback>) => void;
  addTicket: (draft: Omit<SupportTicket, "id" | "status" | "created" | "timeline">, event?: string) => SupportTicket;
  updateTicket: (id: string, patch: Partial<SupportTicket>, event?: string) => void;
}

const PostSalesContext = createContext<PostSalesStore | null>(null);

export function usePostSales(): PostSalesStore {
  const ctx = useContext(PostSalesContext);
  if (!ctx) throw new Error("usePostSales must be used inside PostSalesProvider");
  return ctx;
}

export function PostSalesProvider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<CustomerFeedback[]>(seedFeedback);
  const [tickets, setTickets] = useState<SupportTicket[]>(seedTickets);
  const feedbackCounter = useRef(2605);
  const ticketCounter = useRef(2604);

  const addFeedback = useCallback<PostSalesStore["addFeedback"]>(draft => {
    const full: CustomerFeedback = { ...draft, id: `FB-${feedbackCounter.current++}`, date: "08 Mar 2026", published: false };
    setFeedback(list => [full, ...list]);
    return full;
  }, []);

  const updateFeedback = useCallback<PostSalesStore["updateFeedback"]>((id, patch) => {
    setFeedback(list => list.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const addTicket = useCallback<PostSalesStore["addTicket"]>((draft, event) => {
    const full: SupportTicket = {
      ...draft,
      id: `TK-${ticketCounter.current++}`,
      status: "Open",
      created: "08 Mar 2026",
      timeline: [{ text: event ?? "Ticket raised", time: "Just now" }],
    };
    setTickets(list => [full, ...list]);
    return full;
  }, []);

  const updateTicket = useCallback<PostSalesStore["updateTicket"]>((id, patch, event) => {
    setTickets(list =>
      list.map(t =>
        t.id === id
          ? { ...t, ...patch, timeline: event ? [{ text: event, time: "Just now" }, ...t.timeline] : t.timeline }
          : t,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ feedback, tickets, addFeedback, updateFeedback, addTicket, updateTicket }),
    [feedback, tickets, addFeedback, updateFeedback, addTicket, updateTicket],
  );

  return <PostSalesContext.Provider value={value}>{children}</PostSalesContext.Provider>;
}
