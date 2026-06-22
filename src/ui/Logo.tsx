// EDMO wordmark approximation — "EDMO" + Document Intelligence eyebrow,
// echoing the PRD header styling.
export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const main = variant === "light" ? "text-white" : "text-edmo-navy";
  const sub = variant === "light" ? "text-white/70" : "text-edmo-muted";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 text-base font-extrabold italic text-white shadow-sm ring-1 ring-purple-900/20">
        E
      </div>
      <div className="leading-none">
        <div className={`text-lg font-extrabold italic tracking-tight ${main}`}>EDMO</div>
        <div className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${sub}`}>
          Document Intelligence
        </div>
      </div>
    </div>
  );
}
