import { cn } from '../lib/cn';

export interface RailItem { id: string; start: string; end: string; label: string; color: string; kind: 'session' | 'class'; done?: boolean }
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const hourLabel = (h: number) => (h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`);

/** A one-glance picture of today: study blocks and classes laid along the clock, with a pin for the current time. */
export function DayRail({ items, from, to, nowMin }: { items: RailItem[]; from: string; to: string; nowMin: number }) {
  const lo = Math.min(toMin(from), ...items.map((i) => toMin(i.start)), 8 * 60);
  const hi = Math.max(toMin(to), ...items.map((i) => toMin(i.end)), 20 * 60);
  const startH = Math.max(0, Math.floor(lo / 60)); const endH = Math.min(24, Math.ceil(hi / 60));
  const span = (endH - startH) * 60;
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m - startH * 60) / span) * 100))}%`;
  const ticks: number[] = []; const step = endH - startH > 12 ? 3 : 2;
  for (let h = startH; h <= endH; h += step) ticks.push(h);
  const nowIn = nowMin >= startH * 60 && nowMin <= endH * 60;
  const sessions = items.filter((i) => i.kind === 'session').length;

  return (
    <div role="img" aria-label={`Today's timeline from ${hourLabel(startH)} to ${hourLabel(endH)}: ${sessions} study sessions and ${items.length - sessions} classes.`}>
      <div className="relative h-24 rounded-xl bg-sunken">
        {ticks.map((h) => <span key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h * 60) }} aria-hidden />)}
        {items.map((i, idx) => {
          const left = toMin(i.start); const w = Math.max(toMin(i.end) - left, 20);
          const wide = (w / span) > 0.1;
          return (
            <div key={i.id} className={cn('absolute overflow-hidden rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight', i.kind === 'session' ? 'text-white' : 'border border-line bg-surface text-muted', i.done && 'opacity-55')}
              style={{ left: pct(left), width: `calc(${pct(left + w)} - ${pct(left)} - 2px)`, top: i.kind === 'session' ? 8 : 52, height: i.kind === 'session' ? 38 : 32, ...(i.kind === 'session' ? { backgroundColor: i.color } : {}) }} aria-hidden data-idx={idx}>
              {wide && <span className="line-clamp-2">{i.label}</span>}
            </div>
          );
        })}
        {nowIn && (
          <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: pct(nowMin) }} aria-hidden>
            <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg" />
            <span className="marker absolute -top-2.5 left-1/2 -translate-x-1/2 rounded px-1.5 text-[10px] font-semibold leading-4 text-fg ring-1 ring-fg/20">Now</span>
          </div>
        )}
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-muted" aria-hidden>
        {ticks.map((h) => <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(h * 60) }}>{hourLabel(h)}</span>)}
      </div>
      <p className="mt-2 flex items-center gap-4 text-[11px] text-muted" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-accent" />Study sessions</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-line bg-surface" />Classes</span>
      </p>
    </div>
  );
}
