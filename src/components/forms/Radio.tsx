export default function Radio({
  checked,
  onChange,
  label,
  name,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  name: string;
  disabled?: boolean;
}) {
  return (
    <label className="radio">
      <input
        type="radio"
        className="sr-input"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <i aria-hidden="true" />
      {label}
    </label>
  );
}
