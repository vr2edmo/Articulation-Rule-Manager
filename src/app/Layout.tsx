import { NavLink, useLocation } from "react-router-dom";
import { useSession } from "./session";
import { Logo } from "@/ui/Logo";
import { IconCatalog, IconRules, IconAudit, IconLogout, IconChevron } from "@/ui/icons";
import type { ReactNode } from "react";

const navItems = [
  { to: "/catalog", label: "Course Catalog", icon: IconCatalog, note: "Layer 0" },
  { to: "/rules", label: "Articulation Rules", icon: IconRules, note: "Layer 1" },
  { to: "/audit", label: "Activity Log", icon: IconAudit, note: "" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, activeUniversity, universities, setActiveUniversity, logout } = useSession();
  const loc = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-edmo-line bg-white">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-5">
            <Logo />
            <span className="hidden h-6 w-px bg-edmo-line sm:block" />
            <span className="hidden text-sm font-bold text-edmo-muted sm:block">
              Articulation Rules Manager
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* EDMO admins choose which university they are viewing */}
            {user?.role === "EDMO_ADMIN" ? (
              <label className="flex items-center gap-2 text-sm">
                <span className="font-bold text-edmo-muted">Viewing:</span>
                <select
                  className="input w-auto py-1.5"
                  value={activeUniversity?.id}
                  onChange={(e) => setActiveUniversity(e.target.value)}
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="hidden text-sm font-bold text-edmo-ink md:block">
                {activeUniversity?.name}
              </span>
            )}

            <div className="flex items-center gap-3 border-l border-edmo-line pl-4">
              <div className="text-right leading-tight">
                <div className="text-sm font-bold text-edmo-ink">{user?.name}</div>
                <div className="text-xs text-edmo-muted">
                  {user?.role === "EDMO_ADMIN" ? "EDMO Admin" : "University Admin"}
                </div>
              </div>
              <button onClick={logout} title="Sign out" className="text-edmo-muted hover:text-edmo-ink">
                <IconLogout />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar nav */}
        <aside className="w-60 shrink-0 border-r border-edmo-line bg-white px-3 py-5">
          {user?.role === "EDMO_ADMIN" && (
            <div className="mb-3 rounded-md bg-edmo-blue-50 px-3 py-2 text-xs font-bold text-edmo-navy">
              Read-context: viewing partner data as EDMO Admin
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = loc.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition-colors ${
                    active ? "bg-edmo-navy text-white" : "text-edmo-ink hover:bg-edmo-blue-50"
                  }`}
                >
                  <Icon width={18} height={18} />
                  <span className="flex-1">{item.label}</span>
                  {item.note && (
                    <span className={`text-[10px] font-bold ${active ? "text-white/60" : "text-edmo-muted"}`}>
                      {item.note}
                    </span>
                  )}
                  {active && <IconChevron width={14} height={14} />}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-edmo-line bg-edmo-bg p-3">
            <p className="text-xs font-bold text-edmo-navy">Onboarding sequence</p>
            <ol className="mt-2 space-y-1.5 text-xs text-edmo-muted">
              <li>1 · Publish your catalog</li>
              <li>2 · Upload your rules</li>
              <li>3 · Promote AI matches</li>
            </ol>
            <p className="mt-2 text-[11px] leading-snug text-edmo-muted">
              Rules can only target courses that exist in your published catalog.
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-x-hidden px-7 py-6">{children}</main>
      </div>
    </div>
  );
}
