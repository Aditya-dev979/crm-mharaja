import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { leadPriorityTone, leadStatuses, leadStatusTone } from "@/data/crmData";
import type { Lead } from "@/types";
import { formatINR } from "@/utils";

const initials = (name: string) =>
  name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();

export default function KanbanBoard({
  leads,
  onOpenLead,
}: {
  leads: Lead[];
  onOpenLead: (id: string) => void;
}) {
  return (
    <div className="kanban" role="list" aria-label="Lead pipeline board">
      {leadStatuses.map(status => {
        const column = leads.filter(l => l.status === status);
        return (
          <div className={`kanban-col tone-${leadStatusTone[status]}`} key={status} role="listitem">
            <header>
              <span>{status}</span>
              <b>{column.length}</b>
            </header>
            <div className="kanban-cards">
              {column.map(lead => (
                <button key={lead.id} type="button" className="kanban-card" onClick={() => onOpenLead(lead.id)}>
                  <div className="kc-top">
                    <strong>{lead.name}</strong>
                    <Badge tone={leadPriorityTone[lead.priority]}>{lead.priority}</Badge>
                  </div>
                  <p>{lead.interest} · {formatINR(lead.budget)}</p>
                  {lead.nextFollowUp !== "—" && (
                    <small><Icon name="calendar" size={12} /> {lead.nextFollowUp}</small>
                  )}
                  <small className="kc-exec">
                    <i aria-hidden="true">{initials(lead.executive)}</i> {lead.executive}
                  </small>
                </button>
              ))}
              {column.length === 0 && <div className="kanban-empty">No leads here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
