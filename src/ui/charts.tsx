// Dependency-free inline-SVG charts for the Billing dashboard. Colors are
// drawn from the EDMO design system palette (purple + academic gold). Each
// chart is responsive via viewBox and degrades gracefully with no data.

export interface Point {
  label: string;
  value: number;
}

const fmt = (n: number) => n.toLocaleString();

// --- Bar chart ------------------------------------------------------------
export function BarChart({
  data,
  height = 200,
  valuePrefix = "",
  color = "#5B2B74", // EDMO Purple
}: {
  data: Point[];
  height?: number;
  valuePrefix?: string;
  color?: string;
}) {
  if (!data.length) return null;
  const W = 640;
  const padX = 8;
  const padTop = 24;
  const padBottom = 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (W - padX * 2) / data.length;
  const barW = Math.min(slot * 0.62, 46);
  const plotH = height - padTop - padBottom;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Monthly bar chart">
      {[0.25, 0.5, 0.75, 1].map((g) => {
        const y = padTop + plotH * (1 - g);
        return <line key={g} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#E8E3EE" strokeWidth={1} />;
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * plotH;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + plotH - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx={5} fill={color} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="fill-edmo-ink" fontSize={11} fontWeight={700}>
              {valuePrefix}
              {fmt(d.value)}
            </text>
            <text x={x + barW / 2} y={height - 9} textAnchor="middle" className="fill-edmo-muted" fontSize={10}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Area / line trend ----------------------------------------------------
export function AreaChart({
  data,
  height = 200,
  valuePrefix = "",
  color = "#E6B53A", // Academic Gold
}: {
  data: Point[];
  height?: number;
  valuePrefix?: string;
  color?: string;
}) {
  if (!data.length) return null;
  const W = 640;
  const padX = 36;
  const padTop = 20;
  const padBottom = 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const plotH = height - padTop - padBottom;
  const stepX = (W - padX * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: padX + stepX * i,
    y: padTop + plotH * (1 - d.value / max),
    d,
  }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${padTop + plotH} L${pts[0].x},${padTop + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Spend trend">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g) => {
        const y = padTop + plotH * (1 - g);
        return (
          <g key={g}>
            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#E8E3EE" strokeWidth={1} />
            <text x={4} y={y + 3} className="fill-edmo-muted" fontSize={9}>
              {valuePrefix}
              {fmt(Math.round(max * g))}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => (
        <g key={p.d.label}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
          <text x={p.x} y={height - 9} textAnchor="middle" className="fill-edmo-muted" fontSize={10}>
            {p.d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// --- Donut ----------------------------------------------------------------
export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, size = 160 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2;
  const stroke = size * 0.16;
  const radius = r - stroke / 2;
  const circ = 2 * Math.PI * radius;
  const GAP = 3;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut SVG — centered */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="Channel split"
      >
        <g transform={`rotate(-90 ${r} ${r})`}>
          <circle cx={r} cy={r} r={radius} fill="none" stroke="#EFECF3" strokeWidth={stroke} />
          {slices.map((s) => {
            const len = Math.max((s.value / total) * circ - GAP, 0);
            const seg = (
              <circle
                key={s.label}
                cx={r}
                cy={r}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-(offset + GAP / 2)}
                strokeLinecap="round"
              />
            );
            offset += (s.value / total) * circ;
            return seg;
          })}
        </g>
        <text x={r} y={r + 4} textAnchor="middle" className="fill-edmo-ink" fontSize={20} fontWeight={800}>
          {fmt(total)}
        </text>
        <text x={r} y={r + 18} textAnchor="middle" className="fill-edmo-muted" fontSize={10}>
          total
        </text>
      </svg>

      {/* Legend — each slice is a full-width row */}
      <div className="flex flex-col w-full divide-y divide-edmo-line">
        {slices.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={s.label} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-sm font-semibold text-edmo-ink">{s.label}</span>
                <span className="ml-auto text-sm font-extrabold" style={{ color: s.color }}>{pct}%</span>
                <span className="text-xs text-edmo-muted w-16 text-right">{fmt(s.value)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: "#EFECF3" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




