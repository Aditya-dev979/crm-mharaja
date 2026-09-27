import { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/hooks/useAdmin";
import type { Branch } from "@/types";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
export const searchShortcut = isMac ? "⌘ K" : "Ctrl K";

export default function Header({
  pageName,
  activeBranch,
  unreadCount,
  quickOpen,
  branchOpen,
  userOpen,
  onMobileMenu,
  onOpenSearch,
  onToggleQuick,
  onOpenNotifications,
  onToggleBranch,
  onToggleUser,
  userName = "Arjun Sharma",
}: {
  pageName: string;
  activeBranch: Branch;
  unreadCount: number;
  quickOpen: boolean;
  branchOpen: boolean;
  userOpen: boolean;
  onMobileMenu: () => void;
  onOpenSearch: () => void;
  onToggleQuick: () => void;
  onOpenNotifications: () => void;
  onToggleBranch: () => void;
  onToggleUser: () => void;
  userName?: string;
}) {
  const { activeRole } = useAdmin();
  const initials = userName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" onClick={onMobileMenu} aria-label="Open navigation">
        <Icon name="menu" />
      </button>
      <div className="breadcrumbs" aria-label="Breadcrumb">
        <span>Maharaja Soap</span>
        <Icon name="arrow" size={13} />
        <strong>{pageName}</strong>
      </div>
      <button type="button" className="global-search" onClick={onOpenSearch}>
        <Icon name="search" />
        <span>Search customers, orders, SKUs...</span>
        <kbd>{searchShortcut}</kbd>
      </button>
      <div className="header-actions">
        <button
          type="button"
          className="quick-btn"
          onClick={onToggleQuick}
          aria-expanded={quickOpen}
          aria-haspopup="menu"
        >
          <Icon name="plus" />
          <span>Quick create</span>
          <Icon name="chevron" size={14} />
        </button>
        <IconButton
          label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="header-icon"
          onClick={onOpenNotifications}
        >
          <Icon name="bell" />
          {unreadCount > 0 && <i aria-hidden="true" />}
        </IconButton>
        <button
          type="button"
          className="branch-btn"
          onClick={onToggleBranch}
          aria-expanded={branchOpen}
          aria-haspopup="menu"
          aria-label={`Active branch: ${activeBranch.name}. Switch branch`}
        >
          <span className="branch-symbol"><Icon name="building" /></span>
          <span>
            <small>BRANCH</small>
            <strong>{activeBranch.name}</strong>
          </span>
          <Icon name="chevron" size={14} />
        </button>
        <button
          type="button"
          className="profile-btn"
          onClick={onToggleUser}
          aria-expanded={userOpen}
          aria-haspopup="menu"
          aria-label={`Account menu: ${userName}, ${activeRole}`}
        >
          <div className="avatar" aria-hidden="true">{initials}</div>
          <span>
            <strong>{userName.split(" ")[0]}</strong>
            <small>{activeRole}</small>
          </span>
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </header>
  );
}
