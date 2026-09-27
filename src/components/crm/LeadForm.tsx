import { useState } from "react";
import { FormActions, SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Radio from "@/components/forms/Radio";
import { executives, leadSources, leadStatuses, productInterests } from "@/data/crmData";
import { useToast } from "@/hooks/useToast";
import type { Lead, LeadPriority, LeadStatus } from "@/types";
import { isEmail, isPhone } from "@/utils";

interface LeadDraft {
  name: string;
  phone: string;
  email: string;
  source: string;
  requirement: string;
  specifications: string;
  deliveryExpectation: string;
  interest: string;
  budget: string;
  city: string;
  executive: string;
  status: LeadStatus;
  priority: LeadPriority;
  nextFollowUp: string;
}

function toDraft(lead?: Lead): LeadDraft {
  return {
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? leadSources[0],
    requirement: lead?.requirement ?? "",
    specifications: lead?.specifications ?? "",
    deliveryExpectation: lead?.deliveryExpectation ?? "",
    interest: lead?.interest ?? productInterests[0],
    budget: lead ? String(lead.budget) : "",
    city: lead?.city ?? "",
    executive: lead?.executive ?? executives[0],
    status: lead?.status ?? "New",
    priority: lead?.priority ?? "Warm",
    nextFollowUp: lead?.nextFollowUp && lead.nextFollowUp !== "—" ? lead.nextFollowUp : "",
  };
}

export default function LeadForm({
  lead,
  onCancel,
  onSave,
}: {
  lead?: Lead;
  onCancel: () => void;
  onSave: (draft: Omit<Lead, "id" | "notes" | "timeline" | "created">) => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<LeadDraft>(() => toDraft(lead));
  const [draft, setDraft] = useState<LeadDraft>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadDraft, string>>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof LeadDraft, value: string) => {
    setDraft(d => ({ ...d, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Lead name is required";
    if (!isPhone(draft.phone)) next.phone = "Enter a valid 10-digit phone number";
    if (draft.email.trim() && !isEmail(draft.email)) next.email = "Enter a valid email address";
    const budget = Number(draft.budget.replace(/[,\s]/g, ""));
    if (!budget || Number.isNaN(budget)) next.budget = "Enter an approximate budget";
    if (!draft.requirement.trim()) next.requirement = "Describe what the lead is looking for";
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
      source: draft.source,
      requirement: draft.requirement.trim(),
      specifications: draft.specifications.trim() || undefined,
      deliveryExpectation: draft.deliveryExpectation.trim() || undefined,
      interest: draft.interest,
      budget,
      city: draft.city.trim() || "Jaipur",
      executive: draft.executive,
      status: draft.status,
      priority: draft.priority,
      nextFollowUp: draft.nextFollowUp.trim() || "Tomorrow, 11:00 AM",
      ...(lead?.customerId ? { customerId: lead.customerId } : {}),
      ...(lead?.lostReason ? { lostReason: lead.lostReason } : {}),
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="kicker">{lead ? "EDIT LEAD" : "NEW LEAD"}</p>
          <h2>{lead ? `${lead.name} · ${lead.id}` : "Capture a new enquiry"}</h2>
        </div>
      </div>
      <div className="form-grid">
        <TextField label="Lead name" required value={draft.name} onChange={e => set("name", e.target.value)} error={errors.name} />
        <TextField
          label="Phone number" required prefix="+91" inputMode="numeric"
          value={draft.phone} onChange={e => set("phone", e.target.value)} error={errors.phone}
          success={!errors.phone && isPhone(draft.phone) ? "Valid number" : undefined}
        />
        <TextField label="Email" type="email" value={draft.email} onChange={e => set("email", e.target.value)} error={errors.email} />
        <SelectField label="Source" value={draft.source} onChange={e => set("source", e.target.value)}>
          {leadSources.map(s => <option key={s}>{s}</option>)}
        </SelectField>
        <SelectField label="Product interest" value={draft.interest} onChange={e => set("interest", e.target.value)}>
          {productInterests.map(p => <option key={p}>{p}</option>)}
        </SelectField>
        <TextField
          label="Approximate budget" required prefix="₹" inputMode="numeric"
          value={draft.budget} onChange={e => set("budget", e.target.value)} error={errors.budget}
        />
        <TextField label="City" value={draft.city} onChange={e => set("city", e.target.value)} />
        <SelectField label="Assigned executive" value={draft.executive} onChange={e => set("executive", e.target.value)}>
          {executives.map(x => <option key={x}>{x}</option>)}
        </SelectField>
        <SelectField label="Status" value={draft.status} onChange={e => set("status", e.target.value as LeadStatus)}>
          {leadStatuses.map(s => <option key={s}>{s}</option>)}
        </SelectField>
      </div>
      <div className="form-grid form-grid-secondary">
        <div className="field">
          <span className="field-label">Priority</span>
          <div className="radio-row">
            {(["Hot", "Warm", "Cold"] as LeadPriority[]).map(p => (
              <Radio key={p} name="lead-priority" label={p} checked={draft.priority === p} onChange={() => set("priority", p)} />
            ))}
          </div>
        </div>
        <TextField
          label="Next follow-up" placeholder="e.g. 12 Mar, 4:00 PM"
          value={draft.nextFollowUp} onChange={e => set("nextFollowUp", e.target.value)}
          helper="Leave blank to default to tomorrow morning"
        />
      </div>
      <TextAreaField
        label="Product specifications"
        placeholder="Technical / commercial specifications — pack size, units per carton, fragrance, certification…"
        helper="Carried into the Proforma Invoice as product specifications."
        value={draft.specifications} onChange={e => set("specifications", e.target.value)}
      />
      <TextField
        label="Delivery expectation"
        placeholder="e.g. Before 20 March 2026"
        value={draft.deliveryExpectation} onChange={e => set("deliveryExpectation", e.target.value)}
      />
      <TextAreaField
        label="Requirement" required
        placeholder="What is the lead looking for? Stone, size, occasion, timeline..."
        value={draft.requirement} onChange={e => set("requirement", e.target.value)} error={errors.requirement}
      />
      <FormActions
        dirty={dirty}
        saving={false}
        onSave={save}
        onCancel={() => (dirty ? setDraft(saved) : onCancel())}
        saveLabel={lead ? "Save changes" : "Create lead"}
      />
    </section>
  );
}
