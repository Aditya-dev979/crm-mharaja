import type { IconName } from "@/components/ui/Icon";

export type QuotationStatus = "Approved" | "Review" | "Draft" | "Expired";

export interface Quotation {
  id: string;
  customer: string;
  product: string;
  value: number;
  status: QuotationStatus;
  owner: string;
  created: string;
}

export interface Branch {
  id: string;
  name: string;
  area: string;
}

export type NotificationCategory = "approval" | "alert" | "update" | "mention";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  icon: IconName;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export type SearchCategory = "Customers" | "Products" | "Orders" | "Certificates";

export interface SearchRecord {
  id: string;
  category: SearchCategory;
  title: string;
  meta: string;
  icon: IconName;
  customerId?: string;
  productId?: string;
  quotationId?: string;
  orderId?: string;
}

export interface QuickCreateItem {
  label: string;
  icon: IconName;
}

/* ---------- Phase 03 · CRM ---------- */

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Product Shared"
  | "Quotation Sent"
  | "Negotiation"
  | "Converted"
  | "Lost";

export type LeadPriority = "Hot" | "Warm" | "Cold";

export interface NoteEntry {
  text: string;
  author: string;
  time: string;
}

export interface LeadEvent {
  text: string;
  time: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  requirement: string;
  interest: string;
  specifications?: string;
  deliveryExpectation?: string;
  budget: number;
  city: string;
  executive: string;
  status: LeadStatus;
  priority: LeadPriority;
  nextFollowUp: string;
  created: string;
  notes: NoteEntry[];
  timeline: LeadEvent[];
  lostReason?: string;
  customerId?: string;
}

export type CustomerSegment = "VIP" | "Regular" | "New";

export interface CustomerRecordRow {
  id: string;
  date: string;
  title: string;
  value: string;
  status: string;
}

export interface CustomerDocument {
  name: string;
  type: string;
  added: string;
}

export interface CustomerFollowUp {
  text: string;
  due: string;
}

export interface CommunicationEntry {
  channel: "WhatsApp" | "Email" | "SMS" | "Call";
  text: string;
  time: string;
}

/* ---------- Phase 04 · Products, Packs & Compliance ---------- */

export type ProductStatus =
  | "Available"
  | "Reserved"
  | "Sold"
  | "Under Inspection"
  | "In Repair"
  | "Returned"
  | "Damaged"
  | "Dispatched";

export type CertificateStatus =
  | "Missing"
  | "Uploaded"
  | "Pending Verification"
  | "Verified"
  | "Expired"
  | "Rejected";

export type GemTone =
  | "sapphire"
  | "yellow-sapphire"
  | "bicolour"
  | "ruby"
  | "emerald"
  | "diamond"
  | "spinel"
  | "gold"
  | "pearl";

export interface ProductImage {
  id: string;
  label: string;
  tone: GemTone;
}

export interface ProductCertificate {
  number: string;
  authority: string;
  issueDate: string;
  type: string;
  status: Exclude<CertificateStatus, "Missing">;
  fileName?: string;
  uploadedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ProductActivity {
  text: string;
  user: string;
  time: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  gemstoneType?: string;
  origin?: string;
  shape?: string;
  cut?: string;
  carat?: number;
  weightGrams?: number;
  dimensions?: string;
  color?: string;
  clarity?: string;
  treatment?: string;
  certificate: ProductCertificate | null;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  stock: number;
  location: string;
  status: ProductStatus;
  notes?: string;
  images: ProductImage[];
  primaryImageId: string | null;
  activity: ProductActivity[];
  created: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  kind: "Personal Care" | "Home Care";
  active: boolean;
}

/* ---------- Phase 05 · Inventory, Warehouse & Stock Control ---------- */

export type StockMovementType =
  | "Purchase"
  | "GRN"
  | "Stock In"
  | "Reservation"
  | "Sale"
  | "Dispatch"
  | "Stock Out"
  | "Transfer"
  | "Adjustment"
  | "Return"
  | "Inspection"
  | "Production"
  | "Material Issue"
  | "Gate Pass";

export interface StockMovement {
  id: string;
  time: string;
  sku: string;
  product: string;
  type: StockMovementType;
  qty: number;
  location: string;
  user: string;
  note?: string;
}

export type TransferStatus = "Pending Approval" | "In Transit" | "Completed" | "Rejected";

export interface TransferRequest {
  id: string;
  productId: string;
  sku: string;
  product: string;
  qty: number;
  source: string;
  destination: string;
  reason: string;
  requestedBy: string;
  date: string;
  status: TransferStatus;
  decidedBy?: string;
}

/* ---------- Phase 06 · Sales, Quotations & Orders ---------- */

export type QuoteStatus =
  | "Draft"
  | "Sent"
  | "Negotiation"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Converted";

export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  tone: GemTone;
  price: number;
  qty: number;
  discountPct: number;
}

export interface SalesQuotation {
  id: string;
  customerId: string;
  customerName: string;
  executive: string;
  lines: QuoteLine[];
  gstPct: number;
  validUntil: string;
  terms: string;
  status: QuoteStatus;
  created: string;
  notes?: string;
  orderId?: string;
  /** Revision number. Version 1 is the original; a revision supersedes it. */
  version?: number;
  /** Id of the first version — every revision of the same quote shares it. */
  baseId?: string;
  previousVersionId?: string;
  /** Set on a version that has been replaced by a newer revision. */
  supersededById?: string;
  timeline: LeadEvent[];
}

export type OrderStatus =
  | "Draft"
  | "Confirmed"
  | "Payment Pending"
  | "Partially Paid"
  | "Processing"
  | "Ready"
  | "Dispatched"
  | "Delivered"
  | "Completed"
  | "Cancelled";

export interface OrderPayment {
  id: string;
  date: string;
  method: string;
  amount: number;
}

export type ReleaseDestination = "Owned Factory" | "Contract Manufacturer";

export interface OrderMilestone {
  label: string;
  due: string;
  done: boolean;
  owner: string;
}

export interface OrderRelease {
  id: string;
  destination: ReleaseDestination;
  releasedBy: string;
  releaseDate: string;
  instructions: string;
  productionOrderId?: string;
  assignmentId?: string;
  expectedReady: string;
}

export interface SalesOrder {
  id: string;
  quotationId?: string;
  customerId: string;
  customerName: string;
  executive: string;
  lines: QuoteLine[];
  gstPct: number;
  status: OrderStatus;
  created: string;
  payments: OrderPayment[];
  invoiceId?: string;
  courier?: string;
  tracking?: string;
  expectedDelivery?: string;
  deliveryAddress?: string;
  notes?: string;
  release?: OrderRelease;
  timeline: LeadEvent[];
}

/* ---------- Phase 07 · Purchase, Suppliers & GRN ---------- */

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  gstin?: string;
  speciality: string[];
  since: string;
  active: boolean;
  notes?: string;
}

export type PRStatus = "Pending Approval" | "Approved" | "Rejected" | "Ordered";
export type PRPriority = "High" | "Medium" | "Low";

export interface PurchaseRequest {
  id: string;
  requester: string;
  items: string;
  qty: number;
  reason: string;
  estimatedCost: number;
  priority: PRPriority;
  status: PRStatus;
  date: string;
  decidedBy?: string;
  poId?: string;
  selectedQuotationId?: string;
}

/* Addendum: supplier quotation collection against a purchase request. */
export interface SupplierQuotation {
  id: string;
  prId: string;
  supplierId: string;
  supplierName: string;
  price: number;
  terms: string;
  deliveryDays: number;
  transport: string;
  taxPct: number;
  creditDays: number;
  validUntil: string;
  remarks?: string;
  attachment?: string;
  received: string;
  selected?: boolean;
  selectionRemarks?: string;
  selectedBy?: string;
  selectedAt?: string;
  /** Revision number when a supplier re-quotes. All versions are preserved. */
  version?: number;
  /** Set on the earlier quote once the supplier sends a revised one. */
  supersededById?: string;
  revisionOfId?: string;
}

/* Addendum: GRN deviation & resolution workflow. */
export type DeviationStatus =
  | "Open"
  | "Supplier Contacted"
  | "Pending Manager Approval"
  | "Approved"
  | "Rejected"
  | "Partially Approved";

export interface GrnDeviation {
  id: string;
  grnId: string;
  poId: string;
  supplierId: string;
  supplierName: string;
  item: string;
  poQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  weightVariance?: string;
  priceDeviation?: string;
  deviationPct: number;
  reason: string;
  supplierResponse?: string;
  resolution?: string;
  managerRemarks?: string;
  status: DeviationStatus;
  approvedQty?: number;
  decidedBy?: string;
  decidedAt?: string;
  created: string;
  timeline: LeadEvent[];
}

export type POStatus = "Draft" | "Sent" | "Partially Received" | "Received" | "Closed" | "Cancelled";

export interface POLine {
  description: string;
  qty: number;
  unitPrice: number;
}

/** One superseded revision of a purchase order, kept for the audit trail. */
export interface PORevision {
  version: number;
  revisedOn: string;
  revisedBy: string;
  reason: string;
  previousTotal: number;
  newTotal: number;
  changes: string[];
  lines: POLine[];
  transport: number;
  deliveryDate: string;
  paymentTerms: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  lines: POLine[];
  transport: number;
  transporter?: string;
  creditDays?: number;
  taxPct: number;
  paymentTerms: string;
  deliveryDate: string;
  status: POStatus;
  created: string;
  prId?: string;
  grnIds: string[];
  payments: OrderPayment[];
  timeline: LeadEvent[];
  notes?: string;
  version?: number;
  approvedBy?: string;
  approvedAt?: string;
  revisions?: PORevision[];
}

export type GrnStatus =
  | "Material Received"
  | "Under Verification"
  | "Quality Inspection"
  | "Approved"
  | "Posted to Stock"
  | "Rejected";

export interface GrnLine {
  description: string;
  expectedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  expectedWeight?: string;
  receivedWeight?: string;
  acceptedWeight?: string;
  rejectedWeight?: string;
  certificate?: string;
  remarks?: string;
}

export interface Grn {
  id: string;
  poId: string;
  supplierName: string;
  receivedDate: string;
  status: GrnStatus;
  inspector?: string;
  lines: GrnLine[];
  timeline: LeadEvent[];
}

/* ---------- Phase 08 · Quality Inspection, Returns, Refunds & Credit Notes ---------- */

export type InspectionStatus = "Pending" | "In Review" | "Approved" | "Rejected" | "Reinspection";
export type InspectionSource = "GRN intake" | "Sales return" | "Certification" | "Repair QC" | "Custom order QC";

export interface InspectionRecord {
  id: string;
  productId?: string;
  sku: string;
  product: string;
  tone: GemTone;
  source: InspectionSource;
  reference?: string;
  inspector?: string;
  date: string;
  status: InspectionStatus;
  weight?: string;
  dimensions?: string;
  color?: string;
  clarity?: string;
  treatment?: string;
  certificate?: string;
  condition?: string;
  remarks?: string;
  photos: ProductImage[];
  timeline: LeadEvent[];
}

export type ReturnStatus =
  | "Requested"
  | "Under Inspection"
  | "Approved"
  | "Stock Reconciled"
  | "Refund Processed"
  | "Credit Note Issued"
  | "Rejected";

export type RefundMethod = "Bank transfer" | "UPI" | "Cash" | "Card reversal";

export interface ReturnRefund {
  method: RefundMethod;
  amount: number;
  reference: string;
  approvedBy: string;
  completedAt: string;
}

export interface CreditNote {
  id: string;
  amount: number;
  issuedAt: string;
  validUntil: string;
}

export type ReturnDisposition = "Usable" | "Damaged" | "Rejected";

/** A returned consignment rarely lands in one condition. Inspection splits it by
    quantity, and the three parts must add up to what the customer sent back. */
export interface ReturnInspectionOutcome {
  usableQty: number;
  damagedQty: number;
  rejectedQty: number;
  inspectedBy: string;
  inspectedOn: string;
  notes?: string;
}

export interface ReturnCase {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  productId?: string;
  sku: string;
  product: string;
  tone: GemTone;
  /** Units the customer is returning. Drives inspection, disposition,
      reprocessing and every stock movement raised from this return. */
  qty: number;
  /** Units cleared for reprocessing after inspection — never above `qty`. */
  reprocessQty?: number;
  amount: number;
  reason: string;
  requested: string;
  status: ReturnStatus;
  inspectionId?: string;
  disposition?: ReturnDisposition;
  dispositionBy?: string;
  /** Quantity-wise inspection result. `disposition` stays as the headline label. */
  outcome?: ReturnInspectionOutcome;
  reprocessOrderId?: string;
  refund?: ReturnRefund;
  creditNote?: CreditNote;
  timeline: LeadEvent[];
}

/* ---------- Phase 09 · Custom Personal care Orders & Job Work Management ---------- */

export type CustomOrderStage =
  | "Artwork Requirement"
  | "Quotation"
  | "Customer Approval"
  | "Advance"
  | "Work in Progress"
  | "Quality Check"
  | "Final Billing"
  | "Delivered"
  | "Cancelled";

export interface CustomOrder {
  id: string;
  customerId: string;
  customerName: string;
  productType: string;
  designReference: string;
  metal: string;
  gemstone: string;
  weightGrams?: number;
  size?: string;
  dimensions?: string;
  estimatedCost: number;
  quotedAmount?: number;
  deliveryDate: string;
  notes?: string;
  attachments: ProductImage[];
  progress: number;
  worker?: string;
  stage: CustomOrderStage;
  inspectionId?: string;
  finalInvoiceId?: string;
  payments: OrderPayment[];
  created: string;
  timeline: LeadEvent[];
}

export type RepairStage =
  | "Request"
  | "Inspection"
  | "Estimate"
  | "Customer Approval"
  | "Repair Work"
  | "Quality Check"
  | "Ready"
  | "Delivered"
  | "Declined";

export interface RepairJob {
  id: string;
  customerId: string;
  customerName: string;
  product: string;
  productId?: string;
  tone: GemTone;
  issue: string;
  photosBefore: ProductImage[];
  photosAfter: ProductImage[];
  estimate?: number;
  worker?: string;
  expectedDelivery: string;
  stage: RepairStage;
  inspectionId?: string;
  payments: OrderPayment[];
  notes: NoteEntry[];
  created: string;
  timeline: LeadEvent[];
}

/* ---------- Phase 10 · Billing, Payments & Accounts ---------- */

export type FinanceDocType =
  | "Proforma Invoice"
  | "GST Invoice"
  | "Payment Receipt"
  | "Credit Note"
  | "Debit Note"
  | "Refund Receipt";

export type PaymentState = "Paid" | "Partial" | "Pending" | "Overdue" | "Refunded";

export type AccountKind = "Cash" | "Bank";

export interface FinanceDocLine {
  name: string;
  sku?: string;
  qty: number;
  price: number;
  discountPct: number;
}

/* Addendum: PI lifecycle is separate from the payment state. */
export type PiStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Revised" | "Superseded";

/** Structured payment terms — replaces free text so the schedule is readable
    and can be checked against the advance actually received. */
export interface PiPaymentTerms {
  advancePct: number;
  balanceOn: "Before dispatch" | "On delivery" | "Against documents" | "Credit period";
  creditDays?: number;
}

/** Structured delivery terms. */
export interface PiDeliveryTerms {
  mode: "Ex-works" | "FOR destination" | "Door delivery" | "Customer pickup";
  leadTimeDays: number;
  destination?: string;
  freight?: "Included" | "Extra at actuals" | "Customer arranged";
}

export interface PiDetails {
  status: PiStatus;
  version: number;
  baseId: string;
  previousVersionId?: string;
  specifications: string[];
  commercialTerms: string[];
  /** Structured terms. `commercialTerms` stays for free-form notes. */
  payment?: PiPaymentTerms;
  delivery?: PiDeliveryTerms;
  validUntil?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  lockedAt?: string;
}

export interface PaymentHold {
  reason: string;
  heldBy: string;
  heldAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface FinanceDoc {
  id: string;
  type: FinanceDocType;
  partyKind: "Customer" | "Supplier";
  partyId?: string;
  partyName: string;
  reference?: string;
  lines: FinanceDocLine[];
  gstPct: number;
  date: string;
  dueDate?: string;
  terms: string;
  state: PaymentState;
  paid: number;
  method?: string;
  /** Bank/UPI transaction reference — used for duplicate-advance protection. */
  txnRef?: string;
  notes?: string;
  voided?: boolean;
  pi?: PiDetails;
  hold?: PaymentHold;
  createdBy: string;
  timeline: LeadEvent[];
}

export type ExpenseCategory = "Rent" | "Salary" | "Electricity" | "Courier" | "Marketing" | "Packaging" | "Other";
export type ExpenseStatus = "Recorded" | "Pending Approval" | "Approved" | "Rejected";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  method: string;
  attachment?: string;
  notes?: string;
  status: ExpenseStatus;
  recordedBy: string;
  approvedBy?: string;
}

export type TransactionKind = "Receipt" | "Payment" | "Expense" | "Refund";

export interface FinanceTransaction {
  id: string;
  date: string;
  kind: TransactionKind;
  account: AccountKind;
  method: string;
  party: string;
  reference?: string;
  amount: number;
  note?: string;
}

/* ---------- Phase 11 · Dispatch, Delivery & Communication ---------- */

export type DispatchStatus =
  | "Ready to Dispatch"
  | "Packing"
  | "Dispatched"
  | "In Transit"
  | "Delivered"
  | "Failed"
  | "Returned";

/** What the driver brings back from the delivery. Captured on the shipment so
    the delivery is proved by a named receiver, not just a status change. */
export interface ProofOfDelivery {
  receivedBy: string;
  receivedOn: string;
  condition: "Accepted in full" | "Accepted with remarks" | "Short received" | "Damaged on arrival";
  shortQty?: number;
  remarks?: string;
  recordedBy: string;
}

export interface PackingItem {
  label: string;
  done: boolean;
}

export interface TransportDetails {
  transporter: string;
  lrNumber: string;
  vehicle?: string;
  lrDate: string;
  documents: string[];
}

export interface DeliveryChallan {
  id: string;
  orderId: string;
  invoiceId?: string;
  issuedOn: string;
  issuedBy: string;
  lines: { description: string; qty: number; remarks?: string }[];
  status: "Draft" | "Issued" | "Acknowledged";
}

export interface Shipment {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  address: string;
  packageType: string;
  weight?: string;
  insured: boolean;
  courier?: string;
  tracking?: string;
  dispatchDate?: string;
  expectedDelivery?: string;
  status: DispatchStatus;
  failReason?: string;
  coordinator?: string;
  transport?: TransportDetails;
  challan?: DeliveryChallan;
  pod?: ProofOfDelivery;
  checklist: PackingItem[];
  created: string;
  timeline: LeadEvent[];
}

export type MessageChannel = "WhatsApp" | "Email" | "SMS";

export interface CommTemplate {
  id: string;
  audience: "Customer" | "Supplier";
  name: string;
  channels: MessageChannel[];
  subject: string;
  body: string;
}

/** Prototype delivery state. Nothing leaves the browser — these states are
    simulated so the communication workflow can be reviewed end to end. */
export type MessageStatus = "Draft" | "Sending" | "Sent" | "Failed";

export type CommPartyKind = "Customer" | "Supplier" | "Lead";

export interface CommMessage {
  id: string;
  channel: MessageChannel;
  templateName: string;
  partyKind: CommPartyKind;
  partyId?: string;
  partyName: string;
  reference?: string;
  /** Email subject line, where the channel carries one. */
  subject?: string;
  /** Full message body, kept so the detail drawer can show more than a preview. */
  body?: string;
  preview: string;
  time: string;
  status: MessageStatus;
  failureReason?: string;
  sentAt?: string;
  createdBy?: string;
}

/* ---------- Phase 13 · Staff, Tasks, Notifications & Audit ---------- */

export type StaffRole =
  | "System Administrator"
  | "Approving Manager"
  | "Sales Representative"
  | "Purchase Manager"
  | "Plant Manager"
  | "Inventory Manager"
  | "Accounts Team"
  | "Dispatch Coordinator"
  | "Billing Executive"
  | "Warehouse Staff";

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  branch: string;
  since: string;
  active: boolean;
}

export type TaskStatus = "Pending" | "Overdue" | "Completed";
export type TaskPriority = "High" | "Medium" | "Low";

export interface TaskItem {
  id: string;
  title: string;
  detail?: string;
  assignee: string;
  due: string;
  dueDay: number;
  priority: TaskPriority;
  status: TaskStatus;
  related?: string;
  created: string;
  completedAt?: string;
}

export type TeamNotificationType =
  | "New lead"
  | "New order"
  | "Payment due"
  | "Approval required"
  | "Low stock"
  | "Inspection required"
  | "Dispatch due"
  | "Follow-up due"
  /* Addendum notification event matrix */
  | "New Task"
  | "New Approval"
  | "Purchase Update"
  | "Quotation Update"
  | "Production Update"
  | "GRN Deviation Alert"
  | "Sales Return Update"
  | "Stock Status Update"
  | "Invoice Status Update"
  | "Next Action"
  | "Assignee Update"
  | "Support Ticket"
  | "Customer Feedback"
  | "Dispatch Update";

export interface NotificationRecordRef {
  kind: string;
  id: string;
}

export interface TeamNotification {
  id: string;
  type: TeamNotificationType;
  priority?: "High" | "Normal";
  title: string;
  message: string;
  time: string;
  unread: boolean;
  reference?: string;
  recordRef?: NotificationRecordRef;
}

export interface AuditRecord {
  id: string;
  user: string;
  action: string;
  module: string;
  time: string;
  record?: string;
  oldValue?: string;
  newValue?: string;
  device: string;
  ip: string;
}

/* ---------- Phase 14 · Users, Roles, Permissions & Settings ---------- */

export type PermissionKey =
  | "View"
  | "Create"
  | "Edit"
  | "Delete"
  | "Approve"
  | "Export"
  | "Print"
  | "View Financial Data"
  | "View Purchase Cost"
  | "View Profit"
  | "Manage Users";

export type RolePermissionMatrix = Record<string, PermissionKey[]>;

export interface LoginEvent {
  id: string;
  user: string;
  time: string;
  device: string;
  ip: string;
  result: "Success" | "Failed";
}

export interface LoginSession {
  id: string;
  user: string;
  device: string;
  ip: string;
  started: string;
  lastActive: string;
  current?: boolean;
}

export interface SettingField {
  key: string;
  label: string;
  type: "text" | "toggle";
  value: string | boolean;
  helper?: string;
}

export interface SettingsSection {
  id: string;
  group: string;
  title: string;
  description: string;
  sensitive?: boolean;
  fields: SettingField[];
}

export type VerificationStatus = "In Progress" | "Awaiting Approval" | "Adjusted" | "Rejected";

export interface VerificationLine {
  productId: string;
  sku: string;
  product: string;
  expected: number;
  counted: number | null;
}

export interface VerificationSession {
  id: string;
  location: string;
  startedBy: string;
  date: string;
  status: VerificationStatus;
  lines: VerificationLine[];
  approvedBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  segment: CustomerSegment;
  gstin?: string;
  since: string;
  address?: string;
  ltv: string;
  outstanding: string;
  totalOrders: number;
  preferred: string[];
  orders: CustomerRecordRow[];
  quotations: CustomerRecordRow[];
  payments: CustomerRecordRow[];
  invoices: CustomerRecordRow[];
  returns: CustomerRecordRow[];
  repairs: CustomerRecordRow[];
  documents: CustomerDocument[];
  notes: NoteEntry[];
  followUps: CustomerFollowUp[];
  communications: CommunicationEntry[];
  leadId?: string;
}

/* ---------- Addendum · Production, FIFO & Contract Manufacturing ---------- */

export type MaterialKind = "Raw Material" | "Packaging";

export interface MaterialMovement {
  text: string;
  qty: number;
  time: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  kind: MaterialKind;
  category: string;
  unit: string;
  available: number;
  reserved: number;
  consumed: number;
  reorderLevel: number;
  rate: number;
  location: string;
  movements: MaterialMovement[];
}

export interface BomLine {
  materialId: string;
  materialName: string;
  qtyPerUnit: number;
  unit: string;
}

export interface Bom {
  id: string;
  product: string;
  sku?: string;
  version: number;
  lines: BomLine[];
  notes?: string;
  createdBy: string;
  created: string;
  /** Every revision of a formulation shares a baseId so the chain is traceable. */
  baseId?: string;
  previousVersionId?: string;
  supersededById?: string;
  /** Why this version exists — required when a formulation is revised. */
  revisionReason?: string;
}

export type ProductionStatus =
  | "Planned"
  | "Material Issued"
  | "In Production"
  | "Quality Check"
  | "Completed"
  | "On Hold";

export interface ProductionConsumption {
  materialId: string;
  materialName: string;
  unit: string;
  planned: number;
  actual: number;
  /** Supplier lot the material was issued from — the incoming half of batch traceability. */
  issuedLot?: string;
}

export interface DailyProductionEntry {
  id: string;
  date: string;
  produced: number;
  rejected: number;
  materialNote: string;
  responsible: string;
  remarks?: string;
}

export interface ProductionOrder {
  id: string;
  product: string;
  sku?: string;
  orderId?: string;
  sourceReturnId?: string;
  releaseId?: string;
  bomId?: string;
  plannedQty: number;
  producedQty: number;
  rejectedQty: number;
  plannedStart: string;
  plannedComplete: string;
  plant: string;
  responsible: string;
  status: ProductionStatus;
  adjustmentPct?: number;
  adjustedBy?: string;
  /** Manufacturing batch code, assigned when material is issued. Carried onto the
      finished-goods lot so a customer complaint can be traced back to the batch. */
  batchNo?: string;
  mfgDate?: string;
  bomVersion?: number;
  created: string;
  consumption: ProductionConsumption[];
  entries: DailyProductionEntry[];
  timeline: LeadEvent[];
  postedToStock?: boolean;
}

/* FIFO: each receipt into finished goods creates a lot; issues consume the
   oldest remaining lot first. dateRank keeps the display date sortable. */
export interface StockLot {
  id: string;
  sku: string;
  product: string;
  qty: number;
  remaining: number;
  rate: number;
  receivedDate: string;
  dateRank: number;
  source: string;
  location: string;
  /** Manufacturing batch this lot came out of, when it was produced in-house. */
  batchNo?: string;
}

export type CmStatus =
  | "Sent"
  | "Accepted"
  | "In Production"
  | "Partially Ready"
  | "Ready to Dispatch"
  | "Closed";

export interface ContractManufacturer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  speciality: string[];
  since: string;
  active: boolean;
  notes?: string;
}

export interface CmAssignment {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  orderId?: string;
  piId?: string;
  product: string;
  qty: number;
  readyQty: number;
  specifications: string[];
  sentDate: string;
  expectedCompletion: string;
  status: CmStatus;
  attachments: string[];
  updates: LeadEvent[];
}

/* ---------- Addendum · Gate pass / sampling ---------- */

export type GatePassKind = "Finished Goods" | "Raw Material" | "Packaging";
export type GatePassStatus = "Draft" | "Pending Approval" | "Approved" | "Returned" | "Rejected";

export interface GatePass {
  id: string;
  kind: GatePassKind;
  item: string;
  sku?: string;
  qty: number;
  unit: string;
  weight?: string;
  issuedTo: string;
  purpose: string;
  requestedBy: string;
  issuedAt: string;
  returnable: boolean;
  expectedReturn?: string;
  noBilling: boolean;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  /** Links the pass back to the record it was raised from (shipment, order, PO). */
  reference?: string;
  status: GatePassStatus;
  timeline: LeadEvent[];
}

/* ---------- Addendum · Post-sales: feedback, reviews & support ---------- */

export type FeedbackChannel = "WhatsApp" | "Email" | "In store" | "Phone";

export interface CustomerFeedback {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  /** Raised from a delivered shipment; still waiting for the customer to answer. */
  awaitingResponse?: boolean;
  shipmentId?: string;
  rating: number;
  channel: FeedbackChannel;
  comment: string;
  date: string;
  published: boolean;
  response?: string;
  respondedBy?: string;
  followUp?: string;
}

export type TicketStatus = "Open" | "In Progress" | "Awaiting Customer" | "Resolved" | "Closed";
export type TicketPriority = "High" | "Medium" | "Low";

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  created: string;
  dueDate: string;
  description: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  followUpDate?: string;
  timeline: LeadEvent[];
}

/* ---------- Addendum · Tally & bank integration ---------- */

export type TallySyncStatus = "Pending" | "Synced" | "Failed" | "Retry";

export interface TallyEntry {
  id: string;
  transactionId: string;
  voucherType: "Sales" | "Purchase" | "Receipt" | "Payment" | "Expense" | "Refund" | "Credit Note" | "Debit Note" | "Journal";
  tallyRef?: string;
  party: string;
  reference?: string;
  amount: number;
  date: string;
  debitLedger: string;
  creditLedger: string;
  status: TallySyncStatus;
  lastSync?: string;
  error?: string;
  attempts: number;
  /** Every queue, post, failure and retry against this voucher, newest first. */
  timeline: LeadEvent[];
}

export type BankMatchState = "Matched" | "Unmatched" | "Partially Matched" | "Adjusted";

export interface BankTransaction {
  id: string;
  date: string;
  valueDate: string;
  narration: string;
  utr: string;
  direction: "Credit" | "Debit";
  amount: number;
  balance: number;
  matchState: BankMatchState;
  matchedTo?: string;
  matchedAmount?: number;
  remarks?: string;
  adjustedBy?: string;
  /** A manual adjustment closes a line the books never had — bank charges,
      interest, a direct debit. It carries its own amount and ledger pair so the
      reconciliation difference actually moves. */
  adjustment?: BankAdjustment;
}

export interface BankAdjustment {
  amount: number;
  reason: "Bank charges" | "Interest credited" | "Direct debit" | "Rounding difference" | "Other";
  debitLedger: string;
  creditLedger: string;
  narration: string;
  adjustedBy: string;
  adjustedOn: string;
  /** Accounting queue entry raised for this adjustment, once posted. */
  tallyEntryId?: string;
}
