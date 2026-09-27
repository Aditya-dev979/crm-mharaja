import { useState } from "react";
import { FormActions, SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { packFormats, processTypes, productLocations, productStatuses } from "@/data/productData";
import { useProducts, productMargin } from "@/hooks/useProducts";
import { useToast } from "@/hooks/useToast";
import type { GemTone, Product, ProductStatus } from "@/types";

/* Maps a product family to one of the palette's wrapper tones. The tone keys are
   internal colour names only — they never surface in the interface. */
export const toneForCategory = (category: string): GemTone => {
  if (category === "Herbal & Ayurvedic") return "emerald";
  if (category === "Bath Soap") return "sapphire";
  if (category === "Beauty Soap") return "ruby";
  if (category === "Glycerine Soap") return "bicolour";
  if (category === "Premium & Luxury") return "gold";
  if (category === "Baby Care") return "pearl";
  if (category === "Liquid Soap & Handwash") return "yellow-sapphire";
  if (category === "Laundry & Home Care") return "spinel";
  if (category === "Dishwash") return "spinel";
  if (category === "Gift & Festive Packs") return "diamond";
  if (category === "Private Label") return "diamond";
  return "gold";
};

interface ProductDraft {
  name: string;
  sku: string;
  category: string;
  status: ProductStatus;
  gemstoneType: string;
  origin: string;
  shape: string;
  cut: string;
  carat: string;
  weightGrams: string;
  dimensions: string;
  color: string;
  clarity: string;
  treatment: string;
  purchasePrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  stock: string;
  location: string;
  notes: string;
}

function toDraft(product?: Product, defaultCategory?: string): ProductDraft {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? defaultCategory ?? "Bath Soap",
    status: product?.status ?? "Available",
    gemstoneType: product?.gemstoneType ?? "",
    origin: product?.origin ?? "",
    shape: product?.shape ?? packFormats[0],
    cut: product?.cut ?? "",
    carat: product?.carat !== undefined ? String(product.carat) : "",
    weightGrams: product?.weightGrams !== undefined ? String(product.weightGrams) : "",
    dimensions: product?.dimensions ?? "",
    color: product?.color ?? "",
    clarity: product?.clarity ?? "",
    treatment: product?.treatment ?? processTypes[0],
    purchasePrice: product ? String(product.purchasePrice) : "",
    sellingPrice: product ? String(product.sellingPrice) : "",
    wholesalePrice: product ? String(product.wholesalePrice) : "",
    stock: product ? String(product.stock) : "1",
    location: product?.location ?? productLocations[0],
    notes: product?.notes ?? "",
  };
}

const num = (value: string) => Number(value.replace(/[,\s]/g, ""));

export default function ProductForm({
  product,
  onCancel,
  onSave,
}: {
  product?: Product;
  onCancel: () => void;
  onSave: (draft: Omit<Product, "id" | "images" | "primaryImageId" | "activity" | "created" | "certificate"> & { certificate: Product["certificate"] }, tone: GemTone) => void;
}) {
  const { products, categories } = useProducts();
  const toast = useToast();
  const [saved, setSaved] = useState<ProductDraft>(() => toDraft(product));
  const [draft, setDraft] = useState<ProductDraft>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductDraft, string>>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof ProductDraft, value: string) => {
    setDraft(d => ({ ...d, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const marginPreview = () => {
    const purchase = num(draft.purchasePrice);
    const selling = num(draft.sellingPrice);
    if (!purchase || !selling || Number.isNaN(purchase) || Number.isNaN(selling)) return "—";
    return `${productMargin({ purchasePrice: purchase, sellingPrice: selling })}%`;
  };

  const isGemCategory = categories.find(c => c.name === draft.category)?.kind !== "Home Care";

  const save = () => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Product name is required";
    const sku = draft.sku.trim().toUpperCase();
    if (!/^[A-Z]{3}-[A-Z]{3}-\d{3,5}(-C)?$/.test(sku)) next.sku = "Use the format MS-BATH-0524";
    else if (products.some(p => p.sku === sku && p.id !== product?.id)) next.sku = "This SKU already exists";
    const purchase = num(draft.purchasePrice);
    const selling = num(draft.sellingPrice);
    const wholesale = num(draft.wholesalePrice);
    if (!purchase || Number.isNaN(purchase) || purchase <= 0) next.purchasePrice = "Enter a valid purchase price";
    if (!selling || Number.isNaN(selling) || selling <= 0) next.sellingPrice = "Enter a valid selling price";
    else if (purchase > 0 && selling < purchase) next.sellingPrice = "Selling price is below purchase price";
    if (draft.wholesalePrice && (Number.isNaN(wholesale) || wholesale <= 0)) next.wholesalePrice = "Enter a valid wholesale price";
    if (draft.carat && Number.isNaN(Number(draft.carat))) next.carat = "Units per carton must be a number";
    if (draft.weightGrams && Number.isNaN(Number(draft.weightGrams))) next.weightGrams = "Weight must be a number";
    if (isGemCategory && !draft.gemstoneType.trim()) next.gemstoneType = "Base type is required";
    const stock = parseInt(draft.stock, 10);
    if (Number.isNaN(stock) || stock < 0) next.stock = "Enter a valid stock quantity";
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast({ tone: "error", title: "Please review the form", message: "Some fields need attention before saving." });
      return;
    }
    setSaved(draft);
    onSave(
      {
        name: draft.name.trim(),
        sku,
        category: draft.category,
        status: draft.status,
        gemstoneType: draft.gemstoneType.trim() || undefined,
        origin: draft.origin.trim() || undefined,
        shape: draft.shape || undefined,
        cut: draft.cut.trim() || undefined,
        carat: draft.carat ? Number(draft.carat) : undefined,
        weightGrams: draft.weightGrams ? Number(draft.weightGrams) : undefined,
        dimensions: draft.dimensions.trim() || undefined,
        color: draft.color.trim() || undefined,
        clarity: draft.clarity.trim() || undefined,
        treatment: draft.treatment || undefined,
        purchasePrice: purchase,
        sellingPrice: selling,
        wholesalePrice: draft.wholesalePrice ? wholesale : Math.round((purchase + selling) / 2),
        stock,
        location: draft.location,
        notes: draft.notes.trim() || undefined,
        certificate: product?.certificate ?? null,
      },
      toneForCategory(draft.category),
    );
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">{product ? "EDIT PRODUCT" : "NEW PRODUCT"}</p>
          <h2>{product ? `${product.name} · ${product.sku}` : "Add to the catalogue"}</h2>
        </div>
      </div>

      <p className="mini-title">IDENTITY</p>
      <div className="form-grid">
        <TextField label="Product name" required value={draft.name} onChange={e => set("name", e.target.value)} error={errors.name} />
        <TextField
          label="SKU" required placeholder="MS-BATH-0524"
          value={draft.sku} onChange={e => set("sku", e.target.value.toUpperCase())} error={errors.sku}
          helper="Format: XXX-XXX-0000 · must be unique"
        />
        <SelectField label="Category" value={draft.category} onChange={e => set("category", e.target.value)}>
          {categories.filter(c => c.active || c.name === draft.category).map(c => <option key={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Status" value={draft.status} onChange={e => set("status", e.target.value as ProductStatus)}>
          {productStatuses.map(s => <option key={s}>{s}</option>)}
        </SelectField>
        <SelectField label="Location" value={draft.location} onChange={e => set("location", e.target.value)}>
          {productLocations.map(l => <option key={l}>{l}</option>)}
        </SelectField>
        <TextField label="Stock quantity" required inputMode="numeric" value={draft.stock} onChange={e => set("stock", e.target.value.replace(/\D/g, ""))} error={errors.stock} />
      </div>

      <p className="mini-title">PRODUCT & PACK SPECIFICATION</p>
      <div className="form-grid">
        <TextField label="Base type" required={isGemCategory} placeholder="e.g. Triple-milled toilet soap" value={draft.gemstoneType} onChange={e => set("gemstoneType", e.target.value)} error={errors.gemstoneType} helper={isGemCategory ? undefined : "Optional for home-care lines"} />
        <TextField label="Plant / line" placeholder="e.g. Vapi Plant · Line 1" value={draft.origin} onChange={e => set("origin", e.target.value)} />
        <SelectField label="Pack format" value={draft.shape} onChange={e => set("shape", e.target.value)}>
          {packFormats.map((s: string) => <option key={s}>{s}</option>)}
        </SelectField>
        <TextField label="Trade pack" placeholder="e.g. 100 units / carton" value={draft.cut} onChange={e => set("cut", e.target.value)} />
        <TextField label="Units per carton" inputMode="decimal" value={draft.carat} onChange={e => set("carat", e.target.value)} error={errors.carat} />
        <TextField label="Net weight per unit (g/ml)" inputMode="decimal" value={draft.weightGrams} onChange={e => set("weightGrams", e.target.value)} error={errors.weightGrams} />
        <TextField label="Carton dimensions" placeholder="e.g. 480 × 320 × 240 mm · 13.4 kg" value={draft.dimensions} onChange={e => set("dimensions", e.target.value)} />
        <TextField label="Colour / fragrance" placeholder="e.g. Ivory · sandalwood" value={draft.color} onChange={e => set("color", e.target.value)} />
        <TextField label="Grade" placeholder="e.g. Premium grade" value={draft.clarity} onChange={e => set("clarity", e.target.value)} />
        <SelectField label="Process" value={draft.treatment} onChange={e => set("treatment", e.target.value)}>
          {processTypes.map((t: string) => <option key={t}>{t}</option>)}
        </SelectField>
      </div>

      <p className="mini-title">PRICING · INR</p>
      <div className="form-grid">
        <TextField label="Purchase price" required prefix="₹" inputMode="numeric" value={draft.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} error={errors.purchasePrice} />
        <TextField label="Selling price" required prefix="₹" inputMode="numeric" value={draft.sellingPrice} onChange={e => set("sellingPrice", e.target.value)} error={errors.sellingPrice} />
        <TextField label="Wholesale price" prefix="₹" inputMode="numeric" value={draft.wholesalePrice} onChange={e => set("wholesalePrice", e.target.value)} error={errors.wholesalePrice} helper={`Margin at selling price: ${marginPreview()}`} />
      </div>

      <TextAreaField label="Notes" placeholder="Sourcing, display guidance, linked enquiries..." value={draft.notes} onChange={e => set("notes", e.target.value)} />

      <FormActions
        dirty={dirty}
        saving={false}
        onSave={save}
        onCancel={() => (dirty ? setDraft(saved) : onCancel())}
        saveLabel={product ? "Save changes" : "Create product"}
      />
    </section>
  );
}
