import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedCustomers, seedLeads } from "@/data/crmData";
import type { Customer, Lead, NoteEntry } from "@/types";

interface CrmStore {
  leads: Lead[];
  customers: Customer[];
  addLead: (lead: Omit<Lead, "id" | "notes" | "timeline" | "created">) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addLeadEvent: (id: string, text: string) => void;
  addLeadNote: (id: string, note: NoteEntry) => void;
  convertLead: (id: string) => Customer | null;
  addCustomer: (customer: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addCustomerNote: (id: string, note: NoteEntry) => void;
}

const CrmContext = createContext<CrmStore | null>(null);

export function useCrm(): CrmStore {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside CrmProvider");
  return ctx;
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const leadCounter = useRef(26042);
  const customerCounter = useRef(1052);

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads(list => list.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const addLeadEvent = useCallback((id: string, text: string) => {
    setLeads(list =>
      list.map(l => (l.id === id ? { ...l, timeline: [{ text, time: "Just now" }, ...l.timeline] } : l)),
    );
  }, []);

  const addLeadNote = useCallback((id: string, note: NoteEntry) => {
    setLeads(list => list.map(l => (l.id === id ? { ...l, notes: [note, ...l.notes] } : l)));
  }, []);

  const addLead = useCallback((lead: Omit<Lead, "id" | "notes" | "timeline" | "created">) => {
    const id = `LD-${leadCounter.current++}`;
    const full: Lead = {
      ...lead,
      id,
      created: "Just now",
      notes: [],
      timeline: [{ text: `Lead created by ${lead.executive}`, time: "Just now" }],
    };
    setLeads(list => [full, ...list]);
    return full;
  }, []);

  const addCustomer = useCallback((customer: Omit<Customer, "id">) => {
    const id = `cust-${customerCounter.current++}`;
    const full: Customer = { ...customer, id };
    setCustomers(list => [full, ...list]);
    return full;
  }, []);

  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setCustomers(list => list.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addCustomerNote = useCallback((id: string, note: NoteEntry) => {
    setCustomers(list => list.map(c => (c.id === id ? { ...c, notes: [note, ...c.notes] } : c)));
  }, []);

  const convertLead = useCallback(
    (id: string): Customer | null => {
      const lead = leads.find(l => l.id === id);
      if (!lead) return null;
      if (lead.customerId) return customers.find(c => c.id === lead.customerId) ?? null;
      const customer = addCustomer({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        segment: "New",
        since: "March 2026",
        ltv: "₹0",
        outstanding: "₹0",
        totalOrders: 0,
        preferred: [lead.interest],
        orders: [],
        quotations: [],
        payments: [],
        invoices: [],
        returns: [],
        repairs: [],
        documents: [],
        notes: lead.notes,
        followUps: [],
        communications: [],
        leadId: lead.id,
      });
      setLeads(list =>
        list.map(l =>
          l.id === id
            ? {
                ...l,
                status: "Converted",
                nextFollowUp: "—",
                customerId: customer.id,
                timeline: [
                  { text: `Converted to customer ${customer.id.replace("cust-", "CUST-")}`, time: "Just now" },
                  ...l.timeline,
                ],
              }
            : l,
        ),
      );
      return customer;
    },
    [leads, customers, addCustomer],
  );

  const value = useMemo(
    () => ({
      leads,
      customers,
      addLead,
      updateLead,
      addLeadEvent,
      addLeadNote,
      convertLead,
      addCustomer,
      updateCustomer,
      addCustomerNote,
    }),
    [leads, customers, addLead, updateLead, addLeadEvent, addLeadNote, convertLead, addCustomer, updateCustomer, addCustomerNote],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}
