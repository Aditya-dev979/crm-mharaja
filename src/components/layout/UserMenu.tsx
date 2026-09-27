import Badge from "@/components/ui/Badge";
import Icon, { type IconName } from "@/components/ui/Icon";
import { allRoles } from "@/data/adminData";
import useEscapeKey from "@/hooks/useEscapeKey";
import { seedStaff } from "@/data/teamData";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import type { StaffRole } from "@/types";

const items: Array<[IconName, string]> = [
  ["user", "My profile"],
  ["settings", "Preferences"],
  ["help", "Help & support"],
  ["logout", "Sign out"],
];

export default function UserMenu({
  open,
  onClose,
  onItem,
}: {
  open: boolean;
  onClose: () => void;
  onItem: (label: string) => void;
}) {
  const { activeRole, setActiveRole, currentUser } = useAdmin();
  const staffEmail = seedStaff.find(m => m.name === currentUser)?.email ?? "accounts@maharajasoap.in";
  const toast = useToast();
  useEscapeKey(onClose, open);
  if (!open) return null;
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="popover user-pop" role="menu" aria-label="Account menu">
        <div className="user-summary">
          <div className="avatar large" aria-hidden="true">AS</div>
          <div>
            <strong>{currentUser}</strong>
            <span>{staffEmail}</span>
            <Badge tone="royal">{activeRole}</Badge>
          </div>
        </div>
        {/* The role preview lives here as well as in Settings, so a role without
            Settings access can still switch back. */}
        <label className="role-switch user-role-switch">
          <span>PREVIEW AS ROLE</span>
          <select
            value={activeRole}
            aria-label="Preview the workspace as another role"
            onChange={e => {
              const role = e.target.value as StaffRole;
              setActiveRole(role);
              toast({ tone: "info", title: `Previewing as ${role}`, message: "Navigation and actions now follow that role's permissions." });
            }}
          >
            {allRoles.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        {items.map(([icon, label]) => (
          <button key={label} type="button" role="menuitem" onClick={() => onItem(label)}>
            <Icon name={icon} />
            <span>{label}</span>
            {label !== "Sign out" && <Icon name="arrow" size={14} />}
          </button>
        ))}
      </div>
    </>
  );
}
