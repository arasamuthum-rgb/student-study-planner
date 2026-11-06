import type { ReactNode } from 'react';
import { addDays, endOfMonth, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import { cn } from '../lib/cn';
import { weekStart } from '../lib/dates';

interface Props { month: Date; firstDay: number; renderDay: (d: Date) => ReactNode; onDayClick?: (d: Date) => void; dayLabel?: (d: Date) => string }

/** Accessible month calendar: day numbers are buttons, content chips are siblings so interactive elements never nest. */
export function MonthGrid({ month, firstDay, renderDay, onDayClick, dayLabel }: Props) {
  const start = weekStart(startOfMonth(month), firstDay); const end = endOfMonth(month);
  const days: Date[] = []; for (let d = start; d <= end || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  const head = days.slice(0, 7);
  return (
    <div role="grid" aria-label={format(month, 'MMMM yyyy')} className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div role="row" className="grid grid-cols-7 border-b border-line">
          {head.map((d) => <div key={d.getDay()} role="columnheader" className="px-2 py-2 text-xs font-medium text-muted">{format(d, 'EEE')}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, month); const today = isSameDay(d, new Date());
            return (
              <div key={i} role="gridcell" className={cn('min-h-[6.5rem] border-b border-r border-line p-1.5', i % 7 === 0 && 'border-l-0', !inMonth && 'bg-sunken/50')}>
                <button type="button" onClick={() => onDayClick?.(d)} aria-label={dayLabel ? dayLabel(d) : format(d, 'EEEE, MMMM d')} aria-current={today ? 'date' : undefined}
                  className={cn('mb-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium hover:bg-sunken', today && 'bg-accent text-accent-fg hover:bg-accent', !inMonth && !today && 'text-muted/60')}>{format(d, 'd')}</button>
                <div className="space-y-1">{renderDay(d)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
