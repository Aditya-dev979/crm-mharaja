import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { defaultRolePermissions, seedLoginEvents, seedSessions, seedSettings } from "@/data/adminData";
import { seedStaff } from "@/data/teamData";
import type { LoginEvent, LoginSession, PermissionKey, RolePermissionMatrix, SettingsSection, StaffRole } from "@/types";

interface AdminStore {
  rolePermissions: Record<StaffRole, RolePermissionMatrix>;
  loginEvents: LoginEvent[];
  sessions: LoginSession[];
  settings: SettingsSection[];
  /** The role the workspace currently acts as — drives nav and action visibility. */
  activeRole: StaffRole;
  setActiveRole: (role: StaffRole) => void;
  /** Name of the signed-in person for the active role. Actions stamp this on
      audit entries and ownership fields instead of hard-coding a name. */
  currentUser: string;
  /** Centralized permission check for the active role. */
  can: (module: string, permission: PermissionKey) => boolean;
  /** Numeric business-control threshold from Settings → Business Controls. */
  getControl: (key: string, fallback: number) => number;
  togglePermission: (role: StaffRole, module: string, permission: PermissionKey) => void;
  resetRole: (role: StaffRole) => void;
  revokeSession: (id: string) => void;
  updateSetting: (sectionId: string, key: string, value: string | boolean) => void;
}

const AdminContext = createContext<AdminStore | null>(null);

export function useAdmin(): AdminStore {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

const cloneMatrix = (matrix: RolePermissionMatrix): RolePermissionMatrix =>
  Object.fromEntries(Object.entries(matrix).map(([m, perms]) => [m, [...perms]]));

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [rolePermissions, setRolePermissions] = useState<Record<StaffRole, RolePermissionMatrix>>(
    () => Object.fromEntries(Object.entries(defaultRolePermissions).map(([r, m]) => [r, cloneMatrix(m)])) as Record<StaffRole, RolePermissionMatrix>,
  );
  const [loginEvents] = useState<LoginEvent[]>(seedLoginEvents);
  const [sessions, setSessions] = useState<LoginSession[]>(seedSessions);
  const [settings, setSettings] = useState<SettingsSection[]>(seedSettings);
  const [activeRole, setActiveRole] = useState<StaffRole>("Approving Manager");

  /* Who the workspace is acting as. Falls back to the account owner for roles
     with no dedicated staff member. */
  const currentUser = useMemo(
    () => seedStaff.find(s => s.role === activeRole && s.active)?.name ?? "Arjun Sharma",
    [activeRole],
  );

  const can = useCallback(
    (module: string, permission: PermissionKey) => rolePermissions[activeRole]?.[module]?.includes(permission) ?? false,
    [rolePermissions, activeRole],
  );

  const getControl = useCallback(
    (key: string, fallback: number) => {
      const section = settings.find(s => s.id === "business-controls");
      const raw = section?.fields.find(f => f.key === key)?.value;
      const parsed = parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
      return Number.isNaN(parsed) ? fallback : parsed;
    },
    [settings],
  );

  const togglePermission = useCallback((role: StaffRole, module: string, permission: PermissionKey) => {
    setRolePermissions(prev => {
      const current = prev[role][module] ?? [];
      const next = current.includes(permission) ? current.filter(p => p !== permission) : [...current, permission];
      return { ...prev, [role]: { ...prev[role], [module]: next } };
    });
  }, []);

  const resetRole = useCallback((role: StaffRole) => {
    setRolePermissions(prev => ({ ...prev, [role]: cloneMatrix(defaultRolePermissions[role]) }));
  }, []);

  const revokeSession = useCallback((id: string) => {
    setSessions(list => list.filter(s => s.id !== id));
  }, []);

  const updateSetting = useCallback((sectionId: string, key: string, value: string | boolean) => {
    setSettings(list =>
      list.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.map(f => (f.key === key ? { ...f, value } : f)) }
          : section,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ rolePermissions, loginEvents, sessions, settings, activeRole, setActiveRole, currentUser, can, getControl, togglePermission, resetRole, revokeSession, updateSetting }),
    [rolePermissions, loginEvents, sessions, settings, activeRole, currentUser, can, getControl, togglePermission, resetRole, revokeSession, updateSetting],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
