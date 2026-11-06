import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Clock, Flame, ListChecks, Target, TrendingUp } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Progress, Stat } from '../components/ui/misc';
import { Segmented } from '../components/ui/fields';
import { ChartTip, axis, grid } from '../components/charts/common';
import { useStore } from '../store/AppStore';
import { heatmap, minutesBySubject, plannedMinutes, productivityFor, sessionMinutes, streak, studyMinutesByDate, subjectPct, syllabusPct } from '../lib/stats';
import { fmtHours, fmtMinutes, toDateStr } from '../lib/dates';
import { WEEKDAYS } from '../lib/dates';

type Range = '7' | '30' | '90';

export default function Analytics() {
  const { data } = useStore(); const [range, setRange] = useState<Range>('30');
  const n = Number(range); const to = new Date(); const from = addDays(to, -(n - 1));
  const a = toDateStr(from), b = toDateStr(to);
  const m = useMemo(() => studyMinutesByDate(data), [data]);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => addDays(from, i)), [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = days.reduce((s, d) => s + (m.get(toDateStr(d)) ?? 0), 0);
  const st = streak(data);

  const trend = useMemo(() => {
    if (n <= 30) return days.map((d) => ({ label: format(d, n === 7 ? 'EEE' : 'MMM d'), hours: +((m.get(toDateStr(d)) ?? 0) / 60).toFixed(2) }));
    const w = new Map<string, number>(); days.forEach((d) => { const k = toDateStr(startOfWeek(d, { weekStartsOn: data.prefs.firstDayOfWeek })); w.set(k, (w.get(k) ?? 0) + (m.get(toDateStr(d)) ?? 0)); });
    return [...w.entries()].map(([k, v]) => ({ label: format(new Date(`${k}T00:00`), 'MMM d'), hours: +(v / 60).toFixed(2) }));
  }, [days, m, n, data.prefs.firstDayOfWeek]);

  const bySubject = useMemo(() => { const mm = minutesBySubject(data, from, to); return [...mm.entries()].map(([id, v]) => { const s = data.subjects.find((x) => x.id === id); return { name: s?.name ?? 'No subject', minutes: v, color: s?.color ?? '#94a3b8' }; }).sort((x, y) => y.minutes - x.minutes); }, [data, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionsIn = data.sessions.filter((s) => s.date >= a && s.date <= b && s.date <= toDateStr(addDays(to, 0)));
  const planned = sessionsIn.filter((s) => s.status !== 'skipped').reduce((s, x) => s + plannedMinutes(x), 0); const done = sessionsIn.reduce((s, x) => s + sessionMinutes(x), 0);
  const weekly = useMemo(() => { const w = new Map<string, { planned: number; done: number }>(); sessionsIn.forEach((s) => { const k = toDateStr(startOfWeek(new Date(`${s.date}T00:00`), { weekStartsOn: data.prefs.firstDayOfWeek })); const v = w.get(k) ?? { planned: 0, done: 0 }; if (s.status !== 'skipped') v.planned += plannedMinutes(s); v.done += sessionMinutes(s); w.set(k, v); }); return [...w.entries()].sort().map(([k, v]) => ({ label: format(new Date(`${k}T00:00`), 'MMM d'), Planned: +(v.planned / 60).toFixed(1), Completed: +(v.done / 60).toFixed(1) })); }, [sessionsIn, data.prefs.firstDayOfWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const tasksIn = data.tasks.filter((t) => t.dueDate >= a && t.dueDate <= b); const tasksDone = tasksIn.filter((t) => t.status === 'completed').length;
  const taskRate = tasksIn.length ? Math.round((tasksDone / tasksIn.length) * 100) : 0;
  const prod = useMemo(() => days.map((d) => ({ label: format(d, n === 7 ? 'EEE' : 'MMM d'), score: productivityFor(data, toDateStr(d)) })), [days, data, n]);
  const avgProd = prod.length ? Math.round(prod.reduce((s, p) => s + p.score, 0) / prod.length) : 0;
  const heat = useMemo(() => heatmap(data, from, to), [data, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const heatMax = Math.max(1, ...heat.flat()); const hourFrom = 6, hourTo = 24;
  const hasActivity = total > 0 || data.sessions.length > 0;
  const activeDays = days.filter((d) => (m.get(toDateStr(d)) ?? 0) > 0).length;

  return (
    <div>
      <PageHeader title="Study Analytics" description="Calculated from your sessions, focus timer and tasks. Nothing here is estimated unless it says so." actions={<Segmented<Range> label="Date range" value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />} />
      {data.hasDemo && <p className="mb-4 text-[13px] text-muted">These charts include sample data until you remove it in Settings.</p>}
      {!hasActivity ? <EmptyState icon={<BarChart3 />} title="No study activity yet" body="Complete a focus session or mark a planned session as done and your analytics will appear here." /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={<Clock />} label="Focused study time" value={fmtHours(total)} sub={`${activeDays} active days of ${n}, avg ${fmtMinutes(total / n)}/day`} />
            <Stat icon={<Target />} tone="ind" label="Planned vs completed" value={planned ? `${Math.min(999, Math.round((done / planned) * 100))}%` : 'None planned'} sub={`${fmtHours(done)} studied of ${fmtHours(planned)} planned`} />
            <Stat icon={<ListChecks />} tone="ok" label="Task completion" value={`${taskRate}%`} sub={`${tasksDone} of ${tasksIn.length} tasks due in this range`} />
            <Stat icon={<Flame />} tone="warn" label="Study streak" value={`${st.current} days`} sub={`Best streak ${st.best} days`} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader title={n > 30 ? 'Weekly study trend' : 'Daily study trend'} subtitle="Hours from focus timer and completed sessions" />
              <div className="h-64 px-3 pb-3 pt-4" role="img" aria-label={`Study hours trend over the last ${n} days, ${fmtHours(total)} in total`}><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid {...grid} /><XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} /><YAxis {...axis} unit="h" /><Tooltip cursor={{ fill: 'var(--c-line)', opacity: 0.4 }} content={<ChartTip fmt={(v) => `${v}h`} />} /><Bar dataKey="hours" name="Studied" fill="var(--c-accent)" radius={[5, 5, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div></Card>
            <Card><CardHeader title="Time by subject" subtitle="Share of study time" />
              {bySubject.length === 0 ? <p className="p-5 text-sm text-muted">No study time in this range.</p> : (<>
                <div className="h-44" role="img" aria-label={`Study time by subject: ${bySubject.map((s) => `${s.name} ${fmtHours(s.minutes)}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={bySubject} dataKey="minutes" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">{bySubject.map((s) => <Cell key={s.name} fill={s.color} />)}</Pie><Tooltip content={<ChartTip fmt={(v) => fmtMinutes(v)} />} /></PieChart></ResponsiveContainer></div>
                <ul className="space-y-1.5 px-5 pb-4">{bySubject.map((s) => <li key={s.name} className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />{s.name}</span><span className="tabular-nums text-muted">{fmtHours(s.minutes)}, {Math.round((s.minutes / Math.max(1, total)) * 100)}%</span></li>)}</ul></>)}</Card>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card><CardHeader title="Planned vs completed study time" subtitle="Hours per week, from planner sessions" />
              <div className="h-60 px-3 pb-3 pt-4" role="img" aria-label="Planned versus completed study hours per week">{weekly.length === 0 ? <p className="p-4 text-sm text-muted">No planner sessions in this range.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid {...grid} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} unit="h" /><Tooltip cursor={{ fill: 'var(--c-line)', opacity: 0.4 }} content={<ChartTip fmt={(v) => `${v}h`} />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Planned" fill="var(--c-ind)" opacity={0.45} radius={[5, 5, 0, 0]} maxBarSize={22} /><Bar dataKey="Completed" fill="var(--c-accent)" radius={[5, 5, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer>}</div></Card>
            <Card><CardHeader title="Productivity trend" subtitle="Estimated score from study time and tasks" action={<Badge tone="ind">Estimated, avg {avgProd}%</Badge>} />
              <div className="h-60 px-3 pb-3 pt-4" role="img" aria-label={`Estimated daily productivity, average ${avgProd} percent`}><ResponsiveContainer width="100%" height="100%"><LineChart data={prod} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid {...grid} /><XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} /><YAxis {...axis} domain={[0, 100]} unit="%" /><Tooltip content={<ChartTip fmt={(v) => `${v}%`} />} /><Line type="monotone" dataKey="score" name="Score" stroke="var(--c-ind)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader title="Weekly activity heatmap" subtitle="When you study, by weekday and hour (minutes, based on session start time)" />
              <div className="relative overflow-x-auto p-5 pt-4"><table className="w-full min-w-[600px] table-fixed border-separate border-spacing-[3px] text-[11px]">
                <caption className="sr-only">Study minutes by weekday and hour of day</caption>
                <thead><tr><td className="w-10" />{Array.from({ length: hourTo - hourFrom }, (_, i) => <th key={i} scope="col" className="overflow-visible whitespace-nowrap text-left font-normal text-muted">{(hourFrom + i) % 3 === 0 ? format(new Date(2000, 0, 1, hourFrom + i), 'ha').toLowerCase() : ''}</th>)}</tr></thead>
                <tbody>{[1, 2, 3, 4, 5, 6, 0].map((wd) => <tr key={wd}><th scope="row" className="pr-2 text-right font-normal text-muted">{WEEKDAYS[wd].slice(0, 3)}</th>{Array.from({ length: hourTo - hourFrom }, (_, i) => { const v = heat[wd][hourFrom + i]; return <td key={i} title={`${WEEKDAYS[wd]} ${hourFrom + i}:00, ${Math.round(v)} min`} className="h-5 rounded" style={{ backgroundColor: v ? `rgb(var(--accent) / ${0.15 + 0.85 * (v / heatMax)})` : 'rgb(var(--sunken))' }}><span className="sr-only">{Math.round(v)} minutes</span></td>; })}</tr>)}</tbody></table>
                <p className="mt-2 text-xs text-muted">Darker means more study time. Busiest slot: {heatMax > 1 ? fmtMinutes(heatMax) : 'no data yet'}.</p></div></Card>
            <Card><CardHeader title="Syllabus completion" subtitle={`${syllabusPct(data.subjects.filter((s) => !s.archived))}% of all topics done`} />
              <ul className="space-y-3.5 p-5 pt-4">{data.subjects.filter((s) => !s.archived).map((s) => <li key={s.id}><div className="mb-1 flex justify-between text-[13px]"><span>{s.name}</span><span className="tabular-nums text-muted">{s.completedTopics}/{s.totalTopics}</span></div><Progress label={`${s.name} syllabus`} value={subjectPct(s)} color={s.color} /></li>)}{data.subjects.length === 0 && <li className="text-sm text-muted">Add subjects to track syllabus progress.</li>}</ul></Card>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted"><TrendingUp className="h-3.5 w-3.5" aria-hidden />Study time counts completed planner sessions plus focus timer sessions, so doing both for the same hour counts it twice. Range: {differenceInCalendarDays(to, from) + 1} days.</p>
        </div>
      )}
    </div>
  );
}
