import { searchShortcut } from "@/components/layout/Header";
import Icon from "@/components/ui/Icon";
import { quickCreateItems } from "@/data/mockData";
import useEscapeKey from "@/hooks/useEscapeKey";

export default function QuickCreate({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (label: string) => void;
}) {
  useEscapeKey(onClose, open);
  if (!open) return null;
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="popover quick-pop" role="menu" aria-label="Quick create">
        <div className="popover-head">
          <div>
            <p>QUICK CREATE</p>
            <strong>Start something new</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close quick create">
            <Icon name="close" />
          </button>
        </div>
        <div className="quick-grid">
          {quickCreateItems.map(item => (
            <button key={item.label} type="button" role="menuitem" onClick={() => onAction(item.label)}>
              <span><Icon name={item.icon} /></span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="popover-foot">
          Press <kbd>{searchShortcut}</kbd> to search, then create from anywhere
        </div>
      </div>
    </>
  );
}
