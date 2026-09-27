import Icon from "@/components/ui/Icon";
import { branches } from "@/data/mockData";
import useEscapeKey from "@/hooks/useEscapeKey";
import { cn } from "@/utils";

export default function BranchSelector({
  open,
  activeBranchId,
  onSelect,
  onClose,
}: {
  open: boolean;
  activeBranchId: string;
  onSelect: (branchId: string) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose, open);
  if (!open) return null;
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="popover branch-pop" role="menu" aria-label="Switch workspace branch">
        <div className="popover-head">
          <div>
            <p>ACTIVE BRANCH</p>
            <strong>Switch workspace</strong>
          </div>
        </div>
        {branches.map(branch => {
          const active = branch.id === activeBranchId;
          return (
            <button
              key={branch.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={cn("branch-option", active && "selected")}
              onClick={() => onSelect(branch.id)}
            >
              <span><Icon name="building" /></span>
              <div>
                <strong>{branch.name}</strong>
                <small>{branch.area}</small>
              </div>
              {active && <Icon name="check" />}
            </button>
          );
        })}
        <div className="popover-foot">Stock and pricing may vary by branch</div>
      </div>
    </>
  );
}
