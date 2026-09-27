import { useState } from "react";
import { navGroups, type NavItem, type PageId } from "@/components/layout/navigation";
import Brand from "@/components/ui/Brand";
import Icon from "@/components/ui/Icon";
import { pagePermissionModule } from "@/data/adminData";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/utils";

const itemKey = (item: NavItem) => item.key ?? item.id;

export default function Sidebar({
  page,
  activeNavKey,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  onOpenAccount,
}: {
  page: PageId;
  activeNavKey: string | null;
  onNavigate: (page: PageId, tab?: string, navKey?: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Opens the same account menu the topbar avatar uses. */
  onOpenAccount?: () => void;
}) {
  const { activeRole, can, currentUser } = useAdmin();

  /* Only groups the active role can actually use are rendered. */
  const groups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const module = pagePermissionModule[item.id];
        return !module || can(module, "View");
      }),
    }))
    .filter(group => group.items.length > 0);

  const groupOf = (key: string | null) =>
    groups.find(g => g.items.some(i => itemKey(i) === key))?.label ??
    groups.find(g => g.items.some(i => i.id === page))?.label ??
    groups[0]?.label;

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const active = groupOf(activeNavKey);
    return active ? [active] : [];
  });

  const toggleGroup = (label: string) =>
    setOpenGroups(list => (list.includes(label) ? list.filter(l => l !== label) : [...list, label]));

  const isOpen = (label: string) => openGroups.includes(label) || groupOf(activeNavKey) === label;

  const isActive = (item: NavItem) =>
    activeNavKey ? itemKey(item) === activeNavKey : item.id === page && !item.tab;

  return (
    <aside className={cn("sidebar", collapsed && "collapsed", mobileOpen && "mobile-open")}>
      <div className="sidebar-top">
        <Brand compact={collapsed} />
        <button
          type="button"
          className="collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <Icon name="arrow" />
        </button>
        <button type="button" className="mobile-close" onClick={onMobileClose} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      </div>

      <div className="phase-label">
        {!collapsed && (
          <>
            <span>PLANT</span>
            <strong>Vapi · Gujarat</strong>
            <small>Soap &amp; personal care</small>
          </>
        )}
        <i aria-hidden="true"><Icon name="factory" size={16} /></i>
      </div>

      <nav aria-label="Main navigation">
        {groups.map(group => {
          const open = isOpen(group.label);
          const single = group.items.length === 1;
          return (
            <div className="nav-group" key={group.label}>
              {!collapsed && !single && (
                <button
                  type="button"
                  className={cn("nav-group-head", open && "open")}
                  aria-expanded={open}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span>{group.label}</span>
                  <Icon name="chevron" size={13} />
                </button>
              )}
              {(open || collapsed || single) &&
                group.items.map(item => (
                  <button
                    key={itemKey(item)}
                    type="button"
                    className={isActive(item) ? "active" : ""}
                    aria-current={isActive(item) ? "page" : undefined}
                    onClick={() => onNavigate(item.id, item.tab, itemKey(item))}
                    title={item.label}
                  >
                    <Icon name={item.icon} />
                    {!collapsed && <span>{item.label}</span>}
                    {item.badge && !collapsed && <small>{item.badge}</small>}
                  </button>
                ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button
          type="button"
          aria-label={`Account: ${currentUser}, ${activeRole}`}
          aria-haspopup="menu"
          onClick={() => { onMobileClose(); onOpenAccount?.(); }}
        >
          <div className="avatar" aria-hidden="true">AS</div>
          {!collapsed && (
            <span>
              <strong>{currentUser}</strong>
              <small>{activeRole}</small>
            </span>
          )}
          {!collapsed && <Icon name="more" />}
        </button>
      </div>
    </aside>
  );
}
