import { useMemo, useState } from "react";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import { PageHeader } from "@/ui/PageHeader";
import { BarChart, AreaChart } from "@/ui/charts";

// Custom premium SVG Icons
const IconDoc = () => (
  <svg className="text-purple-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconClock = () => (
  <svg className="text-emerald-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconPeople = () => (
  <svg className="text-amber-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconCheckCircle = () => (
  <svg className="text-emerald-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(key: string): string {
  const [, m] = key.split("-");
  return MONTH_NAMES[Number(m) - 1] ?? key;
}

export default function AnalyticsPage() {
  const { activeUniversity } = useSession();
  const snap = useStoreSnapshot();

  const [leadingType, setLeadingType] = useState<"university" | "program">("university");

  const usage = useMemo(
    () => (activeUniversity ? store.getUsage(activeUniversity.id) : []),
    [snap, activeUniversity]
  );

  const totalTranscripts = useMemo(() => {
    return usage.reduce((sum, m) => sum + m.transcripts, 0);
  }, [usage]);

  // Transcripts Processed barData matching Billing counterpart exactly
  const barData = useMemo(() => {
    return usage.map((m) => ({ label: monthLabel(m.month), value: m.transcripts }));
  }, [usage]);

  // Supervisor changes trend: starts high, decays as system learns, but correlates with monthly transcript volume
  const supervisorChangesData = useMemo(() => {
    return usage.map((m, i) => {
      const learningFactor = 0.45 * Math.pow(0.72, i);
      const value = Math.round(m.transcripts * learningFactor);
      return {
        label: monthLabel(m.month),
        value
      };
    });
  }, [usage]);

  // Leading data split for the bottom horizontal chart
  const leadingData = useMemo(() => {
    if (leadingType === "university") {
      return [
        { label: "San Diego Community College", val: 23 },
        { label: "Central Texas College", val: 10 },
        { label: "Grossmont-cuyamaca College", val: 8 },
        { label: "American Council on Education", val: 7 },
        { label: "University of Phoenix", val: 5 },
        { label: "Southern New Hampshire Univ.", val: 5 },
        { label: "University of Maryland", val: 5 },
        { label: "Palomar College", val: 5 },
        { label: "The University of Texas", val: 4 },
        { label: "Grand Canyon University", val: 4 },
      ];
    } else {
      return [
        { label: "B.S. in Computer Science", val: 28 },
        { label: "B.A. in Business Administration", val: 18 },
        { label: "A.S. in Biology", val: 15 },
        { label: "B.S. in Information Technology", val: 11 },
        { label: "A.A. in General Studies", val: 9 },
        { label: "B.S. in Nursing", val: 7 },
        { label: "B.S. in Mechanical Engineering", val: 5 },
        { label: "A.S. in Psychology", val: 4 },
        { label: "B.A. in History", val: 2 },
        { label: "B.A. in Communication", val: 1 },
      ];
    }
  }, [leadingType]);

  if (!activeUniversity) return null;

  // Pie/Donut splits with high contrasting brand colors (EDMO Purple vs Academic Gold)
  const ruleCount = Math.round(totalTranscripts * 0.957);
  const aiPct = 34;
  const rulePct = 66;

  // Donut values for Success vs failure rate
  const successCount = Math.round(totalTranscripts * 0.23);
  const failedCount = Math.round(totalTranscripts * 0.02);
  const pendingCount = totalTranscripts - successCount - failedCount;

  // Radial calculation (Circumference of r=54 is 339.29)
  const circ = 339.29;
  const successStroke = (successCount / totalTranscripts) * circ;
  const failedStroke = (failedCount / totalTranscripts) * circ;

  return (
    <div className="pb-8">
      <PageHeader
        title="Analytics"
        subtitle="Real-time insight into transfer outcomes, queue processing metrics, and AI matching accuracy."
      />

      {/* KPI Section */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Transcripts */}
        <div className="card flex items-center justify-between p-5 bg-white shadow-sm border border-edmo-line">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-edmo-muted block mb-1">
              Total Transcripts Processed
            </span>
            <span className="text-3xl font-extrabold text-edmo-navy">{totalTranscripts.toLocaleString()}</span>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-50">
            <IconDoc />
          </div>
        </div>

        {/* KPI 2: Time Per Transcript */}
        <div className="card flex items-center justify-between p-5 bg-white shadow-sm border border-edmo-line">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-edmo-muted block mb-1">
              Time Per Transcript
            </span>
            <span className="text-3xl font-extrabold text-edmo-navy">26 mins</span>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-50">
            <IconClock />
          </div>
        </div>

        {/* KPI 3: Faculty Review */}
        <div className="card flex items-center justify-between p-5 bg-white shadow-sm border border-edmo-line">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-edmo-muted block mb-1">
              Courses for Faculty Review (per transcript)
            </span>
            <span className="text-3xl font-extrabold text-edmo-navy">5.00</span>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-amber-50">
            <IconPeople />
          </div>
        </div>

        {/* KPI 4: Avg Credits */}
        <div className="card flex items-center justify-between p-5 bg-white shadow-sm border border-edmo-line">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-edmo-muted block mb-1">
              Avg. Credit Transferred/Transcript
            </span>
            <span className="text-3xl font-extrabold text-edmo-navy">45</span>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-50">
            <IconCheckCircle />
          </div>
        </div>
      </div>

      {/* Row 1: Transcripts Processed & EDMO AI vs Articulation Rules */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Column Bar Chart (reusing Billing counterpart) */}
        <div className="card p-5 bg-white shadow-sm border border-edmo-line lg:col-span-2">
          <h3 className="text-sm font-bold text-edmo-ink">Transcripts Processed</h3>
          <p className="mb-4 text-xs text-edmo-muted">Monthly transcript processing volume</p>
          <div className="pt-2">
            <BarChart data={barData} />
          </div>
        </div>

        {/* Donut Chart: EDMO AI vs Articulation Rules with High Contrast Brand Colors */}
        <div className="card p-5 bg-white shadow-sm border border-edmo-line flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-edmo-ink mb-6">EDMO AI vs Articulation Rules</h3>
            <div className="flex justify-center items-center h-44">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="50" fill="none" stroke="#e2e8f0" strokeWidth="22" />
                {/* Articulation Rules slice (EDMO Purple) */}
                <circle
                  cx="75"
                  cy="75"
                  r="50"
                  fill="none"
                  stroke="#5B2B74"
                  strokeWidth={22}
                  strokeDasharray={`${(rulePct / 100) * 314} 314`}
                  strokeDashoffset="0"
                  transform="rotate(-90 75 75)"
                  strokeLinecap="round"
                />
                {/* EDMO AI slice (Academic Gold) */}
                <circle
                  cx="75"
                  cy="75"
                  r="50"
                  fill="none"
                  stroke="#E6B53A"
                  strokeWidth={22}
                  strokeDasharray={`${(aiPct / 100) * 314} 314`}
                  strokeDashoffset={-((rulePct / 100) * 314)}
                  transform="rotate(-90 75 75)"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-semibold text-edmo-ink">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5B2B74]" />
              Articulation Rules ({rulePct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E6B53A]" />
              EDMO AI ({aiPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Success Rate & Supervisor Changes */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Success / Failure Radial/Donut */}
        <div className="card p-5 bg-white shadow-sm border border-edmo-line flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-edmo-ink mb-4">Success vs failure rate for transcript uploads</h3>
            <div className="flex justify-center items-center h-48">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {/* Track */}
                <circle cx="80" cy="80" r="54" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                {/* Success slice */}
                <circle
                  cx="80"
                  cy="80"
                  r="54"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeDasharray={`${successStroke} 339`}
                  strokeDashoffset="0"
                  transform="rotate(-90 80 80)"
                  strokeLinecap="round"
                />
                {/* Failure slice */}
                <circle
                  cx="80"
                  cy="80"
                  r="54"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={`${failedStroke} 339`}
                  strokeDashoffset={-successStroke}
                  transform="rotate(-90 80 80)"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs font-semibold text-edmo-ink flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
              Successful ({Math.round((successCount / totalTranscripts) * 100)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              Failed ({Math.round((failedCount / totalTranscripts) * 100)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f1f5f9] border border-edmo-line" />
              Pending ({Math.round((pendingCount / totalTranscripts) * 100)}%)
            </span>
          </div>
        </div>

        {/* Supervisor Changes Area Chart */}
        <div className="card p-5 bg-white shadow-sm border border-edmo-line lg:col-span-2">
          <h3 className="text-sm font-bold text-edmo-ink">Supervisor Changes Trend</h3>
          <p className="mb-4 text-xs text-edmo-muted">Manual changes made by supervisors over time</p>
          <div className="pt-2">
            <AreaChart data={supervisorChangesData} color="#f97316" />
          </div>
        </div>
      </div>

      {/* Row 3: Leading Universities & Programs */}
      <div className="mt-5 card p-5 bg-white shadow-sm border border-edmo-line">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-edmo-ink">
            Leading {leadingType === "university" ? "Universities" : "Programs"} by Credit Transfers Accepted
          </h3>
          <select
            className="input py-1 px-3 w-32 text-xs"
            value={leadingType}
            onChange={(e) => setLeadingType(e.target.value as "university" | "program")}
          >
            <option value="university">University</option>
            <option value="program">Program</option>
          </select>
        </div>

        <div className="flex flex-col gap-3.5 mt-2">
          {leadingData.map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              {/* Institution/Program Label */}
              <div className="w-56 sm:w-64 shrink-0 text-sm font-bold text-edmo-navy truncate">
                {item.label}
              </div>
              
              {/* Horizontal Bar Track */}
              <div className="flex-1 h-3 rounded-full bg-[#f1f5f9] overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.val / 40) * 100}%`, background: "#5B2B74" }}
                />
              </div>

              {/* Value Label */}
              <div className="w-10 text-right text-sm font-extrabold text-edmo-ink shrink-0">
                {item.val}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
