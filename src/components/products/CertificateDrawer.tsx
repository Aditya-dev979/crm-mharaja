import Timeline, { type TimelineItem } from "@/components/data-display/Timeline";
import Drawer from "@/components/feedback/Drawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { certStatusTone } from "@/data/productData";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";

export default function CertificateDrawer({
  open,
  onClose,
  product,
  onVerify,
  onUnverify,
  onReplace,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  onVerify: () => void;
  onUnverify: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const cert = product.certificate;
  if (!cert) return null;

  const timeline: TimelineItem[] = [];
  if (cert.status === "Verified" && cert.verifiedAt) {
    timeline.push({ title: `Verified by ${cert.verifiedBy ?? "inspector"}`, meta: cert.verifiedAt, state: "done" });
  }
  if (cert.status === "Rejected") {
    timeline.push({ title: "Verification rejected", meta: cert.notes ?? "Data mismatch", state: "current" });
  }
  if (cert.status === "Expired") {
    timeline.push({ title: "Certificate expired", meta: "Re-certification recommended", state: "current" });
  }
  if (cert.status === "Pending Verification") {
    timeline.push({ title: "Awaiting verification", meta: "In the inspection queue", state: "current" });
  }
  timeline.push({ title: "Certificate uploaded", meta: cert.uploadedAt ?? cert.issueDate, state: "done" });
  timeline.push({ title: `Issued by ${cert.authority}`, meta: cert.issueDate, state: "done" });

  const rows: Array<[string, React.ReactNode]> = [
    ["Certificate number", <strong key="n">{cert.number}</strong>],
    ["Product", `${product.name} · ${product.sku}`],
    ["Authority", cert.authority],
    ["Type", cert.type],
    ["Issue date", cert.issueDate],
    ["Uploaded", cert.uploadedAt ?? "—"],
    ["Verified by", cert.verifiedBy ?? "—"],
    ["Verification date", cert.verifiedAt ?? "—"],
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="CERTIFICATE DETAIL"
      title={cert.number}
      className="detail-drawer"
      footer={
        <>
          <button
            type="button"
            className="link-btn"
            onClick={() => toast({ tone: "info", title: "Preparing download", message: `${cert.fileName ?? cert.number} (demo)` })}
          >
            Download file
          </button>
          <div className="detail-actions">
            {cert.status !== "Verified" ? (
              <Button onClick={onVerify}><Icon name="check" /> Mark verified</Button>
            ) : (
              <Button variant="secondary" onClick={onUnverify}>Mark unverified</Button>
            )}
          </div>
        </>
      }
    >
      <div className="drawer-content">
        <div className="cert-drawer-head">
          <Badge tone={certStatusTone[cert.status]}>{cert.status}</Badge>
          <span className="muted">{cert.fileName ?? "No file attached"}</span>
        </div>
        <div className="cert-file-preview" role="img" aria-label={`Preview of ${cert.fileName ?? "certificate"}`}>
          <Icon name="shield" size={34} />
          <strong>{cert.fileName ?? "certificate.pdf"}</strong>
          <span>{cert.authority} · {cert.type}</span>
        </div>
        <div className="detail-list">
          {rows.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
        {cert.notes && (
          <p className="requirement-quote">“{cert.notes}”</p>
        )}
        <p className="mini-title">VERIFICATION TIMELINE</p>
        <Timeline items={timeline} />
        <div className="cert-drawer-actions">
          <Button variant="secondary" onClick={onReplace}><Icon name="upload" /> Replace</Button>
          <Button variant="danger" onClick={onDelete}>Delete certificate</Button>
        </div>
      </div>
    </Drawer>
  );
}
