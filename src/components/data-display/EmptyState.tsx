import Icon, { type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  mini = false,
  className,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "default" | "error";
  mini?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", tone === "error" && "error-state", mini && "mini", className)}>
      <div><Icon name={icon} /></div>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}
