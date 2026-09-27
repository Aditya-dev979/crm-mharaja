import { useState } from "react";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import { ConfirmModal } from "@/components/inventory/InventoryModals";
import GemImage from "@/components/products/GemImage";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { conditionOptions, inspectionStatusTone } from "@/data/qualityData";
import { useQuality } from "@/hooks/useQuality";
import { useToast } from "@/hooks/useToast";
import type { InspectionRecord } from "@/types";

export default function InspectionDetail({
  inspection,
  onBack,
  onOpenProduct,
  onOpenReturn,
}: {
  inspection: InspectionRecord;
  onBack: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenReturn: (returnId: string) => void;
}) {
  const { updateInspection, addInspectionPhoto, returns, updateReturn } = useQuality();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; action: () => void } | null>(null);

  const editable = inspection.status === "Pending" || inspection.status === "In Review" || inspection.status === "Reinspection";
  const linkedReturn = returns.find(r => r.inspectionId === inspection.id);

  const set = (patch: Partial<InspectionRecord>) => updateInspection(inspection.id, patch);

  const startReview = () => {
    updateInspection(inspection.id, { status: "In Review", inspector: inspection.inspector ?? "Deepak Verma" }, `Detailed review started — ${inspection.inspector ?? "Deepak Verma"}`);
    toast({ tone: "info", title: "Review started", message: inspection.id });
  };

  const approve = () =>
    setConfirm({
      title: `Approve ${inspection.id}?`,
      message: <>Confirms {inspection.product} passed inspection{inspection.condition ? ` in ${inspection.condition.toLowerCase()} condition` : ""}. Linked workflows can proceed.</>,
      confirmLabel: "Approve inspection",
      action: () => {
        updateInspection(inspection.id, { status: "Approved" }, "Inspection approved");
        if (linkedReturn) {
          updateReturn(linkedReturn.id, {}, `Inspection ${inspection.id} passed — item in ${inspection.condition?.toLowerCase() ?? "acceptable"} condition`);
        }
        toast({ tone: "success", title: "Inspection approved", message: inspection.id });
        setConfirm(null);
      },
    });

  const reject = () =>
    setConfirm({
      title: `Reject ${inspection.id}?`,
      danger: true,
      message: "The item fails inspection. Linked returns or GRN lines must be resolved accordingly.",
      confirmLabel: "Reject inspection",
      action: () => {
        updateInspection(inspection.id, { status: "Rejected" }, "Inspection rejected");
        if (linkedReturn) updateReturn(linkedReturn.id, {}, `Inspection ${inspection.id} failed`);
        toast({ tone: "warning", title: "Inspection rejected", message: inspection.id });
        setConfirm(null);
      },
    });

  const reinspect = () => {
    updateInspection(inspection.id, { status: "Reinspection" }, "Reinspection requested");
    toast({ tone: "info", title: "Reinspection scheduled", message: `${inspection.id} goes back into the queue.` });
  };

  const fields: Array<[keyof InspectionRecord & string, string, string]> = [
    ["weight", "Weight", "e.g. 100 g bar / 14.4 kg carton"],
    ["dimensions", "Dimensions", "e.g. 8.4 × 7.1 × 4.4 mm"],
    ["color", "Colour", "e.g. Deep red"],
    ["clarity", "Clarity", "e.g. VS · eye clean"],
    ["treatment", "Treatment", "e.g. Heat treated"],
    ["certificate", "Certificate", "e.g. NABL-2026-101223"],
  ];

  return (
    <div className="page-stack">
      <button type="button" className="back-link" onClick={onBack}>← All inspections</button>
      <div className="detail-title-row">
        <div>
          <div className="detail-title">
            <h1>{inspection.id}</h1>
            <Badge tone={inspectionStatusTone[inspection.status]}>{inspection.status}</Badge>
          </div>
          <p className="muted-line">
            {inspection.source}
            {inspection.reference && <> · {linkedReturn ? (
              <button type="button" className="link-btn" onClick={() => onOpenReturn(linkedReturn.id)}>{inspection.reference}</button>
            ) : inspection.reference}</>}
            {" "}· {inspection.date}
            {inspection.inspector && <> · {inspection.inspector}</>}
          </p>
        </div>
        <div className="detail-actions">
          {inspection.productId && (
            <Button variant="secondary" onClick={() => onOpenProduct(inspection.productId!)}><Icon name="gem" /> View product</Button>
          )}
          {(inspection.status === "Pending" || inspection.status === "Reinspection") && (
            <Button onClick={startReview}><Icon name="eye" /> Start review</Button>
          )}
          {inspection.status === "In Review" && (
            <>
              <Button variant="danger" onClick={reject}>Reject</Button>
              <Button onClick={approve}><Icon name="check" /> Approve</Button>
            </>
          )}
          {inspection.status === "Rejected" && (
            <Button variant="secondary" onClick={reinspect}><Icon name="sort" /> Request reinspection</Button>
          )}
        </div>
      </div>

      {inspection.status === "Rejected" && (
        <Alert tone="danger" title="This item failed inspection">{inspection.remarks ?? "See remarks for the failure reason."}</Alert>
      )}
      {inspection.status === "Approved" && linkedReturn && (
        <Alert tone="success" title="Inspection passed">
          Return {linkedReturn.id} can now be approved.{" "}
          <button type="button" className="link-btn" onClick={() => onOpenReturn(linkedReturn.id)}>Open the return</button>
        </Alert>
      )}

      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div><p className="kicker">MEASURED DATA</p><h2>{inspection.product}</h2></div>
            {!editable && <span>Locked after decision</span>}
          </div>
          <div className="form-grid">
            {fields.map(([key, label, placeholder]) => (
              <TextField
                key={key}
                label={label}
                placeholder={placeholder}
                value={(inspection[key] as string | undefined) ?? ""}
                disabled={!editable}
                onChange={e => set({ [key]: e.target.value } as Partial<InspectionRecord>)}
              />
            ))}
            <SelectField label="Physical condition" value={inspection.condition ?? ""} disabled={!editable} onChange={e => set({ condition: e.target.value })}>
              <option value="">Not assessed</option>
              {conditionOptions.map(c => <option key={c}>{c}</option>)}
            </SelectField>
          </div>
          <TextAreaField
            label="Inspector remarks"
            placeholder="Findings, flags, recommendations..."
            value={inspection.remarks ?? ""}
            disabled={!editable}
            onChange={e => set({ remarks: e.target.value })}
          />
          <p className="mini-title">INSPECTION PHOTOS</p>
          <div className="gallery-thumbs">
            {inspection.photos.map(photo => (
              <div key={photo.id} className="gallery-thumb">
                <span className="thumb-btn"><GemImage tone={photo.tone} size="thumb" label={photo.label} /></span>
                <small className="muted">{photo.label}</small>
              </div>
            ))}
            {editable && (
              <button
                type="button"
                className="gallery-add"
                onClick={() => {
                  addInspectionPhoto(inspection.id, { label: `Detail ${inspection.photos.length + 1}`, tone: inspection.tone });
                  toast({ tone: "success", title: "Photo added", message: "Attached to the inspection record." });
                }}
              >
                <Icon name="plus" />
                <span>Add photo</span>
              </button>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><div><p className="kicker">ACTIVITY</p><h2>Inspection timeline</h2></div></div>
          <Timeline items={inspection.timeline.slice(0, 8).map((e, i) => ({ title: e.text, meta: e.time, state: i === 0 ? "current" : "done" }))} />
        </section>
      </div>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.action} />
      )}
    </div>
  );
}
