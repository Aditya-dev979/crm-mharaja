import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedAudit, seedStaff, seedTasks, seedTeamNotifications, TODAY_DAY } from "@/data/teamData";
import type { AuditRecord, StaffMember, TaskItem, TeamNotification } from "@/types";

interface TeamStore {
  staff: StaffMember[];
  tasks: TaskItem[];
  teamNotifications: TeamNotification[];
  audit: AuditRecord[];
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  addStaff: (draft: Omit<StaffMember, "id" | "active" | "since">) => StaffMember;
  addTask: (draft: Omit<TaskItem, "id" | "status" | "created">) => TaskItem;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  markNotification: (id: string, unread: boolean) => void;
  markAllNotificationsRead: () => void;
  addNotification: (draft: Omit<TeamNotification, "id" | "time" | "unread">) => void;
  logAudit: (entry: Omit<AuditRecord, "id" | "time" | "device" | "ip">) => void;
}

const TeamContext = createContext<TeamStore | null>(null);

export function useTeam(): TeamStore {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used inside TeamProvider");
  return ctx;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffMember[]>(seedStaff);
  const [tasks, setTasks] = useState<TaskItem[]>(seedTasks);
  const [teamNotifications, setTeamNotifications] = useState<TeamNotification[]>(seedTeamNotifications);
  const [audit, setAudit] = useState<AuditRecord[]>(seedAudit);
  const taskCounter = useRef(2619);
  const auditCounter = useRef(2633);
  const staffCounter = useRef(7);

  const updateStaff = useCallback((id: string, patch: Partial<StaffMember>) => {
    setStaff(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addStaff = useCallback<TeamStore["addStaff"]>(draft => {
    const full: StaffMember = { ...draft, id: `stf-${String(staffCounter.current++).padStart(2, "0")}`, active: true, since: "2026" };
    setStaff(list => [...list, full]);
    return full;
  }, []);

  const addTask = useCallback<TeamStore["addTask"]>(draft => {
    const full: TaskItem = {
      ...draft,
      id: `TSK-${taskCounter.current++}`,
      status: draft.dueDay < TODAY_DAY ? "Overdue" : "Pending",
      created: "Just now",
    };
    setTasks(list => [full, ...list]);
    return full;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>) => {
    setTasks(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const markNotification = useCallback((id: string, unread: boolean) => {
    setTeamNotifications(list => list.map(n => (n.id === id ? { ...n, unread } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setTeamNotifications(list => list.map(n => ({ ...n, unread: false })));
  }, []);

  const notifCounter = useRef(19);
  const addNotification = useCallback<TeamStore["addNotification"]>(draft => {
    setTeamNotifications(list => [{ ...draft, id: `tn-${notifCounter.current++}`, time: "Just now", unread: true }, ...list]);
  }, []);

  const logAudit = useCallback<TeamStore["logAudit"]>(entry => {
    setAudit(list => [
      {
        ...entry,
        id: `aud-${auditCounter.current++}`,
        time: "Just now",
        device: "Chrome · Windows 11",
        ip: "103.68.16.44",
      },
      ...list,
    ]);
  }, []);

  const value = useMemo(
    () => ({ staff, tasks, teamNotifications, audit, updateStaff, addStaff, addTask, updateTask, markNotification, markAllNotificationsRead, addNotification, logAudit }),
    [staff, tasks, teamNotifications, audit, updateStaff, addStaff, addTask, updateTask, markNotification, markAllNotificationsRead, addNotification, logAudit],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}
