import type { Customer, Lead, LeadPriority, LeadStatus } from "@/types";
import type { BadgeTone } from "@/components/ui/Badge";

export const leadStatuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Product Shared",
  "Quotation Sent",
  "Negotiation",
  "Converted",
  "Lost",
];

export const leadStatusTone: Record<LeadStatus, BadgeTone> = {
  New: "neutral",
  Contacted: "royal",
  Interested: "royal",
  "Product Shared": "gold",
  "Quotation Sent": "amber",
  Negotiation: "amber",
  Converted: "emerald",
  Lost: "danger",
};

export const leadPriorityTone: Record<LeadPriority, BadgeTone> = {
  Hot: "danger",
  Warm: "amber",
  Cold: "neutral",
};

export const executives = ["Arjun Sharma", "Priya Nair", "Rohan Iyer", "Kavita Shah"];

/* The seven client-facing lead sources. Analytics and filters read this same
   list, so a source never appears in one place and not another. */
export const leadSources = [
  "IndiaMART",
  "TradeIndia",
  "Justdial",
  "Instagram",
  "Website",
  "Phone",
  "Manual",
];

export const productInterests = [
  "Bath Soap",
  "Beauty Soap",
  "Herbal & Ayurvedic",
  "Premium & Luxury",
  "Baby Care",
  "Liquid Soap & Handwash",
  "Laundry & Home Care",
  "Gift & Festive Packs",
  "Private Label",
];

export const lostReasons = [
  "Budget mismatch",
  "Bought elsewhere",
  "Not responding",
  "Requirement dropped",
  "Other",
];

export const seedLeads: Lead[] = [
  {
    id: "LD-26041", name: "Rohit Chandra", phone: "9812043321", email: "rohit.chandra@gmail.com",
    source: "Instagram", requirement: "Festive-season stocking for 40 retail counters — wants the BIS-certified bath soap range.",
    interest: "Bath Soap", budget: 350000, city: "Jaipur", executive: "Priya Nair",
    status: "New", priority: "Hot", nextFollowUp: "Today, 5:00 PM", created: "Today, 9:12 AM",
    notes: [], timeline: [{ text: "Lead captured from Instagram enquiry", time: "Today, 9:12 AM" }],
  },
  {
    id: "LD-26040", name: "Shreya Iyer", phone: "9867014452", email: "shreya.iyer@outlook.com",
    source: "TradeIndia", requirement: "Beauty soap range for 12 modern-trade stores, needs lab reports and shelf-life data.",
    interest: "Beauty Soap", budget: 220000, city: "Mumbai", executive: "Rohan Iyer",
    status: "New", priority: "Warm", nextFollowUp: "Tomorrow, 11:00 AM", created: "Today, 8:40 AM",
    notes: [], timeline: [{ text: "Website enquiry form submitted", time: "Today, 8:40 AM" }],
  },
  {
    id: "LD-26039", name: "Manav Gupta", phone: "9929016673", email: "manav.g@yahoo.in",
    source: "Manual", requirement: "Monthly standing order for beauty soap, prefers the rose variant.",
    interest: "Herbal & Ayurvedic", budget: 90000, city: "Jaipur", executive: "Arjun Sharma",
    status: "Contacted", priority: "Warm", nextFollowUp: "10 Mar, 4:00 PM", created: "Yesterday",
    notes: [{ text: "Visited the Vapi plant, walked the packing hall for 30 minutes.", author: "Arjun Sharma", time: "Yesterday" }],
    timeline: [
      { text: "Follow-up call completed — sharing catalogue on WhatsApp", time: "Today, 10:05 AM" },
      { text: "Walk-in visit recorded at Vapi Plant", time: "Yesterday" },
    ],
  },
  {
    id: "LD-26038", name: "Aditi Rao", phone: "9848122390", email: "aditi.rao@gmail.com",
    source: "Justdial", requirement: "Herbal soap trial order, referred by Aarav Mehta Distributors.",
    interest: "Herbal & Ayurvedic", budget: 180000, city: "Hyderabad", executive: "Priya Nair",
    status: "Contacted", priority: "Hot", nextFollowUp: "Today, 6:30 PM", created: "2 days ago",
    notes: [], timeline: [
      { text: "Intro call done — sharing the herbal soap range and rate card", time: "Yesterday" },
      { text: "Referred by VIP customer Aarav Mehta Distributors", time: "2 days ago" },
    ],
  },
  {
    id: "LD-26037", name: "Farhan Sheikh", phone: "9810277845", email: "farhan.sheikh@gmail.com",
    source: "IndiaMART", requirement: "Bath soap 144 per carton, monthly standing order with full BIS documentation.",
    interest: "Bath Soap", budget: 750000, city: "Delhi", executive: "Kavita Shah",
    status: "Interested", priority: "Hot", nextFollowUp: "09 Mar, 12:00 PM", created: "4 days ago",
    notes: [{ text: "Very specific about fragrance strength. Do not offer the economy grade.", author: "Kavita Shah", time: "3 days ago" }],
    timeline: [
      { text: "Video call — shortlisted two bath soap variants", time: "2 days ago" },
      { text: "Met at the Delhi FMCG Expo booth", time: "4 days ago" },
    ],
  },
  {
    id: "LD-26036", name: "Neha Bansal", phone: "9414233706", email: "neha.bansal@gmail.com",
    source: "Phone", requirement: "Complete private-label guest-soap programme — custom wrapper, hotel launch in June.",
    interest: "Private Label", budget: 1200000, city: "Jaipur", executive: "Priya Nair",
    status: "Interested", priority: "Hot", nextFollowUp: "11 Mar, 3:00 PM", created: "5 days ago",
    notes: [], timeline: [
      { text: "Shared the wrapper artwork board — concept #3 approved", time: "Yesterday" },
      { text: "WhatsApp enquiry with reference photos", time: "5 days ago" },
    ],
  },
  {
    id: "LD-26035", name: "Karthik Menon", phone: "9895122748", email: "karthik.menon@gmail.com",
    source: "Website", requirement: "Certified beauty soap, 125 g bars, triple-milled preferred.",
    interest: "Beauty Soap", budget: 150000, city: "Kochi", executive: "Rohan Iyer",
    status: "Product Shared", priority: "Warm", nextFollowUp: "10 Mar, 11:00 AM", created: "1 week ago",
    notes: [], timeline: [
      { text: "Shared 4 certified batches with plant videos", time: "2 days ago" },
      { text: "Requirement call completed", time: "6 days ago" },
    ],
  },
  {
    id: "LD-26034", name: "Divya Sharma", phone: "9772054431", email: "divya.sh@gmail.com",
    source: "Instagram", requirement: "Premium gift packs, 6 bars each, festive wrapper.",
    interest: "Gift & Festive Packs", budget: 260000, city: "Udaipur", executive: "Priya Nair",
    status: "Product Shared", priority: "Warm", nextFollowUp: "12 Mar, 5:00 PM", created: "1 week ago",
    notes: [], timeline: [{ text: "Sent BIS-certified pack options", time: "3 days ago" }],
  },
  {
    id: "LD-26033", name: "Imran Qureshi", phone: "9950218864", email: "imran.q@gmail.com",
    source: "Manual", requirement: "Herbal soap range for a new 30-store chain.",
    specifications: "Neem & tulsi soap 100 g, 144 per carton; BIS licence and NABL lab report required with every batch.", deliveryExpectation: "Before 25 March 2026",
    interest: "Herbal & Ayurvedic", budget: 420000, city: "Jaipur", executive: "Arjun Sharma",
    status: "Quotation Sent", priority: "Hot", nextFollowUp: "Today, 7:00 PM", created: "10 days ago",
    notes: [], timeline: [
      { text: "Quotation QT-260182 shared on WhatsApp", time: "Yesterday" },
      { text: "Selected the neem & tulsi 100 g variant in the sample room", time: "3 days ago" },
    ],
  },
  {
    id: "LD-26032", name: "Tanvi Desai", phone: "9825147709", email: "tanvi.desai@gmail.com",
    source: "Justdial", requirement: "Handwash and dishwash range for a regional supermarket chain.",
    interest: "Liquid Soap & Handwash", budget: 110000, city: "Ahmedabad", executive: "Rohan Iyer",
    status: "Quotation Sent", priority: "Warm", nextFollowUp: "09 Mar, 4:30 PM", created: "2 weeks ago",
    notes: [], timeline: [{ text: "Quotation sent by email", time: "2 days ago" }],
  },
  {
    id: "LD-26031", name: "Vikram Sethi Stores", phone: "9811076234", email: "vikram.sethi@sethigroup.in",
    source: "IndiaMART", requirement: "Premium luxury soap range, 72 per carton, needs it before 20 March.",
    specifications: "Premium 125 g bars, triple milled, 72 per carton, private wrapper artwork.", deliveryExpectation: "Hard deadline 20 March 2026",
    interest: "Premium & Luxury", budget: 612000, city: "Delhi", executive: "Rohan Iyer",
    status: "Negotiation", priority: "Hot", nextFollowUp: "Today, 3:30 PM", created: "2 weeks ago",
    notes: [{ text: "Asked for 6% consideration; approval needed beyond 4%.", author: "Rohan Iyer", time: "Yesterday" }],
    timeline: [
      { text: "Negotiation call — counter-offer discussed", time: "Yesterday" },
      { text: "Quotation QT-260180 sent", time: "3 days ago" },
    ],
  },
  {
    id: "LD-26030", name: "Ananya Joshi Retail", phone: "9922051167", email: "ananya.j@gmail.com",
    source: "Website", requirement: "Beauty soap combi pack, contemporary wrapper.",
    interest: "Beauty Soap", budget: 264000, city: "Pune", executive: "Priya Nair",
    status: "Negotiation", priority: "Warm", nextFollowUp: "10 Mar, 2:00 PM", created: "3 weeks ago",
    notes: [], timeline: [{ text: "Discussing slab pricing on quotation QT-260179", time: "2 days ago" }],
  },
  {
    id: "LD-26028", name: "Meera Kapoor Distributors", phone: "9829104473", email: "meera.kapoor@gmail.com",
    source: "Manual", requirement: "Beauty soap 100 g with full FSSAI and BIS documentation.",
    interest: "Beauty Soap", budget: 198000, city: "Jaipur", executive: "Arjun Sharma",
    status: "Converted", priority: "Warm", nextFollowUp: "—", created: "1 month ago",
    customerId: "cust-1051",
    notes: [], timeline: [
      { text: "Converted to customer CUST-1051 · order SO-260181", time: "06 Mar" },
      { text: "Quotation QT-260181 approved", time: "06 Mar" },
      { text: "Walk-in consultation", time: "1 month ago" },
    ],
  },
  {
    id: "LD-26025", name: "Sameer Joshi", phone: "9755122980", email: "sameer.joshi@gmail.com",
    source: "Instagram", requirement: "Bath soap trial order under ₹1L.",
    interest: "Bath Soap", budget: 85000, city: "Indore", executive: "Kavita Shah",
    status: "Lost", priority: "Cold", nextFollowUp: "—", created: "1 month ago",
    lostReason: "Budget mismatch",
    notes: [], timeline: [
      { text: "Marked lost — budget mismatch after two options shared", time: "2 weeks ago" },
    ],
  },
];

export const seedCustomers: Customer[] = [
  {
    id: "cust-1048", name: "Aarav Mehta Distributors", phone: "9820145872", email: "aarav.mehta@gmail.com",
    city: "Jaipur", segment: "VIP", gstin: "08AAHPM1023Q1ZW", since: "March 2023",
    address: "14, Civil Lines, Jaipur 302006",
    ltv: "₹18.4L", outstanding: "₹2,85,000", totalOrders: 7,
    preferred: ["Herbal & Ayurvedic", "Premium & Luxury", "Bath Soap"],
    orders: [
      { id: "SO-260184", date: "08 Mar 2026", title: "Maharaja Festive Gift Pack", value: "₹4,85,000", status: "Confirmed" },
      { id: "SO-259912", date: "18 Dec 2025", title: "Baby Care Soap 75 g · 12 cartons", value: "₹3,60,000", status: "Delivered" },
      { id: "SO-259710", date: "02 Oct 2025", title: "Herbal Neem Soap 100 g · 6 cartons", value: "₹1,85,000", status: "Delivered" },
    ],
    quotations: [
      { id: "QT-260184", date: "07 Mar 2026", title: "Maharaja Festive Gift Pack", value: "₹4,85,000", status: "Approved" },
      { id: "QT-259910", date: "16 Dec 2025", title: "Baby Care Soap 75 g · 12 cartons", value: "₹3,60,000", status: "Accepted" },
    ],
    payments: [
      { id: "RC-26140", date: "08 Mar 2026", title: "Advance · Bank transfer", value: "₹2,00,000", status: "Received" },
      { id: "RC-25981", date: "20 Dec 2025", title: "Full payment · UPI", value: "₹3,60,000", status: "Received" },
    ],
    invoices: [
      { id: "INV-26097", date: "08 Mar 2026", title: "Maharaja Festive Gift Pack", value: "₹4,85,000", status: "Partial" },
      { id: "INV-25912", date: "18 Dec 2025", title: "Baby Care Soap 75 g", value: "₹3,60,000", status: "Paid" },
    ],
    returns: [],
    repairs: [
      { id: "RP-25064", date: "12 Jan 2026", title: "Rework · wrapper re-print", value: "₹3,500", status: "Delivered" },
    ],
    documents: [
      { name: "PAN card · KYC", type: "KYC", added: "Mar 2023" },
      { name: "GST registration certificate", type: "GST", added: "Mar 2023" },
      { name: "NABL 6247119928 · Herbal Neem batch", type: "Certificate", added: "08 Mar 2026" },
    ],
    notes: [
      { text: "Prefers evening deliveries. Interested in an ubtan premium bar for the August festive window.", author: "Priya Nair", time: "05 Mar 2026" },
    ],
    followUps: [
      { text: "Collect balance ₹2,85,000 against INV-26097", due: "12 Mar 2026" },
      { text: "Share ubtan premium bar concepts before August", due: "01 Jul 2026" },
    ],
    communications: [
      { channel: "WhatsApp", text: "Order confirmation and invoice shared", time: "08 Mar 2026" },
      { channel: "Call", text: "Discussed advance payment and delivery timeline", time: "07 Mar 2026" },
      { channel: "Email", text: "Quotation QT-260184 sent", time: "07 Mar 2026" },
    ],
  },
  {
    id: "cust-1032", name: "Nisha Reddy Enterprises", phone: "9867228104", email: "nisha.reddy@gmail.com",
    city: "Mumbai", segment: "Regular", since: "August 2024",
    ltv: "₹6.2L", outstanding: "₹0", totalOrders: 3,
    preferred: ["Beauty Soap", "Gift & Festive Packs"],
    orders: [
      { id: "SO-259844", date: "22 Nov 2025", title: "Beauty Rose Soap 125 g · 7 cartons", value: "₹2,10,000", status: "Delivered" },
    ],
    quotations: [
      { id: "QT-260183", date: "07 Mar 2026", title: "Beauty Soap Combi Pack · 10 cartons", value: "₹3,20,000", status: "In review" },
    ],
    payments: [
      { id: "RC-25844", date: "24 Nov 2025", title: "Full payment · Card", value: "₹2,10,000", status: "Received" },
    ],
    invoices: [
      { id: "INV-25846", date: "22 Nov 2025", title: "Beauty Rose Soap 125 g · 7 cartons", value: "₹2,10,000", status: "Paid" },
    ],
    returns: [],
    repairs: [],
    documents: [{ name: "Aadhaar · KYC", type: "KYC", added: "Aug 2024" }],
    notes: [],
    followUps: [{ text: "Decision call on the premium beauty soap range", due: "Today, 4:00 PM" }],
    communications: [
      { channel: "WhatsApp", text: "Beauty soap pack videos shared", time: "06 Mar 2026" },
    ],
  },
  {
    id: "cust-1051", name: "Meera Kapoor Distributors", phone: "9829104473", email: "meera.kapoor@gmail.com",
    city: "Jaipur", segment: "New", since: "March 2026",
    ltv: "₹1.98L", outstanding: "₹0", totalOrders: 1,
    preferred: ["Beauty Soap"],
    leadId: "LD-26028",
    orders: [
      { id: "SO-260181", date: "06 Mar 2026", title: "Beauty Rose Soap 100 g · 6 cartons", value: "₹1,98,000", status: "Ready" },
    ],
    quotations: [
      { id: "QT-260181", date: "06 Mar 2026", title: "Beauty Rose Soap 100 g · 6 cartons", value: "₹1,98,000", status: "Approved" },
    ],
    payments: [
      { id: "RC-26136", date: "06 Mar 2026", title: "Full payment · Cash", value: "₹99,000", status: "Received" },
    ],
    invoices: [
      { id: "INV-26092", date: "06 Mar 2026", title: "Beauty Rose Soap 100 g · 6 cartons", value: "₹1,98,000", status: "Partial" },
    ],
    returns: [], repairs: [],
    documents: [{ name: "PAN card · KYC", type: "KYC", added: "Mar 2026" }],
    notes: [],
    followUps: [{ text: "Pickup reminder — order ready at Vapi Plant", due: "10 Mar 2026" }],
    communications: [{ channel: "SMS", text: "Order ready notification sent", time: "07 Mar 2026" }],
  },
  {
    id: "cust-1044", name: "Devansh Agarwal Trading", phone: "9810339215", email: "devansh@agarwalgroup.in",
    city: "Delhi", segment: "VIP", gstin: "07AAGCA8811R1ZK", since: "January 2024",
    ltv: "₹22.9L", outstanding: "₹0", totalOrders: 5,
    preferred: ["Bath Soap", "Private Label"],
    orders: [
      { id: "SO-260178", date: "04 Mar 2026", title: "Maharaja Glycerine Soap · 75 g", value: "₹8,90,000", status: "Dispatched" },
    ],
    quotations: [], payments: [
      { id: "RC-26139", date: "05 Mar 2026", title: "Full payment · UPI", value: "₹4,45,000", status: "Received" },
    ],
    invoices: [], returns: [], repairs: [],
    documents: [{ name: "GST registration certificate", type: "GST", added: "Jan 2024" }],
    notes: [], followUps: [], communications: [],
  },
  {
    id: "cust-1029", name: "Sanya Oberoi Retail", phone: "9867445120", email: "sanya.oberoi@gmail.com",
    city: "Mumbai", segment: "Regular", since: "May 2024",
    ltv: "₹3.1L", outstanding: "₹74,000", totalOrders: 2,
    preferred: ["Liquid Soap & Handwash", "Pendants"],
    orders: [
      { id: "SO-260175", date: "01 Mar 2026", title: "Handwash Refill 5 L · 4 cartons", value: "₹1,48,000", status: "Payment pending" },
    ],
    quotations: [], payments: [], invoices: [], returns: [], repairs: [],
    documents: [], notes: [], followUps: [], communications: [],
  },
  {
    id: "cust-1041", name: "Vikram Sethi Stores", phone: "9811076234", email: "vikram.sethi@sethigroup.in",
    city: "Delhi", segment: "Regular", since: "November 2024",
    ltv: "₹4.6L", outstanding: "₹6,12,000", totalOrders: 2,
    preferred: ["Premium & Luxury"],
    orders: [], quotations: [
      { id: "QT-260180", date: "05 Mar 2026", title: "Premium Saffron Gift Pack · 20 cartons", value: "₹6,12,000", status: "Negotiation" },
    ],
    payments: [], invoices: [], returns: [], repairs: [],
    documents: [], notes: [], followUps: [{ text: "Negotiation call on the premium soap range", due: "Today, 3:30 PM" }], communications: [],
  },
  {
    id: "cust-1019", name: "Shagun Hotels (Pooja Trivedi)", phone: "9825601188", email: "pooja.trivedi@gmail.com",
    city: "Ahmedabad", segment: "VIP", since: "June 2023",
    ltv: "₹28.7L", outstanding: "₹0", totalOrders: 4,
    preferred: ["Private Label", "Premium & Luxury"],
    orders: [], quotations: [
      { id: "QT-260173", date: "27 Feb 2026", title: "Shagun Hotels private-label run", value: "₹12,50,000", status: "In review" },
    ],
    payments: [], invoices: [], returns: [], repairs: [],
    documents: [], notes: [], followUps: [{ text: "Private-label artwork approval", due: "12 Mar 2026" }], communications: [],
  },
  {
    id: "cust-1008", name: "Kabir Malhotra", phone: "9929318876", email: "kabir.malhotra@gmail.com",
    city: "Jaipur", segment: "Regular", since: "February 2023",
    ltv: "₹5.4L", outstanding: "₹0", totalOrders: 3,
    preferred: ["Bath Soap", "Gift & Festive Packs"],
    orders: [], quotations: [
      { id: "QT-260182", date: "07 Mar 2026", title: "Sandal Bath Soap 100 g · 9 cartons", value: "₹2,75,500", status: "Draft" },
    ],
    payments: [], invoices: [], returns: [], repairs: [],
    documents: [], notes: [], followUps: [], communications: [],
  },
];
