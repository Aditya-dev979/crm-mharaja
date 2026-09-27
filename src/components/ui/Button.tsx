import Spinner from "@/components/ui/Spinner";
import { cn } from "@/utils";

export type ButtonVariant = "primary" | "secondary" | "gold" | "danger" | "success" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  full?: boolean;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  full = false,
  loading = false,
  disabled,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("btn", variant, full && "full", loading && "is-loading", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, children, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cn("icon-btn", className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
