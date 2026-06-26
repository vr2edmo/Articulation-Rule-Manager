import { useMemo } from "react";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import { COST_PER_TRANSCRIPT } from "@/domain/seed";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState, Notice } from "@/ui/components";
import { BarChart, AreaChart, Donut } from "@/ui/charts";
import { IconDownload } from "@/ui/icons";
import { downloadCsv } from "@/domain/fileio";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(key: string): string {
  const [, m] = key.split("-");
  return MONTH_NAMES[Number(m) - 1] ?? key;
}
const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  });

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "purple" | "gold" }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-edmo-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-extrabold tracking-tight ${
          accent === "gold" ? "text-gold-600" : "text-edmo-navy"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-edmo-muted">{sub}</div>}
    </div>
  );
}

export default function BillingPage() {
  const { activeUniversity } = useSession();
  const snap = useStoreSnapshot();

  const usage = useMemo(
    () => (activeUniversity ? store.getUsage(activeUniversity.id) : []),
    [snap, activeUniversity],
  );

  const totals = useMemo(() => {
    const transcripts = usage.reduce((s, m) => s + m.transcripts, 0);
    const current = usage[usage.length - 1];
    const prev = usage[usage.length - 2];
    const channel = usage.reduce(
      (acc, m) => ({
        email: acc.email + m.by_channel.email,
        upload: acc.upload + m.by_channel.upload,
        api: acc.api + m.by_channel.api,
      }),
      { email: 0, upload: 0, api: 0 },
    );
    const avg = usage.length ? Math.round(transcripts / usage.length) : 0;
    const momPct =
      current && prev && prev.transcripts ? Math.round(((current.transcripts - prev.transcripts) / prev.transcripts) * 100) : 0;
    return { transcripts, current, channel, avg, momPct, totalCost: transcripts * COST_PER_TRANSCRIPT };
  }, [usage]);

  if (!activeUniversity) return null;

  function exportCsv() {
    const rows = usage.map((m) => [
      monthLabel(m.month),
      m.month,
      String(m.transcripts),
      String(m.by_channel.email),
      String(m.by_channel.upload),
      String(m.by_channel.api),
      String(m.transcripts * COST_PER_TRANSCRIPT),
    ]);
    rows.push(["TOTAL", "", String(totals.transcripts), "", "", "", String(totals.totalCost)]);
    downloadCsv(
      `${activeUniversity!.short_name}-billing.csv`,
      ["Month", "Period", "Transcripts", "Email", "Upload", "API", "Cost (USD)"],
      rows,
    );
  }

  if (!usage.length) {
    return (
      <div>
        <PageHeader title="Billing" subtitle="Usage and expenses for your institution." />
        <div className="card">
          <EmptyState title="No usage yet" body="Once EDMO begins processing transcripts for your institution, your usage and costs will appear here." />
        </div>
      </div>
    );
  }

  const barData = usage.map((m) => ({ label: monthLabel(m.month), value: m.transcripts }));
  const spendData = usage.map((m) => ({ label: monthLabel(m.month), value: m.transcripts * COST_PER_TRANSCRIPT }));

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle={`Transcript processing usage and expenses for ${activeUniversity.short_name}.`}
        actions={
          <button className="btn-secondary" onClick={exportCsv}>
            <IconDownload width={16} height={16} /> Export CSV
          </button>
        }
      />

      <Notice tone="info">
        Billing is a simple <span className="font-bold">flat {usd(COST_PER_TRANSCRIPT)} per transcript</span> processed —
        no seats, no tiers. The figures below cover the last {usage.length} months.
      </Notice>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total transcripts" value={totals.transcripts.toLocaleString()} sub={`${usage.length}-month total`} />
        <KpiCard label="Cost per transcript" value={usd(COST_PER_TRANSCRIPT)} sub="Flat rate" />
        <KpiCard label="Total cost" value={usd(totals.totalCost)} sub="To date" accent="gold" />
        <KpiCard
          label="This month"
          value={usd(totals.current.transcripts * COST_PER_TRANSCRIPT)}
          sub={`${totals.current.transcripts.toLocaleString()} transcripts · ${totals.momPct >= 0 ? "+" : ""}${totals.momPct}% MoM`}
        />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-edmo-ink">Transcripts processed per month</h3>
          <p className="mb-2 text-xs text-edmo-muted">Avg {totals.avg.toLocaleString()} / month</p>
          <BarChart data={barData} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-edmo-ink">Spend trend</h3>
          <p className="mb-2 text-xs text-edmo-muted">Monthly cost at {usd(COST_PER_TRANSCRIPT)} / transcript</p>
          <AreaChart data={spendData} valuePrefix="$" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-edmo-ink">Intake channel</h3>
          <Donut
            slices={[
              { label: "Email", value: totals.channel.email, color: "#5B2B74" },
              { label: "Upload", value: totals.channel.upload, color: "#9C63BC" },
              { label: "API", value: totals.channel.api, color: "#E6B53A" },
            ]}
          />
        </div>

        {/* Monthly breakdown */}
        <div className="card overflow-hidden">
          <div className="border-b border-edmo-line px-5 py-3">
            <h3 className="text-sm font-bold text-edmo-ink">Monthly breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edmo-line bg-edmo-bg/70 text-left">
                <th className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">Month</th>
                <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-edmo-muted">Transcripts</th>
                <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-edmo-muted">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((m) => (
                <tr key={m.month} className="border-b border-edmo-line/70">
                  <td className="px-5 py-2.5 font-bold text-edmo-ink">{monthLabel(m.month)} {m.month.split("-")[0]}</td>
                  <td className="px-5 py-2.5 text-right text-edmo-muted">{m.transcripts.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-edmo-muted">{usd(m.transcripts * COST_PER_TRANSCRIPT)}</td>
                </tr>
              ))}
              <tr className="bg-edmo-bg/50">
                <td className="px-5 py-2.5 font-extrabold text-edmo-navy">Total</td>
                <td className="px-5 py-2.5 text-right font-extrabold text-edmo-navy">{totals.transcripts.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right font-extrabold text-edmo-navy">{usd(totals.totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
