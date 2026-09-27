import { useId } from "react";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils";

interface FieldChrome {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  success?: string;
}

function FieldShell({
  label,
  required,
  helper,
  error,
  success,
  id,
  descId,
  children,
}: FieldChrome & { id: string; descId: string; children: React.ReactNode }) {
  const note = error ?? success ?? helper;
  return (
    <div className={cn("field", error && "error-field", success && "success-field")}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </label>
      {children}
      {note && (
        <small
          id={descId}
          className={cn("field-note", error && "error-text", success && "success-text")}
        >
          {error && <Icon name="error" size={12} />}
          {success && <Icon name="check" size={12} />}
          {note}
        </small>
      )}
    </div>
  );
}

type InputExtras = {
  icon?: IconName;
  prefix?: string;
};

export function TextField({
  label,
  required,
  helper,
  error,
  success,
  icon,
  prefix,
  ...inputProps
}: FieldChrome & InputExtras & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const descId = `${id}-note`;
  const a11y = {
    id,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || success || helper ? descId : undefined,
  };
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} success={success} id={id} descId={descId}>
      {icon ? (
        <div className="input-icon">
          <Icon name={icon} />
          <input {...a11y} {...inputProps} />
        </div>
      ) : prefix ? (
        <div className="prefix-input">
          <b aria-hidden="true">{prefix}</b>
          <input {...a11y} {...inputProps} />
        </div>
      ) : (
        <input {...a11y} {...inputProps} />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  required,
  helper,
  error,
  success,
  children,
  ...selectProps
}: FieldChrome & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const descId = `${id}-note`;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} success={success} id={id} descId={descId}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || success || helper ? descId : undefined}
        {...selectProps}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  required,
  helper,
  error,
  success,
  ...textareaProps
}: FieldChrome & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const descId = `${id}-note`;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} success={success} id={id} descId={descId}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || success || helper ? descId : undefined}
        {...textareaProps}
      />
    </FieldShell>
  );
}

export function FormActions({
  dirty,
  saving,
  onSave,
  onCancel,
  saveLabel = "Save changes",
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="form-actions">
      {dirty && !saving && (
        <span className="dirty-chip" role="status">
          <Icon name="info" size={13} /> Unsaved changes
        </span>
      )}
      <Button variant="secondary" onClick={onCancel} disabled={!dirty || saving}>
        Cancel
      </Button>
      <Button onClick={onSave} loading={saving} disabled={!dirty && !saving}>
        {saveLabel}
      </Button>
    </div>
  );
}
