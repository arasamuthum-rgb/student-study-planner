import { useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { Badge, Card, CardHeader, DemoBadge, EmptyState, PageHeader, SubjectChip } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/fields';
import { TimeGrid, type GridItem } from '../components/TimeGrid';
import { MonthGrid } from '../components/MonthGrid';
import { SessionActions } from '../components/SessionActions';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useOpenParam } from '../hooks/useOpenParam';
import { eventsOnDate, plannedMinutes, sessionMinutes, sessionsOnDate } from '../lib/stats';
import { fmtDate, fmtMinutes, timeToMin, toDateStr, weekDays } from '../lib/dates';
import { EVENT_COLOR, PRIORITY_LABEL } from '../lib/constants';
import type { StudySession } from '../types';

type View = 'day' | 'week' | 'month';

export default function Planner() {
  const { data } = useStore(); const ui = useUI();
  const [view, setView] = useState<View>('week'); const [cursor, setCursor] = useState(() => new Date());
  useOpenParam((id) => { const s = data.sessions.find((x) => x.id === id); if (s) setCursor(new Date(`${s.date}T00:00`)); ui.openForm('session', { id }); });
  const subj = (id: string) => data.subjects.find((s) => s.id === id);
  const first = data.prefs.firstDayOfWeek;
  const days = view === 'day' ? [cursor] : weekDays(cursor, first);
  const range: [Date, Date] = view === 'month' ? [startOfMonth(cursor), endOfMonth(cursor)] : [days[0], days[days.length - 1]];
  const label = view === 'day' ? format(cursor, 'EEEE, MMMM d, yyyy') : view === 'week' ? `${format(range[0], 'MMM d')} to ${format(range[1], 'MMM d, yyyy')}` : format(cursor, 'MMMM yyyy');
  const move = (dir: 1 | -1) => setCursor((c) => (view === 'day' ? addDays(c, dir) : view === 'week' ? addDays(c, 7 * dir) : addMonths(c, dir)));

  const inRange = useMemo(() => data.sessions.filter((s) => s.date >= toDateStr(range[0]) && s.date <= toDateStr(range[1])), [data.sessions, range[0].getTime(), range[1].getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const planned = inRange.filter((s) => s.status !== 'skipped').reduce((a, s) => a + plannedMinutes(s), 0);
  const actual = inRange.reduce((a, s) => a + sessionMinutes(s), 0);
  const counts = { done: inRange.filter((s) => s.status === 'completed').length, pending: inRange.filter((s) => s.status === 'pending').length, skipped: inRange.filter((s) => s.status === 'skipped').length };

  const itemsFor = (d: Date): GridItem[] => {
    const ds = toDateStr(d);
    const ses = sessionsOnDate(data.sessions, ds).map((s): GridItem => ({ id: s.id, start: s.start, end: s.end, title: s.topic, sub: subj(s.subjectId)?.name, color: subj(s.subjectId)?.color ?? '#94a3b8', muted: s.status === 'skipped', done: s.status === 'completed', kind: 'session', onClick: () => ui.openForm('session', { id: s.id }), label: `${s.topic}, ${subj(s.subjectId)?.name ?? ''}, ${s.start} to ${s.end}, ${s.status}. Edit session` }));
    const evs = eventsOnDate(data.events, ds).map((e): GridItem => ({ id: `e${e.id}`, start: e.start, end: e.end, title: e.title, sub: e.location, color: EVENT_COLOR[e.type], kind: 'event', onClick: () => ui.openForm('event', { id: e.id }), label: `${e.title}, class, ${e.start} to ${e.end}. Edit timetable entry` }));
    return [...evs, ...ses];
  };
  const times = data.sessions.flatMap((s) => [timeToMin(s.start), timeToMin(s.end)]).concat(data.events.flatMap((e) => [timeToMin(e.start), timeToMin(e.end)]));
  const fromHour = Math.max(0, Math.min(7, timeToMin(data.prefs.studyDayStart) / 60 | 0, ...times.map((t) => Math.floor(t / 60))));
  const toHour = Math.min(24, Math.max(22, ...times.map((t) => Math.ceil(t / 60))));
  const listDays = view === 'day' ? days : view === 'week' ? days : [];
  const listItems: Array<{ date: string; items: StudySession[] }> = listDays.map((d) => ({ date: toDateStr(d), items: sessionsOnDate(data.sessions, toDateStr(d)) })).filter((x) => x.items.length);

  return (
    <div>
      <PageHeader title="Study Planner" description="Schedule focused sessions and compare what you planned with what you did."
        actions={<><Button onClick={() => ui.openPlan()}><Sparkles className="h-4 w-4" />Suggest a schedule</Button><Button variant="primary" onClick={() => ui.openForm('session')}><Plus className="h-4 w-4" />Add session</Button></>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="iconSm" aria-label={`Previous ${view}`} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="iconSm" aria-label={`Next ${view}`} onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <h2 className="ml-1 text-[15px] font-semibold tracking-tight" aria-live="polite">{label}</h2>
        </div>
        <Segmented<View> label="Calendar view" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ l: 'Planned', v: fmtMinutes(planned), s: `${counts.pending + counts.done} sessions` }, { l: 'Actually studied', v: fmtMinutes(actual), s: `${counts.done} completed` },
          { l: 'Completion', v: planned ? `${Math.round((actual / planned) * 100)}%` : 'None planned', s: 'Studied vs planned time' }, { l: 'Skipped', v: String(counts.skipped), s: `${counts.pending} still pending` }].map((x) => (
          <Card key={x.l} as="div" className="px-4 py-3"><p className="text-xs text-muted">{x.l}</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{x.v}</p><p className="text-xs text-muted">{x.s}</p></Card>))}
      </div>

      <Card>
        {data.subjects.length === 0 ? <div className="p-5"><EmptyState icon={<CalendarClock />} title="Add a subject to start planning" body="Study sessions belong to a subject. Add one, then schedule your first session." action={<Button variant="primary" onClick={() => ui.openForm('subject')}>Add subject</Button>} /></div>
          : view === 'month' ? (
            <MonthGrid month={cursor} firstDay={first} onDayClick={(d) => { setCursor(d); setView('day'); }} dayLabel={(d) => `${format(d, 'EEEE, MMMM d')}, ${sessionsOnDate(data.sessions, toDateStr(d)).length} sessions. Open day view`}
              renderDay={(d) => { const ss = sessionsOnDate(data.sessions, toDateStr(d)); return <>{ss.slice(0, 3).map((s) => (
                <button key={s.id} type="button" onClick={() => ui.openForm('session', { id: s.id })} className="flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] hover:brightness-95" style={{ backgroundColor: `${subj(s.subjectId)?.color ?? '#94a3b8'}24` }} aria-label={`${s.topic}, ${s.start}, ${s.status}`}>
                  <span className={`truncate ${s.status === 'skipped' ? 'line-through opacity-60' : ''}`}>{s.start} {s.topic}</span></button>))}
                {ss.length > 3 && <button type="button" onClick={() => { setCursor(d); setView('day'); }} className="px-1.5 text-[11px] text-muted hover:text-fg">+{ss.length - 3} more</button>}</>; }} />
          ) : (
            <div className="p-2 sm:p-3"><TimeGrid days={days} itemsFor={itemsFor} fromHour={fromHour} toHour={toHour} onSlot={(d, time) => ui.openForm('session', { defaults: { date: toDateStr(d), start: time, end: `${String(Math.min(23, Number(time.slice(0, 2)) + 1)).padStart(2, '0')}:${time.slice(3)}` } })} /></div>
          )}
      </Card>
      {data.subjects.length > 0 && view !== 'month' && <p className="mt-2 text-xs text-muted">Tip: click an empty time slot to add a session there. Shaded blocks are classes from your timetable.</p>}

      {view !== 'month' && (
        <Card className="mt-4">
          <CardHeader title="Sessions in this period" subtitle="Mark sessions as you go to keep planned and actual time accurate." />
          <div className="p-3 pt-2">
            {listItems.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">No study sessions scheduled for this {view}.</p> : listItems.map((g) => (
              <div key={g.date} className="mb-2"><h3 className="px-2 pb-1 pt-2 text-xs font-medium text-muted">{fmtDate(g.date, 'EEEE, MMM d')}</h3>
                <ul>{g.items.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-sunken">
                    <button type="button" onClick={() => ui.openForm('session', { id: s.id })} className="min-w-0 text-left">
                      <p className={`truncate text-sm font-medium ${s.status === 'skipped' ? 'text-muted line-through' : ''}`}>{s.topic}</p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"><span className="tabular-nums">{s.start} to {s.end}</span><SubjectChip subject={subj(s.subjectId)} /><Badge tone={s.priority === 'high' ? 'bad' : s.priority === 'medium' ? 'warn' : 'neutral'}>{PRIORITY_LABEL[s.priority]}</Badge>
                        {s.status === 'completed' && <Badge tone="ok">Studied {fmtMinutes(sessionMinutes(s))}</Badge>}{s.status === 'skipped' && <Badge>Skipped</Badge>}{s.recurrenceGroupId && <Badge>Repeats</Badge>}{s.source === 'recommended' && <Badge tone="accent">Suggested</Badge>}{s.isDemo && <DemoBadge />}</p>
                    </button>
                    <SessionActions s={s} />
                  </li>))}</ul></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
