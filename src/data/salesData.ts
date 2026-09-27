import type { BadgeTone } from "@/components/ui/Badge";
import type { OrderStatus, QuoteLine, QuoteStatus, SalesOrder, SalesQuotation } from "@/types";

export const quoteStatusTone: Record<QuoteStatus, BadgeTone> = {
  Draft: "neutral",
  Sent: "royal",
  Negotiation: "amber",
  Accepted: "emerald",
  Rejected: "danger",
  Expired: "danger",
  Converted: "emerald",
};

export const orderStatusTone: Record<OrderStatus, BadgeTone> = {
  Draft: "neutral",
  Confirmed: "royal",
  "Payment Pending": "danger",
  "Partially Paid": "amber",
  Processing: "amber",
  Ready: "emerald",
  Dispatched: "royal",
  Delivered: "emerald",
  Completed: "emerald",
  Cancelled: "neutral",
};

export const orderStatuses: OrderStatus[] = [
  "Draft", "Confirmed", "Payment Pending", "Partially Paid", "Processing",
  "Ready", "Dispatched", "Delivered", "Completed", "Cancelled",
];

export const paymentMethods = ["Bank transfer", "UPI", "Card", "Cash", "Cheque", "Online"];

export const couriers = ["Sequel Logistics", "BVC Express", "Brinks Secure", "Store pickup"];

export const defaultTerms =
  "Prices are inclusive of 18% GST. Quotation valid until the date shown. 40% advance confirms the order; balance before dispatch. Every batch ships with its lab report and batch certificate.";

/* GST-inclusive pricing: the line price already includes GST.
   gstIncluded = total × rate / (100 + rate) */
export const lineTotal = (line: QuoteLine) =>
  Math.round(line.price * line.qty * (1 - line.discountPct / 100));

export function saleTotals(lines: QuoteLine[], gstPct: number) {
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const discount = gross - total;
  const gstIncluded = Math.round((total * gstPct) / (100 + gstPct));
  return { gross, discount, total, gstIncluded };
}

export const paidAmount = (order: SalesOrder) => order.payments.reduce((s, p) => s + p.amount, 0);

/* What the customer is told, as opposed to the internal operational status. */
export const customerFacingStatus = (order: SalesOrder): string => {
  switch (order.status) {
    case "Draft":
    case "Confirmed":
      return "Order confirmed";
    case "Payment Pending":
    case "Partially Paid":
      return "Awaiting payment";
    case "Processing":
      return order.release ? "In production" : "Being prepared";
    case "Ready":
      return "Ready for dispatch";
    case "Dispatched":
      return "On the way";
    case "Delivered":
      return "Delivered";
    case "Completed":
      return "Completed";
    case "Cancelled":
      return "Cancelled";
  }
};

export const releaseDestinations = ["Owned Factory", "Contract Manufacturer"] as const;

export const seedQuotations: SalesQuotation[] = [
  {
    id: "QT-260184", customerId: "cust-1048", customerName: "Aarav Mehta Distributors", executive: "Priya Nair",
    lines: [{ productId: "prd-0088", sku: "MS-GIFT-0088", name: "Maharaja Festive Gift Pack · 4 × 100 g", tone: "emerald", price: 500000, qty: 1, discountPct: 3 }],
    gstPct: 18, validUntil: "15 Mar 2026", terms: defaultTerms,
    status: "Converted", created: "07 Mar 2026", orderId: "SO-260184",
    timeline: [
      { text: "Converted to order SO-260184", time: "08 Mar, 10:30 AM" },
      { text: "Accepted by customer on WhatsApp", time: "08 Mar, 9:55 AM" },
      { text: "Approved by Arjun Sharma (margin exception)", time: "08 Mar, 10:24 AM" },
      { text: "Sent to Aarav Mehta Distributors by email", time: "07 Mar, 6:20 PM" },
      { text: "Quotation created", time: "07 Mar, 5:48 PM" },
    ],
  },
  {
    id: "QT-260183", customerId: "cust-1032", customerName: "Nisha Reddy Enterprises", executive: "Rohan Iyer",
    lines: [{ productId: "prd-0524", sku: "MS-BATH-0524", name: "Maharaja Sandal Bath Soap · 125 g", tone: "sapphire", price: 400000, qty: 1, discountPct: 4 }],
    gstPct: 18, validUntil: "14 Mar 2026", terms: defaultTerms,
    status: "Negotiation", created: "07 Mar 2026",
    notes: "Asking for 8% — needs manager approval beyond 4%.",
    timeline: [
      { text: "Counter-offer discussed on call", time: "Today, 11:20 AM" },
      { text: "Sent to Nisha Reddy Enterprises on WhatsApp", time: "07 Mar, 3:10 PM" },
      { text: "Quotation created", time: "07 Mar, 2:52 PM" },
    ],
  },
  {
    id: "QT-260182", customerId: "cust-1008", customerName: "Kabir Malhotra", executive: "Priya Nair",
    lines: [{ productId: "prd-0064", sku: "MS-HERB-0064", name: "Maharaja Haldi Chandan Soap · 100 g", tone: "ruby", price: 284000, qty: 1, discountPct: 3 }],
    gstPct: 18, validUntil: "18 Mar 2026", terms: defaultTerms,
    status: "Draft", created: "07 Mar 2026",
    timeline: [{ text: "Quotation created", time: "07 Mar, 12:40 PM" }],
  },
  {
    id: "QT-260181", customerId: "cust-1051", customerName: "Meera Kapoor Distributors", executive: "Arjun Sharma",
    lines: [{ productId: "prd-0510", sku: "MS-BEAU-0510", name: "Maharaja Rose Beauty Soap · 100 g", tone: "yellow-sapphire", price: 200000, qty: 1, discountPct: 1 }],
    gstPct: 18, validUntil: "12 Mar 2026", terms: defaultTerms,
    status: "Converted", created: "06 Mar 2026", orderId: "SO-260181",
    timeline: [
      { text: "Converted to order SO-260181", time: "06 Mar, 4:45 PM" },
      { text: "Accepted in store", time: "06 Mar, 4:30 PM" },
      { text: "Quotation created", time: "06 Mar, 3:50 PM" },
    ],
  },
  {
    id: "QT-260180", customerId: "cust-1041", customerName: "Vikram Sethi Stores", executive: "Rohan Iyer",
    lines: [{ productId: "prd-0071", sku: "MS-PREM-0071", name: "Maharaja Ubtan Luxury Soap · 125 g", tone: "diamond", price: 637500, qty: 1, discountPct: 4 }],
    gstPct: 18, validUntil: "20 Mar 2026", terms: defaultTerms,
    status: "Sent", created: "05 Mar 2026",
    notes: "Customer asked for 6% — hold at 4% unless approved.",
    timeline: [
      { text: "Sent to Vikram Sethi Stores by email", time: "05 Mar, 5:05 PM" },
      { text: "Quotation created", time: "05 Mar, 4:40 PM" },
    ],
  },
  {
    id: "QT-260173", customerId: "cust-1019", customerName: "Shagun Hotels (Pooja Trivedi)", executive: "Priya Nair",
    lines: [{ productId: "prd-0012", sku: "MS-PVTL-0012", name: "Private Label · Shagun Hotels Guest Soap 15 g", tone: "gold", price: 1250000, qty: 1, discountPct: 0 }],
    gstPct: 18, validUntil: "25 Mar 2026", terms: defaultTerms,
    status: "Negotiation", created: "27 Feb 2026",
    notes: "Artwork approval pending — final price after base selection.",
    timeline: [
      { text: "Revised design shared for approval", time: "05 Mar" },
      { text: "Sent to Shagun Hotels (Pooja Trivedi)", time: "28 Feb" },
      { text: "Quotation created", time: "27 Feb" },
    ],
  },
  {
    id: "QT-260172", customerId: "cust-1029", customerName: "Sanya Oberoi Retail", executive: "Rohan Iyer",
    lines: [{ productId: "prd-0180", sku: "MS-LAUN-0180", name: "Maharaja Detergent Bar · 250 g", tone: "spinel", price: 82000, qty: 1, discountPct: 0 }],
    gstPct: 18, validUntil: "05 Mar 2026", terms: defaultTerms,
    status: "Rejected", created: "26 Feb 2026",
    notes: "Chose the competing handwash range instead.",
    timeline: [
      { text: "Marked rejected — customer chose another design", time: "01 Mar" },
      { text: "Sent to Sanya Oberoi Retail", time: "26 Feb" },
      { text: "Quotation created", time: "26 Feb" },
    ],
  },
  {
    id: "QT-260170", customerId: "cust-1044", customerName: "Devansh Agarwal Trading", executive: "Kavita Shah",
    lines: [{ productId: "prd-0102", sku: "MS-PREM-0102", name: "Maharaja Saffron Luxury Soap · 100 g", tone: "diamond", price: 725000, qty: 1, discountPct: 0 }],
    gstPct: 18, validUntil: "28 Feb 2026", terms: defaultTerms,
    status: "Expired", created: "18 Feb 2026",
    timeline: [
      { text: "Validity lapsed — marked expired", time: "01 Mar" },
      { text: "Sent to Devansh Agarwal Trading", time: "18 Feb" },
      { text: "Quotation created", time: "18 Feb" },
    ],
  },
];

export const seedOrders: SalesOrder[] = [
  {
    id: "SO-260184", quotationId: "QT-260184", customerId: "cust-1048", customerName: "Aarav Mehta Distributors",
    executive: "Priya Nair", gstPct: 18,
    lines: [{ productId: "prd-0088", sku: "MS-GIFT-0088", name: "Maharaja Festive Gift Pack · 4 × 100 g", tone: "emerald", price: 500000, qty: 1, discountPct: 3 }],
    status: "Partially Paid", created: "08 Mar 2026",
    payments: [{ id: "RC-26140", date: "08 Mar 2026", method: "Bank transfer", amount: 200000 }],
    invoiceId: "INV-26097",
    deliveryAddress: "14, Civil Lines, Jaipur 302006",
    notes: "Collect balance before dispatch. Customer prefers evening delivery.",
    timeline: [
      { text: "Advance ₹2,00,000 received — bank transfer", time: "08 Mar, 11:02 AM" },
      { text: "Invoice INV-26097 generated", time: "08 Mar, 10:41 AM" },
      { text: "Stock reserved — MS-GIFT-0088", time: "08 Mar, 10:31 AM" },
      { text: "Order confirmed from QT-260184", time: "08 Mar, 10:30 AM" },
    ],
  },
  {
    id: "SO-260181", quotationId: "QT-260181", customerId: "cust-1051", customerName: "Meera Kapoor Distributors",
    executive: "Arjun Sharma", gstPct: 18,
    lines: [{ productId: "prd-0510", sku: "MS-BEAU-0510", name: "Maharaja Rose Beauty Soap · 100 g", tone: "yellow-sapphire", price: 200000, qty: 1, discountPct: 1 }],
    status: "Ready", created: "06 Mar 2026",
    payments: [{ id: "RC-26136", date: "06 Mar 2026", method: "Cash", amount: 99000 }],
    invoiceId: "INV-26092",
    deliveryAddress: "Store pickup · Vapi Plant",
    notes: "Pickup reminder sent — balance due at collection.",
    timeline: [
      { text: "Marked ready for pickup", time: "07 Mar, 12:10 PM" },
      { text: "Advance ₹99,000 received — cash", time: "06 Mar, 5:20 PM" },
      { text: "Invoice INV-26092 generated", time: "06 Mar, 5:05 PM" },
      { text: "Order confirmed from QT-260181", time: "06 Mar, 4:45 PM" },
    ],
  },
  {
    id: "SO-260178", customerId: "cust-1044", customerName: "Devansh Agarwal Trading",
    executive: "Kavita Shah", gstPct: 18,
    lines: [{ productId: "prd-0320", sku: "MS-GLYC-0320", name: "Maharaja Glycerine Soap · 75 g", tone: "ruby", price: 890000, qty: 1, discountPct: 0 }],
    status: "Dispatched", created: "04 Mar 2026",
    payments: [
      { id: "RC-26130", date: "04 Mar 2026", method: "Bank transfer", amount: 445000 },
      { id: "RC-26139", date: "05 Mar 2026", method: "UPI", amount: 445000 },
    ],
    invoiceId: "INV-26095",
    courier: "Sequel Logistics", tracking: "SQ-889123", expectedDelivery: "Today",
    deliveryAddress: "22, Golf Links, New Delhi 110003",
    timeline: [
      { text: "Dispatched via Sequel Logistics · SQ-889123", time: "07 Mar, 6:12 PM" },
      { text: "Balance ₹4,45,000 received — UPI", time: "05 Mar, 2:30 PM" },
      { text: "Invoice INV-26095 generated", time: "04 Mar, 6:00 PM" },
      { text: "Order confirmed", time: "04 Mar, 5:30 PM" },
    ],
  },
  {
    id: "SO-260175", customerId: "cust-1029", customerName: "Sanya Oberoi Retail",
    executive: "Rohan Iyer", gstPct: 18,
    lines: [{ productId: "prd-0031", sku: "MS-DISH-0031", name: "Maharaja Lemon Dishwash Bar · 200 g", tone: "pearl", price: 148000, qty: 1, discountPct: 0 }],
    status: "Payment Pending", created: "01 Mar 2026",
    deliveryAddress: "8B, Pali Hill, Mumbai 400050",
    payments: [],
    notes: "Two reminders sent. Cancel if unpaid by 15 Mar.",
    timeline: [
      { text: "Payment reminder sent on WhatsApp", time: "06 Mar" },
      { text: "Order confirmed — awaiting payment", time: "01 Mar" },
    ],
  },
  {
    id: "SO-259844", customerId: "cust-1032", customerName: "Nisha Reddy Enterprises",
    executive: "Rohan Iyer", gstPct: 18,
    lines: [{ productId: "prd-0102e", sku: "MS-BABY-0102", name: "Maharaja Baby Care Soap · 75 g", tone: "sapphire", price: 210000, qty: 1, discountPct: 0 }],
    status: "Completed", created: "22 Nov 2025",
    payments: [{ id: "RC-25844", date: "24 Nov 2025", method: "Card", amount: 210000 }],
    invoiceId: "INV-25846",
    courier: "BVC Express", tracking: "BVC-77012", expectedDelivery: "Delivered 26 Nov 2025",
    deliveryAddress: "3, Carter Road, Mumbai 400050",
    timeline: [
      { text: "Order completed — feedback requested", time: "28 Nov 2025" },
      { text: "Delivered by BVC Express", time: "26 Nov 2025" },
      { text: "Full payment received — card", time: "24 Nov 2025" },
      { text: "Order confirmed", time: "22 Nov 2025" },
    ],
  },
  {
    id: "SO-260171", customerId: "cust-1044", customerName: "Devansh Agarwal Trading",
    executive: "Kavita Shah", gstPct: 18,
    lines: [{ productId: "prd-0155", sku: "MS-HERB-0155", name: "Maharaja Aloe Vera Soap · 100 g", tone: "emerald", price: 168000, qty: 1, discountPct: 0 }],
    status: "Cancelled", created: "28 Feb 2026",
    payments: [],
    notes: "Cancelled — batch failed inspection. Customer offered alternatives.",
    timeline: [
      { text: "Order cancelled — batch failed inspection", time: "04 Mar" },
      { text: "Order confirmed", time: "28 Feb" },
    ],
  },
];
