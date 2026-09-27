import { useState } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import { baseMaterials, productTypes } from "@/data/workshopData";
import { useCrm } from "@/hooks/useCrm";
import { useToast } from "@/hooks/useToast";
import type { CustomOrder, GemTone } from "@/types";

/* Picks a wrapper tone from the named base or key ingredient. Tone keys are
   internal colour names only. */
const toneForGem = (base: string): GemTone => {
  const g = base.toLowerCase();
  if (g.includes("neem") || g.includes("tulsi") || g.includes("herbal") || g.includes("aloe")) return "emerald";
  if (g.includes("rose") || g.includes("beauty")) return "ruby";
  if (g.includes("sandal") || g.includes("haldi") || g.includes("saffron")) return "yellow-sapphire";
  if (g.includes("glycerine") || g.includes("transparent")) return "bicolour";
  if (g.includes("baby") || g.includes("milk")) return "pearl";
  if (g.includes("laundry") || g.includes("dishwash") || g.includes("detergent")) return "spinel";
  if (g.includes("premium") || g.includes("luxury")) return "gold";
  return "sapphire";
};

export default function CustomOrderForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (
    draft: Omit<CustomOrder, "id" | "created" | "timeline" | "payments" | "progress" | "stage" | "attachments">,
    tone: GemTone,
  ) => void;
}) {
  const { customers } = useCrm();
  const toast = useToast();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [productType, setProductType] = useState(productTypes[0]);
  const [metal, setMetal] = useState(baseMaterials[0]);
  const [gemstone, setGemstone] = useState("");
  const [weight, setWeight] = useState("");
  const [size, setSize] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("2026-04-15");
  const [designReference, setDesignReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ cost?: string; design?: string; gemstone?: string }>({});

  const save = () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const cost = Number(estimatedCost.replace(/[,\s]/g, ""));
    const next: typeof errors = {};
    if (!cost || Number.isNaN(cost) || cost <= 0) next.cost = "Enter an estimated cost";
    if (!designReference.trim()) next.design = "Describe the design requirement";
    if (!gemstone.trim()) next.gemstone = "Name the base or key ingredient";
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast({ tone: "error", title: "Please review the form", message: "Some fields need attention before saving." });
      return;
    }
    onSave(
      {
        customerId: customer.id,
        customerName: customer.name,
        productType,
        designReference: designReference.trim(),
        metal,
        gemstone: gemstone.trim(),
        weightGrams: weight ? Number(weight) : undefined,
        size: size.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        estimatedCost: cost,
        deliveryDate: new Date(deliveryDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        notes: notes.trim() || undefined,
      },
      toneForGem(gemstone),
    );
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">NEW CUSTOM ORDER</p>
          <h2>Capture the artwork requirement</h2>
        </div>
      </div>
      <div className="form-grid">
        <SelectField label="Customer" required value={customerId} onChange={e => setCustomerId(e.target.value)}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id.replace("cust-", "CUST-")}</option>)}
        </SelectField>
        <SelectField label="Product type" value={productType} onChange={e => setProductType(e.target.value)}>
          {productTypes.map(t => <option key={t}>{t}</option>)}
        </SelectField>
        <SelectField label="Base material" value={metal} onChange={e => setMetal(e.target.value)}>
          {baseMaterials.map(m => <option key={m}>{m}</option>)}
        </SelectField>
        <TextField label="Base / key ingredient" required placeholder="e.g. Neem & tulsi herbal base" value={gemstone} onChange={e => { setGemstone(e.target.value); setErrors(x => ({ ...x, gemstone: undefined })); }} error={errors.gemstone} />
        <TextField label="Approx. weight (g)" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} />
        <TextField label="Pack size" placeholder="e.g. 100 g bar" value={size} onChange={e => setSize(e.target.value)} />
        <TextField label="Dimensions" placeholder="e.g. 84 × 55 × 26 mm" value={dimensions} onChange={e => setDimensions(e.target.value)} />
        <TextField label="Estimated cost" required prefix="₹" inputMode="numeric" value={estimatedCost} onChange={e => { setEstimatedCost(e.target.value); setErrors(x => ({ ...x, cost: undefined })); }} error={errors.cost} />
        <TextField label="Target delivery" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
      </div>
      <TextAreaField
        label="Artwork & formulation requirement" required
        placeholder="Reference packs, fragrance, wrapper artwork, launch window, constraints..."
        value={designReference}
        onChange={e => { setDesignReference(e.target.value); setErrors(x => ({ ...x, design: undefined })); }}
        error={errors.design}
      />
      <TextAreaField label="Internal notes" placeholder="Sourcing plan, line operator preference, deadlines..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Create custom order</Button>
      </div>
    </section>
  );
}
