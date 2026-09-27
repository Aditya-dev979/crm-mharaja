import Icon, { type IconName } from "@/components/ui/Icon";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneIcon: Record<AlertTone, IconName> = {
  info: "info",
  success: "check",
  warning: "warning",
  danger: "error",
};

export default function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: AlertTone;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`alert ${tone}`} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      <Icon name={toneIcon[tone]} />
      <div>
        <strong>{title}</strong>
        {children && <span>{children}</span>}
      </div>
    </div>
  );
}
