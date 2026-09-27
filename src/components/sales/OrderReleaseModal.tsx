import { useEffect, useState } from "react";
import Alert from "@/components/feedback/Alert";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { plants } from "@/data/productionData";
import { useAdmin } from "@/hooks/useAdmin";
import { useProduction } from "@/hooks/useProduction";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/useToast";
import type { ReleaseDestination, SalesOrder } from "@/types";

let releaseCounter = 2604;

/* Release sends an approved, paid-up order to fulfilment: either our own
   factory (creates a production order) or a contract manufacturer (creates an
   assignment). Both keep the sales order as the single customer-facing record. */
export default function OrderReleaseModal({
  order,
  open,
  onClose,
  onOpenProduction,
}: {
  order: SalesOrder;
  open: boolean;
  onClose: () => void;
  onOpenProduction?: (productionId: string) => void;
}) {
  const { boms, manufacturers, addProductionOrder, addAssignment } = useProduction();
  const { updateOrder } = useSales();
  const { can, activeRole, currentUser } = useAdmin();
  const { addNotification, logAudit } = useTeam();
  const toast = useToast();

  const activeManufacturers = manufacturers.filter(m => m.active);
  const [destination, setDestination] = useState<ReleaseDestination>("Owned Factory");
  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [plant, setPlant] = useState(plants[0]);
  const [manufacturerId, setManufacturerId] = useState(activeManufacturers[0]?.id ?? "");
  const [qty, setQty] = useState(String(order.lines.reduce((s, l) => s + l.qty, 0)));
  const [expected, setExpected] = useState("24 Mar 2026");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setDestination("Owned Factory");
      setBomId(boms[0]?.id ?? "");
      setPlant(plants[0]);
      setManufacturerId(activeManufacturers[0]?.id ?? "");
      setQty(String(order.lines.reduce((s, l) => s + l.qty, 0)));
      setExpected("24 Mar 2026");
      setInstructions("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canRelease = can("Sales", "Approve") || can("Production", "Approve");
  const qtyNum = parseInt(qty || "0", 10);
  const bom = boms.find(b => b.id === bomId);

  const submit = () => {
    if (!canRelease) {
      setError(`${activeRole} cannot release orders for fulfilment. An approving manager must do this.`);
      return;
    }
    if (!instructions.trim()) {
      setError("Release instructions are mandatory — production works to them.");
      return;
    }
    if (qtyNum <= 0) {
      setError("Release quantity must be at least 1.");
      return;
    }
    const releaseId = `REL-${releaseCounter++}`;

    if (destination === "Owned Factory") {
      if (!bom) {
        setError("Select the formulation the factory should build to.");
        return;
      }
      const prd = addProductionOrder(
        {
          product: bom.product, sku: bom.sku, orderId: order.id, bomId: bom.id, releaseId,
          plannedQty: qtyNum, plannedStart: "09 Mar 2026", plannedComplete: expected,
          plant, responsible: "Vikram Singh",
          consumption: bom.lines.map(l => ({
            materialId: l.materialId, materialName: l.materialName, unit: l.unit,
            planned: l.qtyPerUnit * qtyNum, actual: 0,
          })),
        },
        `Released from ${order.id} — ${instructions.trim()}`,
      );
      updateOrder(
        order.id,
        {
          status: order.status === "Confirmed" || order.status === "Partially Paid" ? "Processing" : order.status,
          release: {
            id: releaseId, destination, releasedBy: "Arjun Sharma", releaseDate: "08 Mar 2026",
            instructions: instructions.trim(), productionOrderId: prd.id, expectedReady: expected,
          },
        },
        `${releaseId} — released to ${plant} · ${prd.id}`,
      );
      addNotification({
        type: "Production Update", priority: "Normal",
        title: `${order.id} released to the factory`,
        message: `${qtyNum} × ${bom.product} · ${prd.id} · ready by ${expected}.`,
        reference: prd.id,
        recordRef: { kind: "production", id: prd.id },
      });
      logAudit({ user: currentUser, action: "Order released", module: "Sales", record: `${order.id} · ${releaseId}`, newValue: `Owned Factory · ${prd.id}` });
      toast({ tone: "success", title: "Released to the factory", message: `${prd.id} created against ${order.id}.` });
      onClose();
      onOpenProduction?.(prd.id);
      return;
    }

    const manufacturer = manufacturers.find(m => m.id === manufacturerId);
    if (!manufacturer) {
      setError("Select an active contract manufacturer.");
      return;
    }
    const assignment = addAssignment(
      {
        manufacturerId: manufacturer.id, manufacturerName: manufacturer.name,
        orderId: order.id, piId: order.invoiceId,
        product: order.lines[0]?.name ?? order.id, qty: qtyNum,
        specifications: instructions.split("\n").map(s => s.trim()).filter(Boolean),
        sentDate: "08 Mar 2026", expectedCompletion: expected,
        attachments: [`${order.id}-specifications.pdf`],
      },
      `Released from ${order.id} — specifications sent to ${manufacturer.name}`,
    );
    updateOrder(
      order.id,
      {
        status: order.status === "Confirmed" || order.status === "Partially Paid" ? "Processing" : order.status,
        release: {
          id: releaseId, destination, releasedBy: "Arjun Sharma", releaseDate: "08 Mar 2026",
          instructions: instructions.trim(), assignmentId: assignment.id, expectedReady: expected,
        },
      },
      `${releaseId} — released to ${manufacturer.name} · ${assignment.id}`,
    );
    addNotification({
      type: "Production Update", priority: "Normal",
      title: `${order.id} released to ${manufacturer.name}`,
      message: `${qtyNum} units assigned · ${assignment.id} · expected ${expected}.`,
      reference: assignment.id,
      recordRef: { kind: "assignment", id: assignment.id },
    });
    logAudit({ user: currentUser, action: "Order released", module: "Sales", record: `${order.id} · ${releaseId}`, newValue: `${manufacturer.name} · ${assignment.id}` });
    toast({ tone: "success", title: "Released to the manufacturer", message: `${assignment.id} created against ${order.id}.` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="rel-title" className="wide-modal">
      <div className="modal-icon royal-icon"><Icon name="send" /></div>
      <h2 id="rel-title">Release {order.id} for fulfilment</h2>
      <p>{order.customerName} · {order.lines.length} line{order.lines.length === 1 ? "" : "s"}. Release records who released it, where it goes and what production must follow.</p>
      {error && <Alert tone="danger" title="Release blocked">{error}</Alert>}
      <SelectField label="Fulfilment source" value={destination} onChange={e => setDestination(e.target.value as ReleaseDestination)}>
        <option>Owned Factory</option>
        <option>Contract Manufacturer</option>
      </SelectField>
      {destination === "Owned Factory" ? (
        <div className="modal-field-row">
          <SelectField label="Formulation / BOM" value={bomId} onChange={e => setBomId(e.target.value)}>
            {boms.map(b => <option key={b.id} value={b.id}>{b.id} · {b.product}</option>)}
          </SelectField>
          <SelectField label="Plant" value={plant} onChange={e => setPlant(e.target.value)}>
            {plants.map(p => <option key={p}>{p}</option>)}
          </SelectField>
        </div>
      ) : (
        <SelectField label="Contract manufacturer" value={manufacturerId} onChange={e => setManufacturerId(e.target.value)}>
          {activeManufacturers.map(m => <option key={m.id} value={m.id}>{m.name} · {m.city}</option>)}
        </SelectField>
      )}
      <div className="modal-field-row">
        <TextField label="Quantity to release" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ""))} />
        <TextField label="Expected ready date" value={expected} onChange={e => setExpected(e.target.value)} />
      </div>
      <TextAreaField
        label="Instructions / specifications *"
        placeholder={destination === "Owned Factory" ? "Finish, batch coding, packing and any customer-specific detail…" : "One specification per line — this is what the manufacturer works to."}
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
      />
      <div className="detail-list">
        <div><span>Released by</span><strong>Arjun Sharma · 08 Mar 2026</strong></div>
        <div><span>Creates</span><strong>{destination === "Owned Factory" ? "A production order at the owned factory" : "A contract manufacturing assignment"}</strong></div>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Release order</Button>
      </div>
    </Modal>
  );
}
