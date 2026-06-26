import { useSession } from "@/app/session";
import { PageHeader } from "@/ui/PageHeader";
import { Notice } from "@/ui/components";
import { IconAnalytics } from "@/ui/icons";

// Placeholder. The existing standalone Analytics product will be folded in
// here; until then this tab states intent and previews the planned sections.
const PLANNED = [
  { title: "Transfer outcomes", body: "Approval / partial / no-credit rates over time, by source institution." },
  { title: "Processing throughput", body: "Transcripts processed, turnaround time, and queue depth." },
  { title: "AI match quality", body: "Suggestion acceptance rate and confidence distribution." },
  { title: "Catalog & rule coverage", body: "Unmatched-rule trend and published-catalog completeness." },
];

export default function AnalyticsPage() {
  const { activeUniversity } = useSession();
  if (!activeUniversity) return null;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Insight into transfer outcomes, processing throughput, and AI match quality for your institution."
      />

      <Notice tone="info">
        <span className="font-bold">Coming soon.</span> EDMO&apos;s standalone Analytics is being integrated
        directly into this workspace. The sections below outline what will live here.
      </Notice>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANNED.map((s) => (
          <div key={s.title} className="card flex items-start gap-3 p-5 opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-edmo-blue-50 text-edmo-navy">
              <IconAnalytics width={20} height={20} />
            </div>
            <div>
              <p className="font-bold text-edmo-ink">{s.title}</p>
              <p className="mt-0.5 text-sm text-edmo-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-edmo-line bg-white/50 px-6 py-14 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-edmo-blue-50 text-edmo-navy">
            <IconAnalytics width={24} height={24} />
          </div>
          <p className="text-base font-bold text-edmo-ink">Dashboards land here next</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-edmo-muted">
            Once integrated, your existing Analytics reports will render in this tab, scoped to{" "}
            {activeUniversity.short_name}.
          </p>
        </div>
      </div>
    </div>
  );
}
