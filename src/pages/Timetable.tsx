import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { TimeGrid, type GridItem } from '../components/TimeGrid';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { eventsOnDate } from '../lib/stats';
import { fmtTime, timeToMin, toDateStr, weekDays } from '../lib/dates';
import { EVENT_COLOR, EVENT_LABEL } from '../lib/constants';
import type { EventType } from '../types';

export default function Timetable() {
  const { data } = useStore(); const ui = useUI();
  const wide = useMediaQuery('(min-width: 768px)');
  const [cursor, setCursor] = useState(() => new Date()); const [mobileDay, setMobileDay] = useState(() => toDateStr(new Date()));
  const days = useMemo(() => weekDays(cursor, data.prefs.firstDayOfWeek), [cursor, data.prefs.firstDayOfWeek]);
  const shown = wide ? days : days.filter((d) => toDateStr(d) === mobileDay).length ? days.filter((d) => toDateStr(d) === mobileDay) : [days[0]];
  const subj = (id: string) => data.subjects.find((s) => s.id === id);
  const itemsFor = (d: Date): GridItem[] => eventsOnDate(data.events, toDateStr(d)).map((e) => ({
    id: e.id, start: e.start, end: e.end, title: e.title, sub: [subj(e.subjectId)?.name, e.location].filter(Boolean).join(', '), color: EVENT_COLOR[e.type], kind: 'session' as const,
    onClick: () => ui.openForm('event', { id: e.id }), label: `${e.title}, ${EVENT_LABEL[e.type]}, ${fmtTime(e.start)} to ${fmtTime(e.end)}${e.repeat === 'weekly' ? ', repeats weekly' : ''}. Edit entry`,
  }));
  const times = data.events.flatMap((e) => [timeToMin(e.start), timeToMin(e.end)]);
  const fromHour = Math.max(0, Math.min(8, ...times.map((t) => Math.floor(t / 60)))); const toHour = Math.min(24, Math.max(18, ...times.map((t) => Math.ceil(t / 60))));
  const slot = (d: Date, time: string) => ui.openForm('event', { defaults: { weekday: d.getDay(), start: time } });
  const dayEvents = eventsOnDate(data.events, toDateStr(shown[0]));

  return (
    <div>
      <PageHeader title="Timetable" description="Your classes, labs and fixed commitments. The planner schedules study time around them." actions={<Button variant="primary" onClick={() => ui.openForm('event')}><Plus className="h-4 w-4" />Add entry</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="iconSm" aria-label="Previous week" onClick={() => setCursor((c) => addDays(c, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="iconSm" aria-label="Next week" onClick={() => setCursor((c) => addDays(c, 7))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => { setCursor(new Date()); setMobileDay(toDateStr(new Date())); }}>This week</Button>
          <h2 className="ml-1 text-[15px] font-semibold" aria-live="polite">{format(days[0], 'MMM d')} to {format(days[6], 'MMM d, yyyy')}</h2>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">{(Object.keys(EVENT_LABEL) as EventType[]).map((k) => <li key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EVENT_COLOR[k] }} aria-hidden />{EVENT_LABEL[k]}</li>)}</ul>
      </div>
      {!wide && <div className="mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Day of week">{days.map((d) => { const k = toDateStr(d); const sel = shown[0] && toDateStr(shown[0]) === k; return (
        <button key={k} role="tab" aria-selected={sel} type="button" onClick={() => setMobileDay(k)} className={`flex min-w-14 flex-col items-center rounded-xl border px-2 py-1.5 text-xs ${sel ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted'}`}><span>{format(d, 'EEE')}</span><span className="text-base font-semibold">{format(d, 'd')}</span></button>); })}</div>}
      {data.events.length === 0 ? <EmptyState icon={<CalendarDays />} title="Your timetable is empty" body="Add your lectures, labs and other regular commitments. Repeating entries show up every week." action={<Button variant="primary" onClick={() => ui.openForm('event')}>Add your first entry</Button>} /> : (<>
        <Card><div className="p-2 sm:p-3"><TimeGrid days={shown} itemsFor={itemsFor} fromHour={fromHour} toHour={toHour} onSlot={slot} minWidth={760} /></div></Card>
        {!wide && <ul className="mt-3 space-y-1.5" aria-label="Entries for the selected day">{dayEvents.length === 0 ? <li className="text-sm text-muted">Nothing scheduled on this day.</li> : dayEvents.map((e) => <li key={e.id}><button type="button" onClick={() => ui.openForm('event', { id: e.id })} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left text-sm"><span className="h-8 w-1 rounded-full" style={{ backgroundColor: EVENT_COLOR[e.type] }} /><span><span className="block font-medium">{e.title}</span><span className="text-xs text-muted">{fmtTime(e.start)} to {fmtTime(e.end)}{e.location && `, ${e.location}`}</span></span></button></li>)}</ul>}
        <p className="mt-2 text-xs text-muted">Click an empty slot to add an entry. Overlapping entries are shown side by side and you'll be warned when saving one.</p>
      </>)}
    </div>
  );
}
