export const axis = { tick: { fill: 'var(--c-muted)', fontSize: 12 }, axisLine: false as const, tickLine: false as const };
export const grid = { stroke: 'var(--c-line)', strokeDasharray: '3 3', vertical: false as const };

interface TipProps { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string; fill?: string; payload?: Record<string, unknown> }>; label?: string | number; fmt?: (v: number, name?: string) => string }
export function ChartTip({ active, payload, label, fmt }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />{p.name}: <span className="font-medium text-fg">{fmt ? fmt(Number(p.value), p.name) : p.value}</span></p>
      ))}
    </div>
  );
}
