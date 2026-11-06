import { useEffect, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { minToTime, timeToMin } from '../lib/dates';

export interface GridItem { id: string; start: string; end: string; title: string; sub?: string; color: string; onClick: () => void; muted?: boolean; done?: boolean; kind?: 'session' | 'event'; label: string }
interface Props { days: Date[]; itemsFor: (d: Date) => GridItem[]; fromHour: number; toHour: number; onSlot?: (d: Date, time: string) => void; minWidth?: number }
const H = 52;

function lanes(items: GridItem[]): Array<{ it: GridItem; lane: number; of: number }> {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const out: Array<{ it: GridItem; lane: number; of: number }> = []; let cluster: typeof out = []; let clusterEnd = -1;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => { c.of = n; }); out.push(...cluster); cluster = []; };
  for (const it of sorted) {
    const s = timeToMin(it.start), e = timeToMin(it.end);
    if (s >= clusterEnd && cluster.length) { flush(); clusterEnd = -1; }
    const used = new Set(cluster.filter((c) => timeToMin(c.it.end) > s).map((c) => c.lane)); let lane = 0; while (used.has(lane)) lane++;
    cluster.push({ it, lane, of: 1 }); clusterEnd = Math.max(clusterEnd, e);
  }
  flush(); return out;
}

/** Hour-by-day grid. Items are real buttons; clicking an empty area calls onSlot with the clicked hour. */
export function TimeGrid({ days, itemsFor, fromHour, toHour, onSlot, minWidth = 720 }: Props) {
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? minWidth : undefined }}>
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => { const today = isSameDay(d, now); return (
            <div key={d.toISOString()} className="px-2 py-2 text-center" aria-current={today ? 'date' : undefined}>
              <p className={cn('text-xs', today ? 'font-semibold text-accent' : 'text-muted')}>{format(d, 'EEE')}</p>
              <p className={cn('mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-medium', today && 'bg-accent text-accent-fg')}>{format(d, 'd')}</p>
            </div>); })}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div aria-hidden>{hours.map((h) => <div key={h} style={{ height: H }} className="pr-2 text-right text-[11px] text-muted"><span className="relative -top-2">{format(new Date(2000, 0, 1, h), 'h a')}</span></div>)}</div>
          {days.map((d) => {
            const items = lanes(itemsFor(d).filter((i) => timeToMin(i.end) > fromHour * 60 && timeToMin(i.start) < toHour * 60)); const today = isSameDay(d, now);
            return (
              <div key={d.toISOString()} className={cn('relative border-l border-line', today && 'bg-accent/[0.03]')} style={{ height: H * hours.length }}
                onClick={(e) => { if (!onSlot || e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); const mins = Math.floor((e.clientY - r.top) / H) * 60 + fromHour * 60; onSlot(d, minToTime(Math.min(mins, 23 * 60))); }}>
                {hours.map((h, i) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: i * H }} aria-hidden />)}
                {today && nowMin >= fromHour * 60 && nowMin <= toHour * 60 && <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - fromHour * 60) / 60) * H }} aria-hidden><span className="-ml-1 h-2 w-2 rounded-full bg-bad" /><span className="h-px flex-1 bg-bad" /></div>}
                {items.map(({ it, lane, of }) => {
                  const top = ((Math.max(timeToMin(it.start), fromHour * 60) - fromHour * 60) / 60) * H; const h = Math.max(22, ((Math.min(timeToMin(it.end), toHour * 60) - Math.max(timeToMin(it.start), fromHour * 60)) / 60) * H - 2);
                  return (
                    <button key={it.id} type="button" onClick={it.onClick} aria-label={it.label}
                      className={cn('absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight transition hover:brightness-95 hover:shadow-card focus-visible:z-20', it.muted && 'opacity-60', it.kind === 'event' && 'bg-sunken')}
                      style={{ top, height: h, left: `calc(${(lane / of) * 100}% + 2px)`, width: `calc(${100 / of}% - 4px)`, borderLeftColor: it.color, backgroundColor: it.kind === 'event' ? undefined : `${it.color}24` }}>
                      <span className={cn('flex items-center gap-1 font-medium', it.muted && 'line-through')}>{it.done && <Check className="h-3 w-3 shrink-0 text-ok" aria-hidden />}<span className="truncate">{it.title}</span></span>
                      {h > 34 && it.sub && <span className="block truncate text-muted">{it.sub}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
