import { fillTemplate } from "@/data/dispatchData";
import { useAdmin } from "@/hooks/useAdmin";
import { useCrm } from "@/hooks/useCrm";
import { useDispatch } from "@/hooks/useDispatch";
import { usePurchase } from "@/hooks/usePurchase";
import { useSales } from "@/hooks/useSales";
import { useTeam } from "@/hooks/useTeam";
import type { CommMessage, CommPartyKind, MessageChannel } from "@/types";

/* Sends a templated message: it lands in the communication history, on the
   customer's 360 communication feed, and on the referenced record's timeline
   (sales order or purchase order / GRN for supplier communication).

   Delivery is simulated. The message is created as Sending and settles to Sent
   a moment later — or to Failed when the party has no address on that channel,
   which is what a real gateway would report. Nothing is transmitted anywhere. */
export function useSendComm() {
  const { addMessage, updateMessage } = useDispatch();
  const { customers, updateCustomer, addLeadEvent } = useCrm();
  const { orders, updateOrder } = useSales();
  const { pos, updatePO, grns, updateGrn } = usePurchase();
  const { logAudit } = useTeam();
  const { currentUser } = useAdmin();

  return (args: {
    channel: MessageChannel;
    templateName: string;
    body: string;
    partyKind: CommPartyKind;
    partyId?: string;
    partyName: string;
    reference?: string;
    subject?: string;
  }): CommMessage => {
    const preview = fillTemplate(args.body, args.partyName, args.reference);
    const message = addMessage({
      channel: args.channel,
      templateName: args.templateName,
      partyKind: args.partyKind,
      partyId: args.partyId,
      partyName: args.partyName,
      reference: args.reference,
      subject: args.subject,
      body: preview,
      preview: preview.length > 110 ? `${preview.slice(0, 110)}…` : preview,
      status: "Sending",
      createdBy: currentUser,
    });

    /* A customer with no email cannot receive an email — the simulation reports
       the same failure a gateway would, so Retry has something to act on. */
    const customer = args.partyKind === "Customer" && args.partyId ? customers.find(c => c.id === args.partyId) : undefined;
    const undeliverable = args.channel === "Email" && customer ? !customer.email : false;

    window.setTimeout(() => {
      if (undeliverable) {
        updateMessage(message.id, {
          status: "Failed",
          failureReason: `No email address on record for ${args.partyName}. Add one on the customer record, or send on WhatsApp instead.`,
        });
      } else {
        updateMessage(message.id, { status: "Sent", sentAt: "Just now" });
      }
    }, 900);

    if (customer) {
      updateCustomer(customer.id, {
        communications: [
          {
            channel: args.channel,
            text: `${args.templateName} — ${args.reference ?? "general"}`,
            time: "Just now",
          },
          ...customer.communications,
        ],
      });
    }

    /* A lead has no customer record yet, so its activity goes on the lead's own
       timeline — the same place its calls, notes and follow-ups appear. */
    if (args.partyKind === "Lead" && args.partyId) {
      addLeadEvent(args.partyId, `${args.templateName} sent on ${args.channel}`);
    }

    /* A reference often carries extra context ("SO-260184 · LR 3391 · Gati"),
       so the record is matched on the leading id, not the whole string. */
    const recordId = args.reference?.match(/^[A-Z]{2,5}-[0-9]+/)?.[0];
    const event = `${args.templateName} sent to ${args.partyName} on ${args.channel}`;
    if (recordId && orders.some(o => o.id === recordId)) {
      updateOrder(recordId, {}, event);
    }
    if (recordId && pos.some(po => po.id === recordId)) {
      updatePO(recordId, {}, event);
    }
    if (recordId && grns.some(g => g.id === recordId)) {
      updateGrn(recordId, {}, event);
    }

    logAudit({
      user: currentUser,
      action: `${args.channel} message sent`,
      module: "Communication",
      record: recordId ? `${message.id} · ${recordId}` : message.id,
      newValue: `${args.templateName} → ${args.partyName}`,
    });

    return message;
  };
}
