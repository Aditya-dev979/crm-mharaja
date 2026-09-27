import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";

export default function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  hideLabel = false,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="check">
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-input"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        aria-label={hideLabel ? label : undefined}
      />
      <i aria-hidden="true">
        <Icon name={indeterminate ? "minus" : "check"} size={13} />
      </i>
      {!hideLabel && label}
    </label>
  );
}
