import Icon from "@/components/ui/Icon";
import useEscapeKey from "@/hooks/useEscapeKey";
import useFocusTrap from "@/hooks/useFocusTrap";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";
import { cn } from "@/utils";

export default function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  className,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className={cn("drawer", className)} role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <div>
            {eyebrow && <p>{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close panel">
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}
