import { cn } from "@/utils";

export default function Switch({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn("switch", on && "on")}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <i aria-hidden="true" />
    </button>
  );
}
