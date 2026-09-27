import Icon, { type IconName } from "@/components/ui/Icon";

export type ToastTone = "success" | "info" | "warning" | "error";

const toneIcon: Record<ToastTone, IconName> = {
  success: "check",
  info: "info",
  warning: "warning",
  error: "error",
};

export default function Toast({
  tone = "success",
  title,
  message,
  onClose,
}: {
  tone?: ToastTone;
  title: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <div className={`toast ${tone}`} role="status">
      <span className="toast-icon"><Icon name={toneIcon[tone]} /></span>
      <div>
        <strong>{title}</strong>
        {message && <p>{message}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
