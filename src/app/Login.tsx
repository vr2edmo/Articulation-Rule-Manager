import { useState } from "react";
import { useSession } from "./session";
import { USERS } from "@/domain/seed";
import { Logo } from "@/ui/Logo";

// V1 auth is email + password, EDMO-provisioned (PRD F13). Real password
// verification is deferred with SSO to V2; this prototype accepts the seeded
// accounts. Quick-pick buttons make the demo fast.
export default function Login() {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.length < 1) {
      setError("Invalid credentials. Use one of the provisioned accounts below.");
      return;
    }
    login(user.id);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-edmo-hero px-4">
      {/* Academic Gold orb — echoes the design system hero specimen */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-edmo-gold/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo variant="light" />
        </div>
        <div className="card p-7 shadow-hero">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-edmo-gold/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-edmo-gold" />
            Supercharged admissions
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-edmo-navy">Sign in</h1>
          <p className="mt-1 text-sm text-edmo-muted">
            Articulation Rules Manager &amp; Course Catalog Manager
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="registrar@university.edu"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm font-bold text-status-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">
            Demo accounts (any password)
          </p>
          <div className="space-y-1.5">
            {USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                className="flex w-full items-center justify-between rounded-md bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20"
              >
                <span>
                  <span className="font-bold">{u.name}</span>
                  <span className="ml-2 text-white/60">{u.email}</span>
                </span>
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold">
                  {u.role === "EDMO_ADMIN" ? "EDMO Admin" : "University"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
