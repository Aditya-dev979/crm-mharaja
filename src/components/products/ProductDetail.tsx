import { useState } from "react";
import CertificateDrawer from "@/components/products/CertificateDrawer";
import GemImage from "@/components/products/GemImage";
import ProductGallery from "@/components/products/ProductGallery";
import { AdjustStockModal, CertificateFormModal, StatusModal, TransferModal } from "@/components/products/ProductModals";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { TextAreaField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { certStatusTone, productStatusTone } from "@/data/productData";
import { useProducts, productMargin } from "@/hooks/useProducts";
import { useToast } from "@/hooks/useToast";
import type { Product, ProductStatus, StockMovementType } from "@/types";
import { formatINR } from "@/utils";

const movementTypeForStatus = (status: ProductStatus): StockMovementType => {
  if (status === "Reserved") return "Reservation";
  if (status === "Sold") return "Sale";
  if (status === "Dispatched") return "Dispatch";
  if (status === "Returned") return "Return";
  if (status === "Under Inspection" || status === "In Repair" || status === "Damaged") return "Inspection";
  return "Stock In";
};

export default function ProductDetail({
  product,
  onBack,
  onEdit,
  onOpenProduct,
  onCreateQuotation,
}: {
  product: Product;
  onBack: () => void;
  onEdit: () => void;
  onOpenProduct: (id: string) => void;
  onCreateQuotation?: (productId: string) => void;
}) {
  const { products, updateProduct, duplicateProduct, setCertificate, logActivity, logMovement } = useProducts();
  const toast = useToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPreset, setStatusPreset] = useState<ProductStatus | undefined>(undefined);
  const [stockOpen, setStockOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [certFormMode, setCertFormMode] = useState<"add" | "replace">("add");
  const [certDrawerOpen, setCertDrawerOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(product.notes ?? "");

  const cert = product.certificate;
  const certStatus = cert?.status ?? "Missing";
  const margin = productMargin(product);
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  const openStatus = (preset?: ProductStatus) => {
    setStatusPreset(preset);
    setStatusOpen(true);
  };

  const applyStatus = (status: ProductStatus, note: string) => {
    updateProduct(
      product.id,
      { status, ...(status === "Sold" ? { stock: 0 } : {}) },
      note ? `Status changed to ${status} — ${note}` : `Status changed to ${status}`,
    );
    logMovement({
      sku: product.sku,
      product: product.name,
      type: movementTypeForStatus(status),
      qty: status === "Sold" ? -product.stock : 0,
      location: product.location,
      note: note || `Status changed to ${status}`,
    });
    setStatusOpen(false);
    toast({ tone: status === "Damaged" ? "warning" : "success", title: `Marked ${status}`, message: `${product.sku} updated.` });
  };

  const duplicate = () => {
    const copy = duplicateProduct(product.id);
    if (copy) {
      toast({ tone: "success", title: "Product duplicated", message: `${copy.sku} created — update its details and certificate.` });
      onOpenProduct(copy.id);
    }
  };

  const saveNotes = () => {
    updateProduct(product.id, { notes: notesDraft.trim() || undefined }, "Notes updated");
    toast({ tone: "success", title: "Notes saved" });
  };

  const gemRows: Array<[string, string | undefined]> = [
    ["Base type", product.gemstoneType],
    ["Origin", product.origin],
    ["Shape", product.shape],
    ["Cut", product.cut],
    ["Units per carton", product.carat !== undefined ? String(product.carat) : undefined],
    ["Colour", product.color],
    ["Clarity", product.clarity],
    ["Treatment", product.treatment],
  ];
  const physicalRows: Array<[string, string | undefined]> = [
    ["Weight", product.weightGrams !== undefined ? `${product.weightGrams} g` : undefined],
    ["Dimensions", product.dimensions],
    ["Stock quantity", String(product.stock)],
    ["Location", product.location],
    ["Created", product.created],
  ];

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All products</button>

      <section className="panel product-hero">
        <ProductGallery product={product} />
        <div className="product-summary">
          <div className="detail-title">
            <h1>{product.name}</h1>
          </div>
          <p className="muted-line">
            {product.sku} · {product.category}{product.origin ? ` · ${product.origin}` : ""}
          </p>
          <div className="chip-row product-badges">
            <Badge tone={productStatusTone[product.status]}>{product.status}</Badge>
            <Badge tone={certStatusTone[certStatus]}>Certificate · {certStatus}</Badge>
            {product.stock === 0 && product.status !== "Sold" && <Badge tone="danger">Out of stock</Badge>}
          </div>
          <div className="price-board">
            <div className="price-main">
              <span>Selling price</span>
              <strong>{formatINR(product.sellingPrice)}</strong>
            </div>
            <div className="price-side">
              <div><span>Wholesale</span><strong>{formatINR(product.wholesalePrice)}</strong></div>
              <div><span>Purchase</span><strong>{formatINR(product.purchasePrice)}</strong></div>
              <div><span>Margin</span><strong className={margin >= 25 ? "up-text" : undefined}>{margin}%</strong></div>
            </div>
          </div>
          <div className="detail-actions product-actions">
            <Button variant="secondary" onClick={onEdit}><Icon name="edit" /> Edit</Button>
            <Button variant="secondary" onClick={duplicate}><Icon name="component" /> Duplicate</Button>
            {product.status !== "Reserved" && product.status !== "Sold" && (
              <Button variant="secondary" onClick={() => openStatus("Reserved")}><Icon name="lock" /> Reserve</Button>
            )}
            {product.status !== "Sold" && (
              <Button variant="secondary" onClick={() => openStatus("Sold")}><Icon name="check" /> Mark sold</Button>
            )}
            <Button variant="secondary" onClick={() => setTransferOpen(true)}><Icon name="building" /> Transfer</Button>
            <Button variant="secondary" onClick={() => setStockOpen(true)}><Icon name="sort" /> Adjust stock</Button>
            <Button variant="secondary" onClick={() => openStatus(undefined)}><Icon name="layers" /> Status…</Button>
            <Button
              onClick={() => {
                if (onCreateQuotation) {
                  onCreateQuotation(product.id);
                } else {
                  toast({ tone: "info", title: "Create quotation", message: `The quotation builder will open pre-filled with ${product.sku}.` });
                }
              }}
            >
              <Icon name="plus" /> Create quotation
            </Button>
          </div>
        </div>
      </section>

      {product.status === "Damaged" && (
        <Alert tone="danger" title="This product is marked damaged">
          It is excluded from quotations until repaired. {product.notes}
        </Alert>
      )}

      <div className="two-col">
        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">PRODUCT & PACK SPECIFICATION</p><h2>Pack details</h2></div></div>
            <div className="detail-list">
              {gemRows.filter(([, v]) => v).map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
              {gemRows.every(([, v]) => !v) && <p className="muted">No specification captured for this SKU yet.</p>}
            </div>
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">PHYSICAL & STOCK</p><h2>Specifications</h2></div></div>
            <div className="detail-list">
              {physicalRows.filter(([, v]) => v).map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="section-head">
              <div><p className="kicker">CERTIFICATE</p><h2>Lab certification</h2></div>
              <Badge tone={certStatusTone[certStatus]}>{certStatus}</Badge>
            </div>
            {cert ? (
              <>
                <div className="cert-card">
                  <span className="doc-icon"><Icon name="shield" /></span>
                  <div>
                    <strong>{cert.number}</strong>
                    <small>{cert.authority} · {cert.type} · issued {cert.issueDate}</small>
                  </div>
                </div>
                {cert.status === "Expired" && (
                  <Alert tone="warning" title="Certificate expired">Re-certification is recommended before this batch ships.</Alert>
                )}
                {cert.status === "Rejected" && (
                  <Alert tone="danger" title="Verification rejected">{cert.notes ?? "The certificate data did not match the batch."}</Alert>
                )}
                <div className="detail-actions">
                  <Button variant="secondary" onClick={() => setCertDrawerOpen(true)}><Icon name="eye" /> View details</Button>
                  {cert.status !== "Verified" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCertificate(product.id, { ...cert, status: "Verified", verifiedBy: "Arjun Sharma", verifiedAt: "Just now" }, `Certificate ${cert.number} verified`);
                        toast({ tone: "success", title: "Certificate verified", message: cert.number });
                      }}
                    >
                      <Icon name="check" /> Mark verified
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="cert-missing">
                <p className="muted">No lab report on file. Certified batches clear modern-trade listings faster.</p>
                <Button variant="secondary" onClick={() => { setCertFormMode("add"); setCertFormOpen(true); }}>
                  <Icon name="upload" /> Add certificate
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="page-stack">
          <section className="panel">
            <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Product history</h2></div></div>
            <Timeline
              items={product.activity.slice(0, 8).map((event, i) => ({
                title: event.text,
                meta: `${event.user} · ${event.time}`,
                state: i === 0 ? "current" : "done",
              }))}
            />
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">NOTES</p><h2>Internal notes</h2></div></div>
            <TextAreaField
              label="Product notes"
              placeholder="Sourcing, display guidance, linked enquiries..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
            />
            <div className="note-actions">
              <Button variant="secondary" onClick={saveNotes} disabled={(product.notes ?? "") === notesDraft.trim()}>Save notes</Button>
            </div>
          </section>
          <section className="panel">
            <div className="section-head"><div><p className="kicker">RELATED</p><h2>More {product.category}</h2></div></div>
            {related.length ? (
              <div className="related-list">
                {related.map(rel => (
                  <button key={rel.id} type="button" onClick={() => onOpenProduct(rel.id)}>
                    <GemImage tone={rel.images.find(i => i.id === rel.primaryImageId)?.tone ?? "gold"} size="thumb" />
                    <span>
                      <strong>{rel.name}</strong>
                      <small>{rel.sku} · {formatINR(rel.sellingPrice)}</small>
                    </span>
                    <Badge tone={productStatusTone[rel.status]}>{rel.status}</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">No other products in this category yet.</p>
            )}
          </section>
        </div>
      </div>

      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} product={product} initialStatus={statusPreset} onConfirm={applyStatus} />
      <AdjustStockModal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        product={product}
        onConfirm={(newStock, reason) => {
          updateProduct(product.id, { stock: newStock }, `Stock adjusted to ${newStock} — ${reason}`);
          logMovement({ sku: product.sku, product: product.name, type: "Adjustment", qty: newStock - product.stock, location: product.location, note: reason });
          setStockOpen(false);
          toast({ tone: "success", title: "Stock adjusted", message: `${product.sku} now has ${newStock} in stock.` });
        }}
      />
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        subject={product.sku}
        currentLocation={product.location}
        onConfirm={location => {
          updateProduct(product.id, { location }, `Transferred to ${location}`);
          logMovement({ sku: product.sku, product: product.name, type: "Transfer", qty: 0, location, note: `Direct transfer from ${product.location}` });
          setTransferOpen(false);
          toast({ tone: "success", title: "Transfer recorded", message: `${product.sku} → ${location}` });
        }}
      />
      <CertificateFormModal
        open={certFormOpen}
        onClose={() => setCertFormOpen(false)}
        product={product}
        mode={certFormMode}
        onSave={certificate => {
          setCertificate(
            product.id,
            certificate,
            certFormMode === "add"
              ? `Certificate ${certificate.number} uploaded`
              : `Certificate replaced with ${certificate.number}`,
          );
          setCertFormOpen(false);
          toast({ tone: "success", title: "Certificate uploaded", message: `${certificate.number} attached to ${product.sku}.` });
        }}
      />
      {cert && (
        <CertificateDrawer
          open={certDrawerOpen}
          onClose={() => setCertDrawerOpen(false)}
          product={product}
          onVerify={() => {
            setCertificate(product.id, { ...cert, status: "Verified", verifiedBy: "Arjun Sharma", verifiedAt: "Just now" }, `Certificate ${cert.number} verified`);
            toast({ tone: "success", title: "Certificate verified", message: cert.number });
          }}
          onUnverify={() => {
            setCertificate(product.id, { ...cert, status: "Pending Verification", verifiedBy: undefined, verifiedAt: undefined }, `Certificate ${cert.number} marked unverified`);
            toast({ tone: "info", title: "Marked unverified", message: `${cert.number} moved back to the verification queue.` });
          }}
          onReplace={() => {
            setCertDrawerOpen(false);
            setCertFormMode("replace");
            setCertFormOpen(true);
          }}
          onDelete={() => {
            setCertDrawerOpen(false);
            setCertificate(product.id, null, `Certificate ${cert.number} deleted`);
            logActivity(product.id, "Certificate status is now Missing");
            toast({ tone: "warning", title: "Certificate deleted", message: `${product.sku} no longer has a certificate on file.` });
          }}
        />
      )}
    </div>
  );
}
