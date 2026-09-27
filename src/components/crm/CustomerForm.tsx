import { useState } from "react";
import { FormActions, SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import { useToast } from "@/hooks/useToast";
import type { Customer, CustomerSegment } from "@/types";
import { isEmail, isPhone } from "@/utils";

interface CustomerDraft {
  name: string;
  phone: string;
  email: string;
  city: string;
  segment: CustomerSegment;
  gstin: string;
  address: string;
}

function toDraft(customer?: Customer): CustomerDraft {
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    city: customer?.city ?? "",
    segment: customer?.segment ?? "New",
    gstin: customer?.gstin ?? "",
    address: customer?.address ?? "",
  };
}

export default function CustomerForm({
  customer,
  onCancel,
  onSave,
}: {
  customer?: Customer;
  onCancel: () => void;
  onSave: (draft: Pick<Customer, "name" | "phone" | "email" | "city" | "segment" | "gstin" | "address">) => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<CustomerDraft>(() => toDraft(customer));
  const [draft, setDraft] = useState<CustomerDraft>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDraft, string>>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof CustomerDraft, value: string) => {
    setDraft(d => ({ ...d, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Customer name is required";
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
      phone: draft.phone.replace(/[\s-]/g, ""),
      email: draft.email.trim(),
      city: draft.city.trim() || "Jaipur",
      segment: draft.segment,
      gstin: draft.gstin.trim().toUpperCase() || undefined,
      address: draft.address.trim() || undefined,
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">{customer ? "EDIT CUSTOMER" : "NEW CUSTOMER"}</p>
          <h2>{customer ? customer.name : "Create a customer record"}</h2>
        </div>
      </div>
      <div className="form-grid">
        <TextField label="Full name" required value={draft.name} onChange={e => set("name", e.target.value)} error={errors.name} />
        <TextField
          label="Phone number" required prefix="+91" inputMode="numeric"
          value={draft.phone} onChange={e => set("phone", e.target.value)} error={errors.phone}
          success={!errors.phone && isPhone(draft.phone) ? "Valid number" : undefined}
        />
        <TextField label="Email" type="email" value={draft.email} onChange={e => set("email", e.target.value)} error={errors.email} />
        <TextField label="City" value={draft.city} onChange={e => set("city", e.target.value)} />
        <SelectField label="Segment" value={draft.segment} onChange={e => set("segment", e.target.value as CustomerSegment)}>
          <option>New</option>
          <option>Regular</option>
          <option>VIP</option>
        </SelectField>
        <TextField
          label="GSTIN" placeholder="08AAHPM1023Q1ZW"
          value={draft.gstin} onChange={e => set("gstin", e.target.value)} error={errors.gstin}
          helper="Optional — needed for B2B invoices"
        />
      </div>
      <TextAreaField
        label="Address"
        placeholder="Billing / delivery address"
        value={draft.address}
        onChange={e => set("address", e.target.value)}
      />
      <FormActions
        dirty={dirty}
        saving={false}
        onSave={save}
        onCancel={() => (dirty ? setDraft(saved) : onCancel())}
        saveLabel={customer ? "Save changes" : "Create customer"}
      />
    </section>
  );
}
