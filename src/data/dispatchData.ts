import type { BadgeTone } from "@/components/ui/Badge";
import type { CommMessage, CommTemplate, DispatchStatus, PackingItem, Shipment } from "@/types";

export const dispatchStatusTone: Record<DispatchStatus, BadgeTone> = {
  "Ready to Dispatch": "royal",
  Packing: "amber",
  Dispatched: "royal",
  "In Transit": "gold",
  Delivered: "emerald",
  Failed: "danger",
  Returned: "neutral",
};

export const dispatchStatuses: DispatchStatus[] = [
  "Ready to Dispatch", "Packing", "Dispatched", "In Transit", "Delivered", "Failed", "Returned",
];

export const dispatchJourney = ["Ready", "Packing", "Dispatched", "In Transit", "Delivered"];

export const packageTypes = ["Corrugated shipper", "Master carton", "Tamper-proof pallet wrap", "Insured freight pallet"];

export const packingChecklist = (): PackingItem[] => [
  { label: "Verify SKU, batch code and quantity against the invoice", done: false },
  { label: "Final carton check & seal inspection", done: false },
  { label: "Enclose lab report & care card", done: false },
  { label: "Include GST invoice and e-way bill copy", done: false },
  { label: "Attach transit insurance declaration", done: false },
  { label: "Seal, weigh and photograph the pallet", done: false },
];

/* ---------- Message templates ---------- */

export const commTemplates: CommTemplate[] = [
  /* Customer */
  {
    id: "tpl-welcome", audience: "Customer", name: "Welcome", channels: ["WhatsApp", "Email", "SMS"],
    subject: "Welcome to Maharaja Soap",
    body: "Namaste {name}, welcome to the Maharaja Soap family. Your account manager will keep your counters stocked through the season. Visit us at our Vapi plant, Gujarat.",
  },
  {
    id: "tpl-quotation", audience: "Customer", name: "Quotation", channels: ["WhatsApp", "Email"],
    subject: "Your Maharaja Soap quotation {reference}",
    body: "Dear {name}, your quotation {reference} is ready. It is valid for 7 days and prices include 18% GST. Reply here or call us to confirm.",
  },
  {
    id: "tpl-order-confirm", audience: "Customer", name: "Order confirmation", channels: ["WhatsApp", "Email", "SMS"],
    subject: "Order {reference} confirmed",
    body: "Dear {name}, your order {reference} is confirmed. We will keep you posted at every step — from our plant to your warehouse.",
  },
  {
    id: "tpl-payment-reminder", audience: "Customer", name: "Payment reminder", channels: ["WhatsApp", "SMS"],
    subject: "Gentle payment reminder — {reference}",
    body: "Dear {name}, a gentle reminder that a balance is pending on {reference}. Your consignment is held and ships the moment payment clears.",
  },
  {
    id: "tpl-invoice", audience: "Customer", name: "Invoice", channels: ["Email", "WhatsApp"],
    subject: "Your invoice {reference}",
    body: "Dear {name}, please find your GST invoice {reference} attached. Thank you for choosing Maharaja Soap.",
  },
  {
    id: "tpl-dispatch", audience: "Customer", name: "Dispatch", channels: ["WhatsApp", "SMS", "Email"],
    subject: "Your order {reference} is on its way",
    body: "Dear {name}, your order {reference} has been dispatched via secure courier. Track it with the number we have shared. Signature required on delivery.",
  },
  {
    id: "tpl-delivery", audience: "Customer", name: "Delivery", channels: ["WhatsApp", "SMS"],
    subject: "Delivered — {reference}",
    body: "Dear {name}, your Maharaja Soap package {reference} has been delivered. We hope it takes your breath away. Care instructions are inside the box.",
  },
  {
    id: "tpl-feedback", audience: "Customer", name: "Feedback", channels: ["WhatsApp", "Email"],
    subject: "How did we do, {name}?",
    body: "Dear {name}, your opinion shapes us. Could you spare a minute to rate your recent experience with Maharaja Soap?",
  },
  {
    id: "tpl-birthday", audience: "Customer", name: "Birthday", channels: ["WhatsApp", "SMS"],
    subject: "Happy birthday, {name}!",
    body: "Happy birthday, {name}! May your year sparkle. Enjoy a special birthday privilege on your next visit this month.",
  },
  {
    id: "tpl-anniversary", audience: "Customer", name: "Anniversary", channels: ["WhatsApp", "Email"],
    subject: "Happy anniversary, {name}!",
    body: "Dear {name}, happy anniversary from all of us at Maharaja Soap. Celebrate the milestone — a curated anniversary collection awaits you.",
  },
  /* Supplier */
  {
    id: "tpl-po", audience: "Supplier", name: "Purchase order", channels: ["Email", "WhatsApp"],
    subject: "Purchase order {reference}",
    body: "Dear {name}, please find purchase order {reference} attached. Kindly confirm the delivery schedule and certificate details.",
  },
  {
    id: "tpl-approval", audience: "Supplier", name: "Approval", channels: ["Email"],
    subject: "Approved — {reference}",
    body: "Dear {name}, {reference} has been approved by our purchase team. You may proceed as per the agreed terms.",
  },
  {
    id: "tpl-supplier-dispatch", audience: "Supplier", name: "Dispatch & ETA request", channels: ["Email", "WhatsApp"],
    subject: "Dispatch confirmation required — {reference}",
    body: "Dear {name}, kindly confirm the dispatch date, transporter, LR number and expected arrival date for {reference}. Our plant needs the ETA to plan the receiving bay.",
  },
  {
    id: "tpl-grn", audience: "Supplier", name: "GRN update", channels: ["Email", "WhatsApp"],
    subject: "GRN update — {reference}",
    body: "Dear {name}, material against {reference} has been received and is under verification. We will share the inspection outcome shortly.",
  },
  {
    id: "tpl-supplier-payment", audience: "Supplier", name: "Payment update", channels: ["Email", "SMS"],
    subject: "Payment released — {reference}",
    body: "Dear {name}, a payment against {reference} has been released from our end. The UTR reference follows separately.",
  },
];

/* ---------- Seeds ---------- */

const doneChecklist = () => packingChecklist().map(item => ({ ...item, done: true }));

export const seedShipments: Shipment[] = [
  {
    id: "DS-2603", orderId: "SO-260184", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    address: "14, Civil Lines, Jaipur 302006",
    packageType: "Corrugated shipper", weight: "0.6 kg", insured: true,
    status: "Ready to Dispatch",
    checklist: packingChecklist(),
    created: "08 Mar 2026",
    timeline: [
      { text: "Queued for dispatch — awaiting balance payment", time: "08 Mar, 11:10 AM" },
      { text: "Shipment created from SO-260184", time: "08 Mar, 10:45 AM" },
    ],
  },
  {
    id: "DS-2602", orderId: "SO-260178", customerId: "cust-1044", customerName: "Devansh Agarwal Trading",
    address: "22, Golf Links, New Delhi 110003",
    packageType: "Insured freight pallet", weight: "0.4 kg", insured: true,
    courier: "Sequel Logistics", tracking: "SQ-889123",
    dispatchDate: "07 Mar 2026", expectedDelivery: "Today",
    status: "In Transit",
    checklist: doneChecklist(),
    created: "07 Mar 2026",
    timeline: [
      { text: "In transit — Delhi hub scan", time: "Today, 6:40 AM" },
      { text: "Dispatched via Sequel Logistics · SQ-889123", time: "07 Mar, 6:12 PM" },
      { text: "Packing completed & sealed", time: "07 Mar, 5:30 PM" },
      { text: "Shipment created from SO-260178", time: "07 Mar, 4:50 PM" },
    ],
  },
  {
    id: "DS-2601", orderId: "SO-259844", customerId: "cust-1032", customerName: "Nisha Reddy Enterprises",
    address: "3, Carter Road, Mumbai 400050",
    packageType: "Corrugated shipper", weight: "0.3 kg", insured: true,
    courier: "BVC Express", tracking: "BVC-77012",
    dispatchDate: "24 Nov 2025", expectedDelivery: "Delivered 26 Nov 2025",
    status: "Delivered",
    checklist: doneChecklist(),
    created: "24 Nov 2025",
    timeline: [
      { text: "Delivered — signed by customer", time: "26 Nov 2025" },
      { text: "Dispatched via BVC Express · BVC-77012", time: "24 Nov 2025" },
      { text: "Shipment created from SO-259844", time: "24 Nov 2025" },
    ],
  },
  {
    id: "DS-2599", orderId: "SO-259710", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    address: "14, Civil Lines, Jaipur 302006",
    packageType: "Master carton", weight: "0.2 kg", insured: true,
    courier: "Brinks Secure", tracking: "BR-40221",
    dispatchDate: "20 Jan 2026", expectedDelivery: "22 Jan 2026",
    status: "Returned", failReason: "Customer return RT-260002 — cartons came back to the warehouse",
    checklist: doneChecklist(),
    created: "20 Jan 2026",
    timeline: [
      { text: "Returned to store — linked return RT-260002", time: "21 Jan 2026" },
      { text: "Delivered, then return requested", time: "20 Jan 2026" },
      { text: "Dispatched via Brinks Secure · BR-40221", time: "20 Jan 2026" },
    ],
  },
  {
    id: "DS-2598", orderId: "SO-259688", customerId: "cust-1019", customerName: "Shagun Hotels (Pooja Trivedi)",
    address: "42, Banjara Hills Rd 12, Hyderabad 500034",
    packageType: "Tamper-proof pallet wrap", weight: "0.2 kg", insured: false,
    courier: "BVC Express", tracking: "BVC-76410",
    dispatchDate: "04 Jan 2026", expectedDelivery: "06 Jan 2026",
    status: "Failed", failReason: "Address unreachable twice — customer travelling; redelivery to be scheduled",
    checklist: doneChecklist(),
    created: "04 Jan 2026",
    timeline: [
      { text: "Delivery failed — customer unreachable", time: "06 Jan 2026" },
      { text: "Dispatched via BVC Express · BVC-76410", time: "04 Jan 2026" },
    ],
  },
];

export const seedMessages: CommMessage[] = [
  {
    id: "msg-2618", channel: "WhatsApp", templateName: "Payment reminder",
    partyKind: "Customer", partyId: "cust-1029", partyName: "Sanya Oberoi Retail",
    reference: "SO-260175", preview: "Dear Sanya, a gentle reminder that a balance is pending on SO-260175…",
    time: "06 Mar 2026",
    status: "Sent", createdBy: "Priya Nair", sentAt: "Just after creation",
  },
  {
    id: "msg-2617", channel: "Email", templateName: "Invoice",
    partyKind: "Customer", partyId: "cust-1044", partyName: "Devansh Agarwal Trading",
    reference: "INV-26095", preview: "Dear Devansh, please find your GST invoice INV-26095 attached…",
    time: "04 Mar 2026",
    status: "Sent", createdBy: "Neha Kulkarni", sentAt: "Just after creation",
  },
  {
    id: "msg-2616", channel: "WhatsApp", templateName: "Dispatch",
    partyKind: "Customer", partyId: "cust-1044", partyName: "Devansh Agarwal Trading",
    reference: "SO-260178", preview: "Dear Devansh, your order SO-260178 has been dispatched via secure courier…",
    time: "07 Mar 2026",
    status: "Sent", createdBy: "Suresh Yadav", sentAt: "Just after creation",
  },
  {
    id: "msg-2615", channel: "Email", templateName: "Purchase order",
    partyKind: "Supplier", partyId: "sup-01", partyName: "Ratna Oleochemicals",
    reference: "PO-260092", preview: "Dear Ratna Oleochemicals, please find purchase order PO-260092 attached…",
    time: "27 Feb 2026",
    status: "Sent", createdBy: "Kavita Shah", sentAt: "Just after creation",
  },
  {
    id: "msg-2614", channel: "SMS", templateName: "Order confirmation",
    partyKind: "Customer", partyId: "cust-1029", partyName: "Sanya Oberoi Retail",
    reference: "SO-260175", preview: "Dear Sanya, your order SO-260175 is confirmed…",
    time: "01 Mar 2026",
    status: "Failed", createdBy: "Priya Nair",
    failureReason: "Number not reachable on this channel — retry or switch to WhatsApp.",
  },
  {
    id: "msg-2613", channel: "WhatsApp", templateName: "Birthday",
    partyKind: "Customer", partyId: "cust-1051", partyName: "Meera Kapoor Distributors",
    preview: "Happy birthday, Meera — wishing you a bright year ahead from all of us at Maharaja Soap.",
    time: "22 Feb 2026",
    status: "Sent", createdBy: "Priya Nair", sentAt: "22 Feb 2026",
  },
];

export const fillTemplate = (body: string, name: string, reference?: string) =>
  body
    .split("{name}").join(name.split(" ")[0])
    .split("{reference}").join(reference ?? "your recent order");
