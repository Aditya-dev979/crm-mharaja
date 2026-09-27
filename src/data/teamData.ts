import type { BadgeTone } from "@/components/ui/Badge";
import type { IconName } from "@/components/ui/Icon";
import type {
  AuditRecord,
  StaffMember,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TeamNotification,
  TeamNotificationType,
} from "@/types";

/* In-universe "today" is 08 Mar 2026 — tasks due earlier and not completed are overdue. */
export const TODAY_DAY = 8;

export const taskStatusTone: Record<TaskStatus, BadgeTone> = {
  Pending: "royal",
  Overdue: "danger",
  Completed: "emerald",
};

export const taskPriorityTone: Record<TaskPriority, BadgeTone> = {
  High: "danger",
  Medium: "amber",
  Low: "neutral",
};

export const notificationTypes: TeamNotificationType[] = [
  "New lead", "New order", "Payment due", "Approval required",
  "Low stock", "Inspection required", "Dispatch due", "Follow-up due",
  "New Task", "New Approval", "Purchase Update", "Quotation Update",
  "Production Update", "GRN Deviation Alert", "Sales Return Update",
  "Stock Status Update", "Invoice Status Update", "Next Action", "Assignee Update",
  "Support Ticket", "Customer Feedback", "Dispatch Update",
];

export const notificationIcon: Record<TeamNotificationType, IconName> = {
  "New lead": "target",
  "New order": "grid",
  "Payment due": "wallet",
  "Approval required": "warning",
  "Low stock": "layers",
  "Inspection required": "shield",
  "Dispatch due": "send",
  "Follow-up due": "calendar",
  "New Task": "check",
  "New Approval": "shield",
  "Purchase Update": "building",
  "Quotation Update": "component",
  "Production Update": "settings",
  "GRN Deviation Alert": "warning",
  "Sales Return Update": "grid",
  "Stock Status Update": "layers",
  "Invoice Status Update": "wallet",
  "Next Action": "calendar",
  "Assignee Update": "user",
  "Support Ticket": "help",
  "Customer Feedback": "mail",
  "Dispatch Update": "send",
};

/* Where each notification type takes you when no record reference exists. */
export const notificationTarget: Record<TeamNotificationType, string> = {
  "New lead": "leads",
  "New order": "sales",
  "Payment due": "finance",
  "Approval required": "finance",
  "Low stock": "inventory",
  "Inspection required": "quality",
  "Dispatch due": "dispatch",
  "Follow-up due": "leads",
  "New Task": "team",
  "New Approval": "finance",
  "Purchase Update": "purchase",
  "Quotation Update": "purchase",
  "Production Update": "production",
  "GRN Deviation Alert": "purchase",
  "Sales Return Update": "quality",
  "Stock Status Update": "inventory",
  "Invoice Status Update": "finance",
  "Next Action": "team",
  "Assignee Update": "team",
  "Support Ticket": "post-sales",
  "Customer Feedback": "post-sales",
  "Dispatch Update": "dispatch",
};

export const seedStaff: StaffMember[] = [
  { id: "stf-01", name: "Arjun Sharma", role: "Approving Manager", email: "arjun@maharajasoap.in", phone: "9829011002", branch: "Vapi Plant", since: "2018", active: true },
  { id: "stf-02", name: "Priya Nair", role: "Sales Representative", email: "priya@maharajasoap.in", phone: "9829011014", branch: "Vapi Plant", since: "2021", active: true },
  { id: "stf-03", name: "Rohan Iyer", role: "Sales Representative", email: "rohan@maharajasoap.in", phone: "9829011019", branch: "Ahmedabad Depot", since: "2022", active: true },
  { id: "stf-04", name: "Kavita Shah", role: "Purchase Manager", email: "kavita@maharajasoap.in", phone: "9829011021", branch: "Vapi Plant", since: "2019", active: true },
  { id: "stf-05", name: "Deepak Verma", role: "Plant Manager", email: "deepak@maharajasoap.in", phone: "9829011027", branch: "Vapi Plant", since: "2020", active: true },
  { id: "stf-06", name: "Ishita Mehra", role: "Billing Executive", email: "ishita@maharajasoap.in", phone: "9829011033", branch: "Delhi Depot", since: "2024", active: false },
  { id: "stf-07", name: "Suresh Yadav", role: "Dispatch Coordinator", email: "suresh@maharajasoap.in", phone: "9829011038", branch: "Vapi Plant", since: "2023", active: true },
  { id: "stf-08", name: "Neha Kulkarni", role: "Accounts Team", email: "neha@maharajasoap.in", phone: "9829011041", branch: "Vapi Plant", since: "2022", active: true },
];

export const seedTasks: TaskItem[] = [
  {
    id: "TSK-2618", title: "Collect balance ₹2,85,000 from Aarav Mehta Distributors",
    detail: "Against INV-26097 — he prefers a call after 6 PM.",
    assignee: "Arjun Sharma", due: "09 Mar 2026", dueDay: 9, priority: "High", status: "Pending",
    related: "SO-260184", created: "08 Mar 2026",
  },
  {
    id: "TSK-2617", title: "Call Nisha Reddy Enterprises on the beauty soap range counter-offer",
    detail: "She is at 8% — we hold 4% unless Arjun approves.",
    assignee: "Rohan Iyer", due: "08 Mar 2026", dueDay: 8, priority: "High", status: "Pending",
    related: "QT-260183", created: "07 Mar 2026",
  },
  {
    id: "TSK-2616", title: "Schedule redelivery for Shagun Hotels (Pooja Trivedi)'s failed package",
    detail: "DS-2598 failed twice — customer back in town on the 12th.",
    assignee: "Priya Nair", due: "06 Mar 2026", dueDay: 6, priority: "Medium", status: "Overdue",
    related: "DS-2598", created: "05 Mar 2026",
  },
  {
    id: "TSK-2615", title: "Chase Shakti Oils & Chemicals on the 2-drum shortfall",
    detail: "DN-2601 raised — adjust in the balance payment.",
    assignee: "Kavita Shah", due: "10 Mar 2026", dueDay: 10, priority: "Medium", status: "Pending",
    related: "PO-260081", created: "08 Mar 2026",
  },
  {
    id: "TSK-2614", title: "Cycle count — Warehouse A finished-goods racks",
    detail: "Quarterly verification session for the bulk-material trays.",
    assignee: "Deepak Verma", due: "12 Mar 2026", dueDay: 12, priority: "Low", status: "Pending",
    created: "06 Mar 2026",
  },
  {
    id: "TSK-2613", title: "Send festive-season catalogue to the VIP distributor list",
    detail: "After manager approval of the marketing spend.",
    assignee: "Priya Nair", due: "11 Mar 2026", dueDay: 11, priority: "Medium", status: "Pending",
    created: "07 Mar 2026",
  },
  {
    id: "TSK-2612", title: "Renew BIS batch coding licence",
    assignee: "Arjun Sharma", due: "05 Mar 2026", dueDay: 5, priority: "High", status: "Overdue",
    created: "01 Mar 2026",
  },
  {
    id: "TSK-2611", title: "Photograph the new herbal soap lot for the catalogue",
    detail: "12 drums from PO-260092 once the GRN posts.",
    assignee: "Deepak Verma", due: "14 Mar 2026", dueDay: 14, priority: "Low", status: "Pending",
    related: "PO-260092", created: "05 Mar 2026",
  },
  {
    id: "TSK-2610", title: "File February GST returns",
    assignee: "Arjun Sharma", due: "04 Mar 2026", dueDay: 4, priority: "High", status: "Completed",
    created: "01 Mar 2026", completedAt: "04 Mar 2026",
  },
  {
    id: "TSK-2609", title: "Confirm guest-soap base selection with Pooja",
    assignee: "Priya Nair", due: "03 Mar 2026", dueDay: 3, priority: "Medium", status: "Completed",
    related: "CO-26012", created: "28 Feb 2026", completedAt: "03 Mar 2026",
  },
];

export const seedTeamNotifications: TeamNotification[] = [
  { id: "tn-18", type: "Approval required", title: "Quotation below margin threshold", message: "QT-260184 needs manager approval for the extra discount.", time: "2 min", unread: true, reference: "QT-260184" },
  { id: "tn-17", type: "Low stock", title: "Maharaja Glycerine Soap · 75 g below minimum", message: "Only one carton left after recent sales — raise a purchase request.", time: "18 min", unread: true },
  { id: "tn-16", type: "New order", title: "SO-260184 confirmed", message: "Priya Nair confirmed the festive gift pack order for ₹4,85,000.", time: "1 hr", unread: true, reference: "SO-260184" },
  { id: "tn-15", type: "Payment due", title: "SO-260175 overdue", message: "Sanya Oberoi Retail's handwash order is unpaid past 07 Mar — reminder sent twice.", time: "2 hr", unread: true, reference: "SO-260175" },
  { id: "tn-14", type: "Dispatch due", title: "DS-2603 ready to pack", message: "Aarav Mehta Distributors's ring is queued — dispatch after balance clears.", time: "3 hr", unread: false, reference: "DS-2603" },
  { id: "tn-13", type: "Follow-up due", title: "Call Nisha Reddy Enterprises today", message: "Counter-offer discussion on the beauty soap range is due today.", time: "4 hr", unread: true },
  { id: "tn-12", type: "Inspection required", title: "PO-260081 material at warehouse", message: "Rose fragrance compound lot awaits quality inspection at GRN-260081.", time: "Yesterday", unread: false, reference: "GRN-260081" },
  { id: "tn-11", type: "New lead", title: "Walk-in enquiry captured", message: "Ananya Joshi Retail asked about handwash and liquid soap range — assigned to Priya.", time: "Yesterday", unread: false },
  { id: "tn-10", type: "Approval required", title: "Marketing expense pending", message: "EXP-2609 · ₹68,000 festive-season campaign awaits sign-off.", time: "Yesterday", unread: false, reference: "EXP-2609" },
  { id: "tn-09", type: "Follow-up due", title: "Vikram Sethi Stores decision window", message: "Luxury soap range quote QT-260180 expires on 20 Mar.", time: "2 days", unread: false, reference: "QT-260180" },
];

export const seedAudit: AuditRecord[] = [
  {
    id: "aud-2632", user: "Arjun Sharma", action: "Payment recorded", module: "Billing",
    time: "08 Mar 2026, 11:02 AM", record: "RC-26140 · SO-260184",
    oldValue: "Paid ₹0", newValue: "Paid ₹2,00,000 · Bank transfer",
    device: "Chrome · Windows 11", ip: "103.68.16.44",
  },
  {
    id: "aud-2631", user: "Priya Nair", action: "Invoice generated", module: "Sales",
    time: "08 Mar 2026, 10:41 AM", record: "INV-26097",
    oldValue: "No invoice", newValue: "INV-26097 · ₹4,85,000",
    device: "Chrome · Windows 11", ip: "103.68.16.41",
  },
  {
    id: "aud-2630", user: "Priya Nair", action: "Order status changed", module: "Sales",
    time: "08 Mar 2026, 10:31 AM", record: "SO-260184",
    oldValue: "Confirmed", newValue: "Partially Paid",
    device: "Chrome · Windows 11", ip: "103.68.16.41",
  },
  {
    id: "aud-2629", user: "Arjun Sharma", action: "Expense approved", module: "Accounts",
    time: "07 Mar 2026, 6:12 PM", record: "EXP-2610 · Rent",
    oldValue: "Pending Approval", newValue: "Approved · posts to ledger",
    device: "Chrome · Windows 11", ip: "103.68.16.44",
  },
  {
    id: "aud-2628", user: "Deepak Verma", action: "Stock adjusted", module: "Inventory",
    time: "07 Mar 2026, 4:20 PM", record: "MS-BEAU-0510",
    oldValue: "Stock 2", newValue: "Stock 1 · sale reservation",
    device: "Edge · Windows 11", ip: "103.68.16.47",
  },
  {
    id: "aud-2627", user: "Kavita Shah", action: "PO sent to supplier", module: "Purchase",
    time: "27 Feb 2026, 4:05 PM", record: "PO-260092 · Ratna Oleochemicals",
    oldValue: "Draft", newValue: "Sent · ₹12,40,000",
    device: "Chrome · macOS", ip: "49.36.112.8",
  },
  {
    id: "aud-2626", user: "Arjun Sharma", action: "Return refund approved", module: "Returns",
    time: "22 Jan 2026, 12:40 PM", record: "RT-260002",
    oldValue: "Stock Reconciled", newValue: "Refund ₹1,85,000 approved",
    device: "Chrome · Windows 11", ip: "103.68.16.44",
  },
  {
    id: "aud-2625", user: "Rohan Iyer", action: "Quotation discount edited", module: "Sales",
    time: "07 Mar 2026, 3:05 PM", record: "QT-260183",
    oldValue: "Discount 3%", newValue: "Discount 4%",
    device: "Safari · iPadOS", ip: "152.58.34.19",
  },
  {
    id: "aud-2624", user: "Deepak Verma", action: "Inspection approved", module: "Quality",
    time: "Yesterday, 5:40 PM", record: "QI-2608",
    oldValue: "In Review", newValue: "Approved",
    device: "Edge · Windows 11", ip: "103.68.16.47",
  },
  {
    id: "aud-2623", user: "Priya Nair", action: "Customer profile edited", module: "Customers",
    time: "06 Mar 2026, 1:15 PM", record: "CUST-1048 · Aarav Mehta Distributors",
    oldValue: "Segment: Regular", newValue: "Segment: VIP",
    device: "Chrome · Windows 11", ip: "103.68.16.41",
  },
  {
    id: "aud-2622", user: "Ishita Mehra", action: "Login", module: "Settings",
    time: "06 Mar 2026, 9:02 AM", record: "Session sess-88213",
    device: "Chrome · Android", ip: "106.51.72.155",
  },
  {
    id: "aud-2621", user: "Arjun Sharma", action: "Credit note issued", module: "Billing",
    time: "09 Jan 2026, 12:20 PM", record: "CN-26001 · Shagun Hotels (Pooja Trivedi)",
    oldValue: "—", newValue: "₹96,000 · valid till 09 Jul 2026",
    device: "Chrome · Windows 11", ip: "103.68.16.44",
  },
];

export const auditModules = ["All modules", "Sales", "Billing", "Payments", "Accounts", "Inventory", "Purchase", "Production", "Quality", "Returns", "Dispatch", "Customers", "Tasks", "Settings", "Users & Roles"];

/* March 2026 — 1st falls on a Sunday, 31 days. */
export const CALENDAR = { month: "March 2026", firstWeekday: 0, days: 31 };
