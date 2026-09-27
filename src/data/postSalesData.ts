import type { BadgeTone } from "@/components/ui/Badge";
import type { CustomerFeedback, SupportTicket, TicketPriority, TicketStatus } from "@/types";

export const ticketStatusTone: Record<TicketStatus, BadgeTone> = {
  Open: "amber",
  "In Progress": "royal",
  "Awaiting Customer": "gold",
  Resolved: "emerald",
  Closed: "neutral",
};

export const ticketPriorityTone: Record<TicketPriority, BadgeTone> = {
  High: "danger",
  Medium: "amber",
  Low: "neutral",
};

export const ticketCategories = [
  "Product quality",
  "Delivery delay",
  "Pack & label",
  "Lab report / documentation",
  "Billing & payment",
  "Rework request",
  "General enquiry",
];

export const ratingLabel = (rating: number) =>
  rating <= 0 ? "Awaiting response" :
  rating >= 5 ? "Delighted" : rating === 4 ? "Happy" : rating === 3 ? "Neutral" : rating === 2 ? "Unhappy" : "Upset";

export const seedFeedback: CustomerFeedback[] = [
  {
    id: "FB-2601", customerId: "cust-01", customerName: "Aarav Mehta Distributors", orderId: "SO-260184",
    rating: 5, channel: "WhatsApp", date: "08 Mar 2026", published: true,
    comment: "The herbal range moved faster than expected at the counters. Priya kept me updated through the whole dispatch.",
    response: "Thank you — we have noted your preference for evening deliveries for next time.",
    respondedBy: "Priya Nair",
  },
  {
    id: "FB-2602", customerId: "cust-03", customerName: "Devansh Agarwal Trading", orderId: "SO-260178",
    rating: 4, channel: "Email", date: "07 Mar 2026", published: true,
    comment: "Clean batch and quick dispatch. The lab paperwork took a couple of reminders.",
    followUp: "Share the revised documentation workflow when it goes live.",
  },
  {
    id: "FB-2603", customerId: "cust-04", customerName: "Sanya Oberoi Retail", orderId: "SO-260175",
    rating: 2, channel: "Phone", date: "06 Mar 2026", published: false,
    comment: "One carton had loose wrapper seals. I expected better for a premium line.",
    response: "We have collected the carton, raised a return and will re-pack it at our own cost.",
    respondedBy: "Meenal Joshi",
    followUp: "Call after the re-packed carton is delivered.",
  },
  {
    id: "FB-2604", customerId: "cust-02", customerName: "Meera Kapoor Distributors", orderId: "SO-260181",
    rating: 5, channel: "In store", date: "04 Mar 2026", published: true,
    comment: "Loved that they sent samples before we committed to the listing. Very straightforward to deal with.",
  },
];

export const seedTickets: SupportTicket[] = [
  {
    id: "TK-2601", customerId: "cust-04", customerName: "Sanya Oberoi Retail", orderId: "SO-260175",
    subject: "Wrapper seal failure reported in a full carton",
    category: "Product quality", priority: "High", status: "In Progress",
    assignedTo: "Meenal Joshi", created: "06 Mar 2026", dueDate: "09 Mar 2026",
    description: "Customer reports wrapper seals opening in transit. Carton collected on 07 Mar and sent to quality.",
    followUpDate: "11 Mar 2026",
    timeline: [
      { text: "Return RT-260007 raised and cartons collected", time: "07 Mar, 11:05 AM" },
      { text: "Assigned to Meenal Joshi · quality", time: "06 Mar, 5:20 PM" },
      { text: "Ticket raised from customer call", time: "06 Mar, 5:05 PM" },
    ],
  },
  {
    id: "TK-2602", customerId: "cust-03", customerName: "Devansh Agarwal Trading", orderId: "SO-260178",
    subject: "Lab report not received with the consignment",
    category: "Lab report / documentation", priority: "Medium", status: "Awaiting Customer",
    assignedTo: "Suresh Yadav", created: "07 Mar 2026", dueDate: "10 Mar 2026",
    description: "The NABL lab report was emailed separately; customer asked for a signed hard copy.",
    followUpDate: "10 Mar 2026",
    timeline: [
      { text: "Signed copy couriered — awaiting confirmation of receipt", time: "08 Mar, 9:30 AM" },
      { text: "Ticket raised from email reply", time: "07 Mar, 6:45 PM" },
    ],
  },
  {
    id: "TK-2603", customerId: "cust-02", customerName: "Meera Kapoor Distributors",
    subject: "Wants a matching handwash SKU for the beauty range",
    category: "General enquiry", priority: "Low", status: "Open",
    assignedTo: "Priya Nair", created: "08 Mar 2026", dueDate: "12 Mar 2026",
    description: "Customer asked for a matching handwash SKU alongside the beauty range. Sales to prepare options.",
    timeline: [{ text: "Ticket raised from WhatsApp enquiry", time: "08 Mar, 10:15 AM" }],
  },
  {
    id: "TK-2599", customerId: "cust-01", customerName: "Aarav Mehta Distributors", orderId: "SO-259912",
    subject: "Wrapper artwork correction after delivery",
    category: "Pack & label", priority: "Medium", status: "Resolved",
    assignedTo: "Vikram Singh", created: "18 Feb 2026", dueDate: "24 Feb 2026",
    description: "Batch-code print correction requested a week after delivery.",
    resolutionNotes: "Re-labelled free of charge at the plant and re-delivered on 26 Feb. Customer satisfied.",
    resolvedBy: "Vikram Singh",
    timeline: [
      { text: "Resolved — re-labelled and re-delivered", time: "26 Feb, 5:40 PM" },
      { text: "Cartons collected under TR-26010", time: "20 Feb, 11:00 AM" },
      { text: "Ticket raised", time: "18 Feb, 3:10 PM" },
    ],
  },
];
