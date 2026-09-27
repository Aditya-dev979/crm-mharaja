import useEscapeKey from "@/hooks/useEscapeKey";
import useFocusTrap from "@/hooks/useFocusTrap";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";
import { cn } from "@/utils";

export default function Modal({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;
  return (
    <div
      className="overlay-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className={cn("modal", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
