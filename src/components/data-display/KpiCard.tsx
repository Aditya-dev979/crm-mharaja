import Icon, { type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils";

export default function KpiCard({
  label,
  value,
  note,
  noteTone = "muted",
  icon,
  iconTone = "royal",
  loading = false,
  onClick,
}: {
  label: string;
  value?: string;
  note?: string;
  noteTone?: "muted" | "up" | "warning";
  icon?: IconName;
  iconTone?: "royal" | "emerald" | "gold";
  loading?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <div className="kpi skeleton-card" aria-label={`${label} loading`} role="status">
        <i /><i /><i />
      </div>
    );
  }
  const content = (
    <>
      {icon && (
        <div className={cn("kpi-icon", iconTone === "gold" ? "gold-bg" : iconTone)}>
          <Icon name={icon} />
        </div>
      )}
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small className={cn(noteTone === "up" && "up", noteTone === "warning" && "warning-text")}>{note}</small>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="kpi kpi-click" onClick={onClick} aria-label={`${label}: ${value}. Open module`}>
        {content}
      </button>
    );
  }
  return <div className="kpi">{content}</div>;
}
