import Drawer from "@/components/feedback/Drawer";
import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import { lineTotal, paidAmount, saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useToast } from "@/hooks/useToast";
import type { SalesOrder } from "@/types";
import { formatINR } from "@/utils";

export default function InvoiceDrawer({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: SalesOrder;
}) {
  const toast = useToast();
  const { customers } = useCrm();
  const customer = customers.find(c => c.id === order.customerId);
  const totals = saleTotals(order.lines, order.gstPct);
  const paid = paidAmount(order);
  const balance = totals.total - paid;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="TAX INVOICE"
      title={order.invoiceId ?? "Invoice"}
      className="detail-drawer invoice-drawer"
      footer={
        <>
          <button type="button" className="link-btn" onClick={() => toast({ tone: "info", title: "Preparing PDF", message: `${order.invoiceId}.pdf (demo)` })}>
            Download PDF
          </button>
          <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Sent to printer", message: "Invoice queued for printing (demo)." })}>
            Print
          </Button>
        </>
      }
    >
      <div className="drawer-content invoice-doc">
        <div className="invoice-head">
          <Brand />
          <div className="invoice-meta">
            <strong>{order.invoiceId}</strong>
            <small>Order {order.id} · {order.created}</small>
            <small>GSTIN 08AAKCM4021R1ZP · Vapi Plant</small>
          </div>
        </div>
        <div className="invoice-billto">
          <p className="mini-title">BILLED TO</p>
          <strong>{order.customerName}</strong>
          <small>{order.deliveryAddress ?? customer?.city ?? ""}</small>
          {customer?.gstin && <small>GSTIN {customer.gstin}</small>}
        </div>
        <div className="table-wrap op-table">
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {order.lines.map(line => (
                <tr key={line.productId}>
                  <td>
                    <b>{line.name}</b>
                    <div className="note-cell">{line.sku}</div>
                  </td>
                  <td>{line.qty}</td>
                  <td>{formatINR(line.price)}</td>
                  <td>{line.discountPct ? `${line.discountPct}%` : "—"}</td>
                  <td><strong>{formatINR(lineTotal(line))}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="quote-totals invoice-totals">
          <div><span>GST ({order.gstPct}% included)</span><strong>{formatINR(totals.gstIncluded)}</strong></div>
          <div className="quote-grand"><span>Invoice total</span><strong>{formatINR(totals.total)}</strong></div>
          <div><span>Paid</span><strong className="up-text">{formatINR(paid)}</strong></div>
          <div><span>Balance due</span><strong className={balance > 0 ? "warning-text" : "up-text"}>{formatINR(balance)}</strong></div>
        </div>
        <div className="invoice-status-row">
          <Badge tone={balance <= 0 ? "emerald" : paid > 0 ? "amber" : "danger"}>
            {balance <= 0 ? "Paid in full" : paid > 0 ? "Partially paid" : "Payment pending"}
          </Badge>
        </div>
        <p className="muted invoice-terms">Payment terms: balance due before dispatch. E&OE. The full document lives in Accounts → Documents, with payments and the ledger.</p>
      </div>
    </Drawer>
  );
}
