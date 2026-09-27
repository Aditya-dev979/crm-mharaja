import type {
  Branch,
  NotificationItem,
  QuickCreateItem,
  Quotation,
  SearchRecord,
} from "@/types";

export const quotations: Quotation[] = [
  { id: "QT-260184", customer: "Aarav Mehta Distributors", product: "Maharaja Festive Gift Pack", value: 485000, status: "Approved", owner: "Priya Nair", created: "08 Mar 2026" },
  { id: "QT-260183", customer: "Nisha Reddy Enterprises", product: "Beauty Soap Combi Pack · 10 cartons", value: 320000, status: "Review", owner: "Rohan Iyer", created: "07 Mar 2026" },
  { id: "QT-260182", customer: "Kabir Malhotra", product: "Sandal Bath Soap 100 g · 9 cartons", value: 275500, status: "Draft", owner: "Priya Nair", created: "07 Mar 2026" },
  { id: "QT-260181", customer: "Meera Kapoor Distributors", product: "Beauty Rose Soap 100 g · 6 cartons", value: 198000, status: "Approved", owner: "Arjun Sharma", created: "06 Mar 2026" },
  { id: "QT-260180", customer: "Vikram Sethi Stores", product: "Premium Saffron Gift Pack · 20 cartons", value: 612000, status: "Review", owner: "Rohan Iyer", created: "05 Mar 2026" },
  { id: "QT-260179", customer: "Ananya Joshi Retail", product: "Beauty Soap Combi Pack · 8 cartons", value: 264000, status: "Draft", owner: "Priya Nair", created: "05 Mar 2026" },
  { id: "QT-260178", customer: "Devansh Agarwal Trading", product: "Maharaja Glycerine Soap · 75 g", value: 890000, status: "Approved", owner: "Arjun Sharma", created: "04 Mar 2026" },
  { id: "QT-260177", customer: "Ishita Bansal", product: "Herbal Tulsi Soap 100 g · 11 cartons", value: 342500, status: "Expired", owner: "Rohan Iyer", created: "03 Mar 2026" },
  { id: "QT-260176", customer: "Rahul Khanna", product: "Premium Saffron Bar 125 g · 24 cartons", value: 725000, status: "Review", owner: "Priya Nair", created: "02 Mar 2026" },
  { id: "QT-260175", customer: "Sanya Oberoi Retail", product: "Handwash Refill 5 L · 4 cartons", value: 148000, status: "Approved", owner: "Arjun Sharma", created: "01 Mar 2026" },
  { id: "QT-260174", customer: "Aditya Rao", product: "Beauty Soap Combi Pack · 15 cartons", value: 456000, status: "Draft", owner: "Rohan Iyer", created: "28 Feb 2026" },
  { id: "QT-260173", customer: "Shagun Hotels (Pooja Trivedi)", product: "Shagun Hotels private-label run", value: 1250000, status: "Review", owner: "Priya Nair", created: "27 Feb 2026" },
];

export const branches: Branch[] = [
  { id: "jaipur", name: "Vapi Plant", area: "GIDC Char Rasta · Head office" },
  { id: "mumbai", name: "Ahmedabad Depot", area: "Narol GIDC · Regional depot" },
  { id: "delhi", name: "Delhi Depot", area: "Okhla Phase II · North depot" },
];

export const notificationsSeed: NotificationItem[] = [
  { id: "n1", category: "approval", icon: "warning", title: "Approval required", message: "Quotation QT-260184 is below the margin threshold.", time: "2 min", unread: true },
  { id: "n2", category: "alert", icon: "gem", title: "Low stock alert", message: "Maharaja Glycerine Soap · 75 g is below minimum stock.", time: "18 min", unread: true },
  { id: "n3", category: "update", icon: "grid", title: "New sales order", message: "SO-260184 created by Priya Nair for ₹4,85,000.", time: "1 hr", unread: true },
  { id: "n4", category: "mention", icon: "calendar", title: "Follow-up due", message: "Priya mentioned you: call Nisha Reddy Enterprises about the beauty soap range.", time: "3 hr", unread: false },
  { id: "n5", category: "update", icon: "building", title: "Inspection required", message: "PO-260081 has arrived at Jaipur warehouse.", time: "Yesterday", unread: false },
];

export const searchRecords: SearchRecord[] = [
  { id: "s1", category: "Customers", title: "Aarav Mehta Distributors", meta: "CUST-1048 · Jaipur", icon: "user", customerId: "cust-1048" },
  { id: "s2", category: "Customers", title: "Nisha Reddy Enterprises", meta: "CUST-1032 · Mumbai", icon: "user", customerId: "cust-1032" },
  { id: "s3", category: "Products", title: "Maharaja Sandal Bath Soap · 125 g", meta: "MS-BATH-0524 · In stock", icon: "gem" },
  { id: "s4", category: "Products", title: "Maharaja Neem & Tulsi Soap · 100 g", meta: "MS-HERB-0318 · Reserved", icon: "gem" },
  { id: "s5", category: "Orders", title: "Sales Order SO-260184", meta: "₹4,85,000 · Confirmed", icon: "grid" },
  { id: "s6", category: "Orders", title: "Sales Order SO-260179", meta: "₹2,64,000 · Payment pending", icon: "grid" },
  { id: "s7", category: "Certificates", title: "NABL 6247119928", meta: "Herbal Neem · Batch HN-3180", icon: "shield" },
  { id: "s8", category: "Certificates", title: "BIS 40881236", meta: "Premium Saffron · Batch PS-1020", icon: "shield" },
];

export const quickCreateItems: QuickCreateItem[] = [
  { label: "New Lead", icon: "user" },
  { label: "New Customer", icon: "user" },
  { label: "New Product", icon: "gem" },
  { label: "New Quotation", icon: "component" },
  { label: "New Sales Order", icon: "grid" },
  { label: "Purchase Request", icon: "building" },
  { label: "New Invoice", icon: "component" },
  { label: "New Payment", icon: "plus" },
  { label: "New Task", icon: "check" },
  { label: "New Expense", icon: "plus" },
];
