import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CurrentUser, University } from "@/domain/types";
import { UNIVERSITIES, USERS } from "@/domain/seed";

interface SessionValue {
  user: CurrentUser | null;
  /** The university whose data is currently in view. For EDMO admins this is selectable. */
  activeUniversity: University | null;
  universities: University[];
  login: (userId: string) => void;
  logout: () => void;
  setActiveUniversity: (id: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const SESSION_KEY = "edmo_arm_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [adminUniversityId, setAdminUniversityId] = useState<string>(UNIVERSITIES[0].id);

  const value = useMemo<SessionValue>(() => {
    const user = USERS.find((u) => u.id === userId) ?? null;
    let activeUniversity: University | null = null;
    if (user) {
      if (user.role === "EDMO_ADMIN") {
        activeUniversity = UNIVERSITIES.find((u) => u.id === adminUniversityId) ?? null;
      } else {
        activeUniversity = UNIVERSITIES.find((u) => u.id === user.university_id) ?? null;
      }
    }
    return {
      user,
      activeUniversity,
      universities: UNIVERSITIES,
      login: (id) => {
        localStorage.setItem(SESSION_KEY, id);
        setUserId(id);
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        setUserId(null);
      },
      setActiveUniversity: (id) => setAdminUniversityId(id),
    };
  }, [userId, adminUniversityId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
