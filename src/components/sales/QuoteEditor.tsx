import { useMemo, useState } from "react";
import GemImage from "@/components/products/GemImage";
import { toneForCategory } from "@/components/products/ProductForm";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { executives } from "@/data/crmData";
import { defaultTerms, lineTotal, saleTotals } from "@/data/salesData";
import { useCrm } from "@/hooks/useCrm";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/useToast";
import type { QuoteLine, SalesQuotation } from "@/types";
import { formatINR } from "@/utils";

export interface QuoteDraft {
  customerId: string;
  customerName: string;
  executive: string;
  lines: QuoteLine[];
  gstPct: number;
  validUntil: string;
  terms: string;
  notes?: string;
}

export default function QuoteEditor({
  quote,
  presetCustomerId,
  presetProductId,
  onCancel,
  onSave,
}: {
  quote?: SalesQuotation;
  presetCustomerId?: string;
  presetProductId?: string;
  onCancel: () => void;
  onSave: (draft: QuoteDraft) => void;
}) {
  const { customers } = useCrm();
  const { products } = useProducts();
  const toast = useToast();

  const productToLine = (productId: string): QuoteLine | null => {
    const p = products.find(x => x.id === productId);
    if (!p) return null;
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      tone: p.images.find(i => i.id === p.primaryImageId)?.tone ?? toneForCategory(p.category),
      price: p.sellingPrice,
      qty: 1,
      discountPct: 0,
    };
  };

  const [customerId, setCustomerId] = useState(quote?.customerId ?? presetCustomerId ?? customers[0]?.id ?? "");
  const [executive, setExecutive] = useState(quote?.executive ?? executives[0]);
  const [validUntil, setValidUntil] = useState("2026-03-22");
  const [terms, setTerms] = useState(quote?.terms ?? defaultTerms);
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [lines, setLines] = useState<QuoteLine[]>(() => {
    if (quote) return quote.lines;
    if (presetProductId) {
      const line = productToLine(presetProductId);
      return line ? [line] : [];
    }
    return [];
  });

  const addable = useMemo(
    () => products.filter(p => p.status === "Available" && p.stock > 0 && !lines.some(l => l.productId === p.id)),
    [products, lines],
  );
  const [pickerId, setPickerId] = useState("");

  const totals = saleTotals(lines, quote?.gstPct ?? 18);

  const patchLine = (productId: string, patch: Partial<QuoteLine>) =>
    setLines(list => list.map(l => (l.productId === productId ? { ...l, ...patch } : l)));

  const save = () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      toast({ tone: "error", title: "Choose a customer" });
      return;
    }
    if (lines.length === 0) {
      toast({ tone: "error", title: "Add at least one product", message: "A quotation needs products to quote." });
      return;
    }
    if (lines.some(l => l.qty < 1 || l.discountPct < 0 || l.discountPct > 50)) {
      toast({ tone: "error", title: "Check line values", message: "Quantities must be at least 1 and discounts between 0 and 50%." });
      return;
    }
    onSave({
      customerId,
      customerName: customer.name,
      executive,
      lines,
      gstPct: quote?.gstPct ?? 18,
      validUntil: new Date(validUntil + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      terms: terms.trim() || defaultTerms,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">{quote ? "REVISE QUOTATION" : "NEW QUOTATION"}</p>
          <h2>{quote ? `${quote.id} · ${quote.customerName}` : "Build a customer-ready quotation"}</h2>
        </div>
      </div>

      <div className="form-grid">
        <SelectField label="Customer" required value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={!!quote}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id.replace("cust-", "CUST-")}</option>)}
        </SelectField>
        <SelectField label="Sales executive" value={executive} onChange={e => setExecutive(e.target.value)}>
          {executives.map(x => <option key={x}>{x}</option>)}
        </SelectField>
        <TextField label="Valid until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
      </div>

      <p className="mini-title">LINE ITEMS · PRICES INCLUDE 18% GST</p>
      {lines.length === 0 ? (
        <p className="muted">No products yet — add the first line below.</p>
      ) : (
        <div className="quote-lines">
          {lines.map(line => (
            <div key={line.productId} className="quote-line">
              <GemImage tone={line.tone} size="thumb" />
              <div className="quote-line-name">
                <strong>{line.name}</strong>
                <small>{line.sku} · list {formatINR(line.price)}</small>
              </div>
              <label className="quote-line-field">
                <span>Qty</span>
                <input
                  inputMode="numeric"
                  value={line.qty}
                  aria-label={`Quantity for ${line.sku}`}
                  onChange={e => patchLine(line.productId, { qty: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                />
              </label>
              <label className="quote-line-field">
                <span>Disc %</span>
                <input
                  inputMode="numeric"
                  value={line.discountPct}
                  aria-label={`Discount percent for ${line.sku}`}
                  onChange={e => patchLine(line.productId, { discountPct: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                />
              </label>
              <strong className="quote-line-total">{formatINR(lineTotal(line))}</strong>
              <IconButton label={`Remove ${line.sku}`} onClick={() => setLines(list => list.filter(l => l.productId !== line.productId))}>
                <Icon name="close" size={14} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      <div className="quote-add-row">
        <SelectField label="Add product" value={pickerId} onChange={e => setPickerId(e.target.value)}>
          <option value="">Choose from available stock…</option>
          {addable.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name} · {formatINR(p.sellingPrice)}</option>)}
        </SelectField>
        <Button
          variant="secondary"
          disabled={!pickerId}
          onClick={() => {
            const line = productToLine(pickerId);
            if (line) setLines(list => [...list, line]);
            setPickerId("");
          }}
        >
          <Icon name="plus" /> Add line
        </Button>
      </div>

      <div className="quote-totals">
        <div><span>Gross</span><strong>{formatINR(totals.gross)}</strong></div>
        <div><span>Discount</span><strong className={totals.discount ? "warning-text" : undefined}>− {formatINR(totals.discount)}</strong></div>
        <div><span>GST (18% included)</span><strong>{formatINR(totals.gstIncluded)}</strong></div>
        <div className="quote-grand"><span>Total</span><strong>{formatINR(totals.total)}</strong></div>
      </div>

      <TextAreaField label="Terms" value={terms} onChange={e => setTerms(e.target.value)} />
      <TextAreaField label="Internal notes" placeholder="Context for the team (not shown to the customer)" value={notes} onChange={e => setNotes(e.target.value)} />

      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>{quote ? "Save revision" : "Create quotation"}</Button>
      </div>
    </section>
  );
}
