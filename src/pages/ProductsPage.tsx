import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/data-display/BarList";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import SegmentBar from "@/components/data-display/SegmentBar";
import Modal from "@/components/feedback/Modal";
import Checkbox from "@/components/forms/Checkbox";
import { SelectField, TextField } from "@/components/forms/Field";
import Switch from "@/components/forms/Switch";
import GemImage from "@/components/products/GemImage";
import ProductDetail from "@/components/products/ProductDetail";
import ProductForm from "@/components/products/ProductForm";
import { TransferModal } from "@/components/products/ProductModals";
import Badge from "@/components/ui/Badge";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Tabs from "@/components/ui/Tabs";
import { chartColors } from "@/data/dashboardData";
import { certStatusTone, productStatuses, productStatusTone } from "@/data/productData";
import { useProducts, productMargin } from "@/hooks/useProducts";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useToast } from "@/hooks/useToast";
import type { CertificateStatus, Product, ProductCategory, ProductStatus } from "@/types";
import { downloadCsv, formatINR } from "@/utils";

type ProductView =
  | { type: "dashboard" }
  | { type: "list" }
  | { type: "categories" }
  | { type: "detail"; id: string }
  | { type: "form"; id?: string };

const priceBuckets: Record<string, (p: Product) => boolean> = {
  "All prices": () => true,
  "Under ₹1L": p => p.sellingPrice < 100000,
  "₹1L – ₹5L": p => p.sellingPrice >= 100000 && p.sellingPrice < 500000,
  "₹5L – ₹10L": p => p.sellingPrice >= 500000 && p.sellingPrice < 1000000,
  "Above ₹10L": p => p.sellingPrice >= 1000000,
};

const certOptions: Array<"All certificates" | CertificateStatus> = [
  "All certificates", "Verified", "Pending Verification", "Uploaded", "Missing", "Expired", "Rejected",
];

const lakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;

export default function ProductsPage({
  intent,
  onIntentHandled,
  focusProductId,
  onFocusHandled,
  onCreateQuotation,
}: {
  intent: "create" | null;
  onIntentHandled: () => void;
  focusProductId: string | null;
  onFocusHandled: () => void;
  onCreateQuotation?: (productId: string) => void;
}) {
  const { products, categories, addProduct, updateProduct, addCategory, updateCategory } = useProducts();
  const toast = useToast();
  const [view, setView] = useState<ProductView>({ type: "dashboard" });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState<ProductStatus[]>([]);
  const [priceFilter, setPriceFilter] = useState("All prices");
  const [stockFilter, setStockFilter] = useState("All stock");
  const [certFilter, setCertFilter] = useState<(typeof certOptions)[number]>("All certificates");
  const [filterOpen, setFilterOpen] = useState(false);
  useEscapeKey(() => setFilterOpen(false), filterOpen);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);

  const [catQuery, setCatQuery] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [catModal, setCatModal] = useState<{ open: boolean; category?: ProductCategory }>({ open: false });

  useEffect(() => {
    if (intent === "create") {
      setView({ type: "form" });
      onIntentHandled();
    }
  }, [intent, onIntentHandled]);

  useEffect(() => {
    if (focusProductId) {
      setView({ type: "detail", id: focusProductId });
      onFocusHandled();
    }
  }, [focusProductId, onFocusHandled]);

  const openDetail = (id: string) => setView({ type: "detail", id });

  const activeFilterCount =
    (categoryFilter !== "All categories" ? 1 : 0) +
    statusFilter.length +
    (priceFilter !== "All prices" ? 1 : 0) +
    (stockFilter !== "All stock" ? 1 : 0) +
    (certFilter !== "All certificates" ? 1 : 0);

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("All categories");
    setStatusFilter([]);
    setPriceFilter("All prices");
    setStockFilter("All stock");
    setCertFilter("All certificates");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (categoryFilter !== "All categories" && p.category !== categoryFilter) return false;
      if (statusFilter.length && !statusFilter.includes(p.status)) return false;
      if (!priceBuckets[priceFilter](p)) return false;
      if (stockFilter === "In stock" && p.stock === 0) return false;
      if (stockFilter === "Out of stock" && p.stock > 0) return false;
      const certStatus = p.certificate?.status ?? "Missing";
      if (certFilter !== "All certificates" && certStatus !== certFilter) return false;
      if (!q) return true;
      return `${p.sku} ${p.name} ${p.category} ${p.gemstoneType ?? ""} ${p.certificate?.number ?? ""} ${p.location}`
        .toLowerCase()
        .includes(q);
    });
  }, [products, query, categoryFilter, statusFilter, priceFilter, stockFilter, certFilter]);

  const columns: Column<Product>[] = [
    {
      key: "sku", label: "Product", sortable: true, hideable: false, sortValue: p => p.sku,
      render: p => (
        <button type="button" className="table-product" onClick={() => openDetail(p.id)}>
          <GemImage tone={p.images.find(i => i.id === p.primaryImageId)?.tone ?? "gold"} size="thumb" className="table-thumb" />
          <span><b className="link">{p.sku}</b><small>{p.name}</small></span>
        </button>
      ),
    },
    { key: "category", label: "Category", sortable: true, sortValue: p => p.category },
    {
      key: "carat", label: "Units / carton", sortable: true, sortValue: p => p.carat ?? 0,
      render: p => (p.carat !== undefined ? String(p.carat) : "—"),
    },
    {
      key: "sellingPrice", label: "Price", sortable: true, sortValue: p => p.sellingPrice,
      render: p => <strong>{formatINR(p.sellingPrice)}</strong>,
    },
    {
      key: "margin", label: "Margin", defaultHidden: true,
      render: p => `${productMargin(p)}%`,
    },
    { key: "stock", label: "Stock", sortable: true, align: "right", sortValue: p => p.stock, render: p => String(p.stock) },
    {
      key: "status", label: "Status", sortable: true, sortValue: p => p.status,
      render: p => <Badge tone={productStatusTone[p.status]}>{p.status}</Badge>,
    },
    {
      key: "certificate", label: "Certificate",
      render: p => {
        const s = p.certificate?.status ?? "Missing";
        return <Badge tone={certStatusTone[s]}>{s}</Badge>;
      },
    },
    { key: "location", label: "Location", defaultHidden: true },
    { key: "created", label: "Added", defaultHidden: true },
  ];

  /* ---------- detail & form ---------- */

  if (view.type === "detail") {
    const product = products.find(p => p.id === view.id);
    if (!product) {
      setView({ type: "list" });
      return null;
    }
    return (
      <ProductDetail
        product={product}
        onBack={() => setView({ type: "list" })}
        onEdit={() => setView({ type: "form", id: product.id })}
        onOpenProduct={openDetail}
        onCreateQuotation={onCreateQuotation}
      />
    );
  }

  if (view.type === "form") {
    const product = view.id ? products.find(p => p.id === view.id) : undefined;
    return (
      <div className="page-stack">
        <button
          type="button"
          className="back-link"
          onClick={() => setView(product ? { type: "detail", id: product.id } : { type: "list" })}
        >
          ← Back to {product ? product.name : "catalogue"}
        </button>
        <ProductForm
          product={product}
          onCancel={() => setView(product ? { type: "detail", id: product.id } : { type: "list" })}
          onSave={(draft, tone) => {
            if (product) {
              const priceChanged = draft.sellingPrice !== product.sellingPrice || draft.purchasePrice !== product.purchasePrice;
              updateProduct(product.id, draft, priceChanged ? "Price updated" : "Product details updated");
              toast({ tone: "success", title: "Product updated", message: `${draft.sku} was saved.` });
              setView({ type: "detail", id: product.id });
            } else {
              const created = addProduct(draft, tone);
              toast({ tone: "success", title: "Product created", message: `${created.sku} added to the catalogue.` });
              setView({ type: "detail", id: created.id });
            }
          }}
        />
      </div>
    );
  }

  /* ---------- dashboard metrics ---------- */

  const available = products.filter(p => p.status === "Available");
  const reserved = products.filter(p => p.status === "Reserved");
  const sold = products.filter(p => p.status === "Sold");
  const certified = products.filter(p => p.certificate?.status === "Verified");
  const pendingCert = products.filter(p => p.certificate && (p.certificate.status === "Uploaded" || p.certificate.status === "Pending Verification"));
  const sellable = products.filter(p => p.status !== "Sold");
  const catalogueValue = sellable.reduce((sum, p) => sum + p.sellingPrice * Math.max(p.stock, 1), 0);
  const avgValue = products.length ? Math.round(products.reduce((s, p) => s + p.sellingPrice, 0) / products.length) : 0;

  const valueByCategory = categories
    .map(c => ({
      label: c.name,
      value: products.filter(p => p.category === c.name && p.status !== "Sold").reduce((s, p) => s + p.sellingPrice, 0),
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(x => ({ ...x, display: lakh(x.value) }));

  const statusSegments = [
    { label: "Available", value: available.length, color: chartColors.emerald },
    { label: "Reserved", value: reserved.length, color: chartColors.gold },
    { label: "Sold / Dispatched", value: sold.length + products.filter(p => p.status === "Dispatched").length, color: chartColors.royal },
    { label: "Inspection / Repair", value: products.filter(p => p.status === "Under Inspection" || p.status === "In Repair").length, color: chartColors.amber },
    { label: "Returned / Damaged", value: products.filter(p => p.status === "Returned" || p.status === "Damaged").length, color: chartColors.red },
  ].filter(s => s.value > 0);

  const needsAttention = products.filter(p => {
    const cs = p.certificate?.status ?? "Missing";
    return p.status === "Damaged" || cs === "Missing" || cs === "Expired" || cs === "Rejected";
  });

  /* ---------- categories view data ---------- */

  const filteredCategories = categories.filter(c => {
    if (catFilter === "Active" && !c.active) return false;
    if (catFilter === "Inactive" && c.active) return false;
    if (catFilter === "Personal Care" && c.kind !== "Personal Care") return false;
    if (catFilter === "Home Care" && c.kind !== "Home Care") return false;
    const q = catQuery.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q);
  });

  const countFor = (name: string) => products.filter(p => p.category === name).length;

  const bulkReserve = () => {
    let changed = 0;
    selected.forEach(id => {
      const p = products.find(x => x.id === id);
      if (p && p.status === "Available") {
        updateProduct(id, { status: "Reserved" }, "Reserved via bulk action");
        changed++;
      }
    });
    toast({
      tone: changed ? "success" : "info",
      title: changed ? `${changed} products reserved` : "Nothing to reserve",
      message: changed ? "Only available products were changed." : "Selected products are not in an Available state.",
    });
    setSelected([]);
  };

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">PRODUCTS · SKUs & PACK CATALOGUE</p>
          <h1>The Maharaja Soap catalogue.</h1>
          <p>Every SKU and batch with full provenance — specifications, pricing, certification and history.</p>
        </div>
        <Button onClick={() => setView({ type: "form" })}><Icon name="plus" /> New product</Button>
      </div>
      <Tabs
        tabs={["Overview", "Catalogue", "Categories"]}
        active={view.type === "dashboard" ? "Overview" : view.type === "list" ? "Catalogue" : "Categories"}
        onChange={t => setView({ type: t === "Overview" ? "dashboard" : t === "Catalogue" ? "list" : "categories" })}
        label="Product views"
      />

      {view.type === "dashboard" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total products" value={String(products.length)} note={`${categories.filter(c => c.active).length} active categories`} icon="gem" iconTone="royal" onClick={() => setView({ type: "list" })} />
            <KpiCard label="Available" value={String(available.length)} note={`${reserved.length} reserved`} icon="check" iconTone="emerald" onClick={() => { clearFilters(); setStatusFilter(["Available"]); setView({ type: "list" }); }} />
            <KpiCard label="Sold" value={String(sold.length)} note="Lifetime, this catalogue" icon="grid" iconTone="royal" onClick={() => { clearFilters(); setStatusFilter(["Sold"]); setView({ type: "list" }); }} />
            <KpiCard label="Certified" value={String(certified.length)} note={`${pendingCert.length} pending verification`} noteTone={pendingCert.length ? "warning" : "muted"} icon="shield" iconTone="gold" onClick={() => { clearFilters(); setCertFilter("Verified"); setView({ type: "list" }); }} />
          </div>
          <div className="kpi-grid">
            <KpiCard label="Catalogue value" value={lakh(catalogueValue)} note="At selling price · unsold stock" icon="layers" iconTone="emerald" />
            <KpiCard label="Average product value" value={formatINR(avgValue)} note="Across all products" icon="sort" iconTone="royal" />
            <KpiCard label="Missing certificates" value={String(products.filter(p => !p.certificate).length)} note="Certification lifts sale price" noteTone="warning" icon="warning" iconTone="gold" onClick={() => { clearFilters(); setCertFilter("Missing"); setView({ type: "list" }); }} />
            <KpiCard label="Needs attention" value={String(needsAttention.length)} note="Damaged or certificate issues" noteTone="warning" icon="error" iconTone="gold" />
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head">
                <div><p className="kicker">CATALOGUE VALUE</p><h2>By category</h2></div>
                <button type="button" className="link-btn" onClick={() => setView({ type: "categories" })}>Manage categories</button>
              </div>
              <BarList items={valueByCategory} />
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">STOCK STATUS</p><h2>Where products stand</h2></div></div>
              <SegmentBar segments={statusSegments} />
            </section>
          </div>
          <div className="two-col">
            <section className="panel">
              <div className="section-head"><div><p className="kicker">NEEDS ATTENTION</p><h2>Certificates & condition</h2></div></div>
              {needsAttention.length === 0 ? (
                <EmptyState icon="check" title="All clear" description="Every product is certified and in good condition." mini />
              ) : (
                <div className="feed">
                  {needsAttention.slice(0, 5).map(p => {
                    const cs = p.certificate?.status ?? "Missing";
                    return (
                      <button key={p.id} type="button" onClick={() => openDetail(p.id)}>
                        <span className="feed-icon amber"><Icon name={p.status === "Damaged" ? "error" : "shield"} size={15} /></span>
                        <span className="feed-body">
                          <strong>{p.name}</strong>
                          <small>{p.sku} · {p.status === "Damaged" ? "Damaged" : `Certificate ${cs.toLowerCase()}`}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-head"><div><p className="kicker">RECENTLY ADDED</p><h2>Newest in catalogue</h2></div></div>
              <div className="related-list">
                {products.slice(0, 4).map(p => (
                  <button key={p.id} type="button" onClick={() => openDetail(p.id)}>
                    <GemImage tone={p.images.find(i => i.id === p.primaryImageId)?.tone ?? "gold"} size="thumb" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.sku} · {formatINR(p.sellingPrice)}</small>
                    </span>
                    <Badge tone={productStatusTone[p.status]}>{p.status}</Badge>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {view.type === "list" && (
        <section className="panel table-panel">
          <div className="section-head">
            <div><p className="kicker">CATALOGUE</p><h2>{filtered.length} of {products.length} products</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search SKU, name, certificate" aria-label="Search products" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <div className="filter-anchor">
                <Button variant="secondary" onClick={() => setFilterOpen(o => !o)} aria-expanded={filterOpen}>
                  <Icon name="filter" /> Filters{activeFilterCount > 0 && ` · ${activeFilterCount}`}
                </Button>
                {filterOpen && (
                  <>
                    <div className="popover-backdrop" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="filter-pop wide-filter" role="group" aria-label="Product filters">
                      <p>FILTERS</p>
                      <SelectField label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option>All categories</option>
                        {categories.map(c => <option key={c.id}>{c.name}</option>)}
                      </SelectField>
                      <SelectField label="Price" value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
                        {Object.keys(priceBuckets).map(b => <option key={b}>{b}</option>)}
                      </SelectField>
                      <SelectField label="Stock" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                        <option>All stock</option><option>In stock</option><option>Out of stock</option>
                      </SelectField>
                      <SelectField label="Certificate" value={certFilter} onChange={e => setCertFilter(e.target.value as typeof certFilter)}>
                        {certOptions.map(c => <option key={c}>{c}</option>)}
                      </SelectField>
                      <p className="filter-sub">STATUS</p>
                      <div className="filter-checks">
                        {productStatuses.map(status => (
                          <Checkbox
                            key={status}
                            label={status}
                            checked={statusFilter.includes(status)}
                            onChange={on => setStatusFilter(f => (on ? [...f, status] : f.filter(s => s !== status)))}
                          />
                        ))}
                      </div>
                      <button type="button" className="link-btn" onClick={clearFilters}>Clear all filters</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="bulk-bar">
              <strong>{selected.length} selected</strong>
              <button type="button" onClick={() => {
                const rows = products.filter(p => selected.includes(p.id));
                const n = downloadCsv("products.csv", ["SKU", "Product", "Category", "Units per carton", "Selling price", "Stock", "Location", "Status"],
                  rows.map(p => [p.sku, p.name, p.category, p.carat ?? "", p.sellingPrice, p.stock, p.location, p.status]));
                toast({ tone: "success", title: "Products exported", message: `products.csv downloaded with ${n} row${n === 1 ? "" : "s"}.` });
              }}>Export</button>
              <button type="button" onClick={() => setBulkTransferOpen(true)}>Transfer</button>
              <button type="button" onClick={bulkReserve}>Reserve</button>
              <button type="button" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={p => p.id}
            rowLabel={p => `product ${p.sku}`}
            pageSize={8}
            selected={selected}
            onSelectedChange={setSelected}
            emptyState={
              <EmptyState
                icon="search"
                title="No matching products"
                description="Try another keyword or relax the filters."
                mini
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              />
            }
          />
        </section>
      )}

      {view.type === "categories" && (
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">CATEGORY MANAGEMENT</p><h2>{filteredCategories.length} categories</h2></div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input placeholder="Search categories" aria-label="Search categories" value={catQuery} onChange={e => setCatQuery(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => setCatModal({ open: true })}><Icon name="plus" /> New category</Button>
            </div>
          </div>
          <Tabs tabs={["All", "Personal Care", "Home Care", "Active", "Inactive"]} active={catFilter} onChange={setCatFilter} label="Category filters" />
          {filteredCategories.length === 0 ? (
            <EmptyState icon="search" title="No matching categories" description="Try another keyword or filter." mini />
          ) : (
            <div className="category-list">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="category-row">
                  <span className="doc-icon"><Icon name={cat.kind === "Personal Care" ? "gem" : "component"} /></span>
                  <div>
                    <strong>{cat.name}</strong>
                    <small>{cat.kind} · {countFor(cat.name)} products</small>
                  </div>
                  <Badge tone={cat.active ? "emerald" : "neutral"}>{cat.active ? "Active" : "Inactive"}</Badge>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      clearFilters();
                      setCategoryFilter(cat.name);
                      setView({ type: "list" });
                    }}
                  >
                    View products
                  </button>
                  <button type="button" className="link-btn" onClick={() => setCatModal({ open: true, category: cat })}>Edit</button>
                  <Switch
                    on={cat.active}
                    label={`${cat.name} active`}
                    onChange={on => {
                      updateCategory(cat.id, { active: on });
                      toast({
                        tone: on ? "success" : "info",
                        title: `${cat.name} ${on ? "activated" : "deactivated"}`,
                        message: on ? "It is selectable on new products again." : `Existing ${countFor(cat.name)} products keep the category; it is hidden on new products.`,
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <TransferModal
        open={bulkTransferOpen}
        onClose={() => setBulkTransferOpen(false)}
        subject={`${selected.length} selected products`}
        onConfirm={location => {
          selected.forEach(id => updateProduct(id, { location }, `Transferred to ${location} (bulk)`));
          setBulkTransferOpen(false);
          toast({ tone: "success", title: "Transfer recorded", message: `${selected.length} products → ${location}` });
          setSelected([]);
        }}
      />

      <CategoryModal
        open={catModal.open}
        category={catModal.category}
        onClose={() => setCatModal({ open: false })}
        onSave={(name, kind) => {
          if (catModal.category) {
            updateCategory(catModal.category.id, { name, kind });
            toast({ tone: "success", title: "Category updated", message: name });
          } else {
            addCategory(name, kind);
            toast({ tone: "success", title: "Category created", message: name });
          }
          setCatModal({ open: false });
        }}
      />
    </div>
  );
}

function CategoryModal({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category?: ProductCategory;
  onClose: () => void;
  onSave: (name: string, kind: ProductCategory["kind"]) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProductCategory["kind"]>("Personal Care");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setKind(category?.kind ?? "Personal Care");
      setError(undefined);
    }
  }, [open, category]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="cat-modal-title">
      <div className="modal-icon royal-icon"><Icon name="layers" /></div>
      <h2 id="cat-modal-title">{category ? `Edit ${category.name}` : "New category"}</h2>
      <p>Categories organise the catalogue and drive filters, reports and the visual catalogue.</p>
      <TextField
        label="Category name" required value={name}
        onChange={e => { setName(e.target.value); setError(undefined); }}
        error={error}
      />
      <SelectField label="Type" value={kind} onChange={e => setKind(e.target.value as ProductCategory["kind"])}>
        <option>Personal Care</option>
        <option>Home Care</option>
      </SelectField>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!name.trim()) {
              setError("Category name is required");
              return;
            }
            onSave(name.trim(), kind);
          }}
        >
          {category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </Modal>
  );
}
