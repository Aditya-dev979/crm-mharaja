import { useState } from "react";
import { FormActions, TextAreaField, TextField } from "@/components/forms/Field";
import Checkbox from "@/components/forms/Checkbox";
import { productInterests } from "@/data/crmData";
import { useToast } from "@/hooks/useToast";
import type { Supplier } from "@/types";
import { isEmail, isPhone } from "@/utils";

interface SupplierDraft {
  name: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  speciality: string[];
  notes: string;
}

const specialityOptions = [...productInterests, "Job work"];

function toDraft(supplier?: Supplier): SupplierDraft {
  return {
    name: supplier?.name ?? "",
    contact: supplier?.contact ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    city: supplier?.city ?? "",
    gstin: supplier?.gstin ?? "",
    speciality: supplier?.speciality ?? [],
    notes: supplier?.notes ?? "",
  };
}

export default function SupplierForm({
  supplier,
  onCancel,
  onSave,
}: {
  supplier?: Supplier;
  onCancel: () => void;
  onSave: (draft: Omit<Supplier, "id" | "since" | "active">) => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<SupplierDraft>(() => toDraft(supplier));
  const [draft, setDraft] = useState<SupplierDraft>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierDraft, string>>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof SupplierDraft, value: string | string[]) => {
    setDraft(d => ({ ...d, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Supplier name is required";
    if (!draft.contact.trim()) next.contact = "Contact person is required";
    if (!isPhone(draft.phone)) next.phone = "Enter a valid 10-digit phone number";
    if (draft.email.trim() && !isEmail(draft.email)) next.email = "Enter a valid email address";
    if (draft.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/.test(draft.gstin.trim().toUpperCase())) {
      next.gstin = "GSTIN format is not recognised";
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast({ tone: "error", title: "Please review the form", message: "Some fields need attention before saving." });
      return;
    }
    setSaved(draft);
    onSave({
      name: draft.name.trim(),
      contact: draft.contact.trim(),
      phone: draft.phone.replace(/[\s-]/g, ""),
      email: draft.email.trim(),
      city: draft.city.trim() || "Jaipur",
      gstin: draft.gstin.trim().toUpperCase() || undefined,
      speciality: draft.speciality,
      notes: draft.notes.trim() || undefined,
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">{supplier ? "EDIT SUPPLIER" : "NEW SUPPLIER"}</p>
          <h2>{supplier ? supplier.name : "Add a supplier"}</h2>
        </div>
      </div>
      <div className="form-grid">
        <TextField label="Supplier name" required value={draft.name} onChange={e => set("name", e.target.value)} error={errors.name} />
        <TextField label="Contact person" required value={draft.contact} onChange={e => set("contact", e.target.value)} error={errors.contact} />
        <TextField
          label="Phone" required prefix="+91" inputMode="numeric"
          value={draft.phone} onChange={e => set("phone", e.target.value)} error={errors.phone}
        />
        <TextField label="Email" type="email" value={draft.email} onChange={e => set("email", e.target.value)} error={errors.email} />
        <TextField label="City" value={draft.city} onChange={e => set("city", e.target.value)} />
        <TextField label="GSTIN" placeholder="08AABCR2210P1ZQ" value={draft.gstin} onChange={e => set("gstin", e.target.value)} error={errors.gstin} helper="Optional — needed for input credit" />
      </div>
      <p className="mini-title">SPECIALITY</p>
      <div className="filter-checks speciality-checks">
        {specialityOptions.map(option => (
          <Checkbox
            key={option}
            label={option}
            checked={draft.speciality.includes(option)}
            onChange={on => set("speciality", on ? [...draft.speciality, option] : draft.speciality.filter(s => s !== option))}
          />
        ))}
      </div>
      <TextAreaField label="Notes" placeholder="Terms, quality track record, escalation contacts..." value={draft.notes} onChange={e => set("notes", e.target.value)} />
      <FormActions
        dirty={dirty}
        saving={false}
        onSave={save}
        onCancel={() => (dirty ? setDraft(saved) : onCancel())}
        saveLabel={supplier ? "Save changes" : "Add supplier"}
      />
    </section>
  );
}
