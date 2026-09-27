import { useState } from "react";
import Drawer from "@/components/feedback/Drawer";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import type { NotificationItem } from "@/types";
import { cn } from "@/utils";

const tabs = ["All", "Approvals", "Mentions"] as const;
type Tab = (typeof tabs)[number];

export default function NotificationCenter({
  open,
  onClose,
  notifications,
  onNotificationsChange,
  onViewAll,
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onNotificationsChange: (items: NotificationItem[]) => void;
  onViewAll?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("All");
  const toast = useToast();

  const filtered = notifications.filter(n => {
    if (tab === "Approvals") return n.category === "approval";
    if (tab === "Mentions") return n.category === "mention";
    return true;
  });

  const count = (t: Tab) =>
    t === "All"
      ? notifications.length
      : notifications.filter(n => n.category === (t === "Approvals" ? "approval" : "mention")).length;

  const markRead = (id: string) => {
    onNotificationsChange(notifications.map(n => (n.id === id ? { ...n, unread: false } : n)));
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="NOTIFICATION CENTRE"
      title="Updates"
      className="notification-drawer"
      footer={
        <>
          <button
            type="button"
            className="link-btn"
            onClick={() => onNotificationsChange(notifications.map(n => ({ ...n, unread: false })))}
          >
            Mark all as read
          </button>
          <Button
            variant="secondary"
            onClick={() => {
              if (onViewAll) {
                onClose();
                onViewAll();
              } else {
                toast({ tone: "info", title: "Notification archive", message: "The full centre arrives in a later phase." });
              }
            }}
          >
            View all notifications
          </Button>
        </>
      }
    >
      <div className="notify-tabs" role="tablist" aria-label="Notification filters">
        {tabs.map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t} {count(t) > 0 && <b>{count(t)}</b>}
          </button>
        ))}
      </div>
      <div className="notifications">
        {filtered.length === 0 && (
          <div className="notify-empty">
            <Icon name="bell" />
            <strong>All caught up</strong>
            <span>No {tab.toLowerCase()} notifications right now.</span>
          </div>
        )}
        {filtered.map(n => (
          <button key={n.id} type="button" className={cn(n.unread && "unread")} onClick={() => markRead(n.id)}>
            <span className={cn("notify-icon", `is-${n.category}`)}><Icon name={n.icon} /></span>
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <small>
                {n.category === "approval" && <b className="notify-prio">Needs a decision</b>}
                {n.category === "alert" && <b className="notify-prio alert">Attention</b>}
                {n.time}
              </small>
            </div>
            {n.unread && <i aria-label="Unread" />}
          </button>
        ))}
      </div>
    </Drawer>
  );
}
