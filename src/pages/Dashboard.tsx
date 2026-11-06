import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { BookOpen, CalendarClock, CheckCircle2, Clock, Flame, GraduationCap, Play, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, Progress, StatCell, StatStrip, SubjectChip, DemoBadge } from '../components/ui/misc';
import { DayRail, type RailItem } from '../components/DayRail';
import { Button } from '../components/ui/Button';
import { SessionActions } from '../components/SessionActions';
import { ChartTip, axis, grid } from '../components/charts/common';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useTimer } from '../store/TimerContext';
import { eventsOnDate, isOverdue, plannedMinutes, priorityTasks, productivityFor, sessionsOnDate, streak, studyMinutesByDate, subjectPct, taskStats, upcomingDeadlines } from '../lib/stats';
import { fmtDate, fmtHours, fmtMinutes, fmtTime, relativeDue, toDateStr, todayStr, weekDays } from '../lib/dates';
import { EVENT_COLOR, PRIORITY_LABEL } from '../lib/constants';

export default function Dashboard() {
  const { data, toggleTask } = useStore(); const ui = useUI(); const timer = useTimer();
  const today = todayStr(); const p = data.prefs;
  const subj = (id: string) => data.subjects.find((s) => s.id === id);
  const m = useMemo(() => studyMinutesByDate(data), [data]);
  const week = useMemo(() => weekDays(new Date(), p.firstDayOfWeek), [p.firstDayOfWeek]);
  const weekData = week.map((d) => ({ day: format(d, 'EEE'), hours: +((m.get(toDateStr(d)) ?? 0) / 60).toFixed(2), today: toDateStr(d) === today }));
  const weekMin = week.reduce((a, d) => a + (m.get(toDateStr(d)) ?? 0), 0);
  const ts = useMemo(() => taskStats(data.tasks), [data.tasks]);
  const st = useMemo(() => streak(data), [data]);
  const prod = productivityFor(data, today);
  const todaySessions = sessionsOnDate(data.sessions, today); const todayClasses = eventsOnDate(data.events, today);
  const schedule = [...todaySessions.map((s) => ({ k: 'session' as const, start: s.start, s })), ...todayClasses.map((e) => ({ k: 'event' as const, start: e.start, e }))].sort((a, b) => a.start.localeCompare(b.start));
  const prio = priorityTasks(data, 5); const deadlines = upcomingDeadlines(data, 7);
  const subjects = data.subjects.filter((s) => !s.archived);
  const pendingToday = todaySessions.filter((s) => s.status === 'pending').length;
  const dailyGoalH = p.weeklyGoalHours / 7;
  const empty = data.subjects.length === 0;
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const firstName = data.profile.name.trim().split(' ')[0];
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const endMin = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
  const nextSession = [...todaySessions].filter((x) => x.status === 'pending' && endMin(x.end) > nowMin).sort((a, b) => a.start.localeCompare(b.start))[0];
  const railItems: RailItem[] = [
    ...todaySessions.map((x) => ({ id: x.id, start: x.start, end: x.end, label: x.topic, color: subj(x.subjectId)?.color ?? '#94a3b8', kind: 'session' as const, done: x.status !== 'pending' })),
    ...todayClasses.map((e) => ({ id: e.id, start: e.start, end: e.end, label: e.title, color: EVENT_COLOR[e.type], kind: 'class' as const })),
  ];
  const noActivity = (m.get(today) ?? 0) === 0 && prod === 0;
  const demo = (isDemo?: boolean) => (isDemo ? <DemoBadge /> : null);

  return (
    <div className="space-y-5">
      <section aria-labelledby="today-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          <div className="flex min-w-0 flex-col">
            <p className="text-sm text-muted">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <h1 id="today-title" className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{format(new Date(), 'EEEE, MMM d')}</h1>
            <p className="mt-2 text-sm text-muted">{pendingToday ? `${pendingToday} study session${pendingToday > 1 ? 's' : ''} left today.` : 'No study sessions left today.'} {ts.overdue > 0 && <span className="font-medium text-bad">{ts.overdue} task{ts.overdue > 1 ? 's are' : ' is'} overdue.</span>}</p>
            <div className="mt-5 rounded-xl border border-line p-3.5">
              {nextSession ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs text-muted">Up next, {fmtTime(nextSession.start)}</p><p className="truncate text-sm font-semibold">{nextSession.topic}</p><SubjectChip subject={subj(nextSession.subjectId)} /></div>
                  <Button variant="primary" onClick={() => { if (timer.status === 'idle') timer.setSubject(nextSession.subjectId); ui.setFocusOpen(true); }}><Play className="h-4 w-4" />{timer.status === 'idle' ? 'Start focusing' : 'Open timer'}</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold">{schedule.length ? 'You\'re clear for the rest of today' : 'Nothing planned yet'}</p><p className="text-xs text-muted">{schedule.length ? 'Add another session or take the evening off.' : 'Let the planner find slots around your classes.'}</p></div>
                  <Button variant="primary" onClick={() => ui.openPlan()}><Sparkles className="h-4 w-4" />Suggest a schedule</Button>
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 self-center pt-3"><DayRail items={railItems} from={p.studyDayStart} to={p.studyDayEnd} nowMin={nowMin} /></div>
        </div>
      </section>

      {empty && <EmptyState icon={<BookOpen />} title="Start by adding your first subject" body="Subjects organise your sessions, tasks and exams. Once you add one, this dashboard fills in with your real progress." action={<Button variant="primary" onClick={() => ui.openForm('subject')}>Add subject</Button>} />}

      <StatStrip>
        <StatCell icon={<Clock />} label="Study time this week" value={fmtHours(weekMin)} sub={<><span>of {p.weeklyGoalHours}h goal</span><Progress className="mt-2" thin label="Weekly goal progress" value={(weekMin / (p.weeklyGoalHours * 60)) * 100} /></>} />
        <StatCell icon={<CheckCircle2 />} tone="ok" label="Tasks completed" value={<>{ts.done}<span className="text-base font-normal text-muted"> / {ts.total}</span></>} sub={`${ts.open} pending${ts.overdue ? `, ${ts.overdue} overdue` : ''}`} />
        <StatCell icon={<Flame />} tone="warn" label="Study streak" value={`${st.current} ${st.current === 1 ? 'day' : 'days'}`} sub={`Best: ${st.best} days. Counts days with 15+ minutes.`} />
        <StatCell icon={<TrendingUp />} tone="ind" label="Today's productivity" value={noActivity ? '—' : `${prod}%`} sub={noActivity ? 'Updates as you study or finish tasks today.' : <><span>Estimated from study time and tasks</span><Progress className="mt-2" thin color="rgb(var(--ind))" label="Productivity" value={prod} /></>} />
      </StatStrip>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's schedule" subtitle={format(new Date(), 'EEEE, MMMM d')} action={<Link to="/planner" className="text-[13px] font-medium text-accent hover:underline">Open planner</Link>} />
          <div className="p-5 pt-3">
            {schedule.length === 0 ? <EmptyState icon={<CalendarClock />} title="Nothing scheduled today" body="Block out a focused session, or let the planner suggest slots around your classes." action={<div className="flex gap-2"><Button onClick={() => ui.openForm('session')}>Schedule a session</Button><Button variant="primary" onClick={() => ui.openPlan()}><Sparkles className="h-4 w-4" />Suggest a schedule</Button></div>} /> : (
              <ol className="relative space-y-2 before:absolute before:bottom-2 before:left-[4.9rem] before:top-2 before:w-px before:bg-line">
                {schedule.map((it) => {
                  const color = it.k === 'session' ? subj(it.s.subjectId)?.color ?? '#94a3b8' : EVENT_COLOR[it.e.type];
                  return (
                    <li key={it.k + (it.k === 'session' ? it.s.id : it.e.id)} className="flex items-center gap-3">
                      <span className="w-[4.1rem] shrink-0 text-right text-xs tabular-nums text-muted">{fmtTime(it.start)}</span>
                      <span className="z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-surface" style={{ backgroundColor: color }} aria-hidden />
                      {it.k === 'session' ? (
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                          <button type="button" onClick={() => ui.openForm('session', { id: it.s.id })} className="min-w-0 text-left">
                            <p className={`truncate text-sm font-medium ${it.s.status === 'skipped' ? 'text-muted line-through' : ''}`}>{it.s.topic}</p>
                            <p className="flex items-center gap-2 text-xs text-muted"><SubjectChip subject={subj(it.s.subjectId)} />{fmtMinutes(plannedMinutes(it.s))}{it.s.status === 'completed' && <Badge tone="ok">Completed</Badge>}{demo(it.s.isDemo)}</p>
                          </button>
                          <SessionActions s={it.s} compact />
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1 rounded-xl bg-sunken px-3 py-2"><p className="truncate text-sm">{it.e.title}</p><p className="text-xs text-muted">{fmtTime(it.e.start)} to {fmtTime(it.e.end)}{it.e.location && `, ${it.e.location}`}</p></div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold tracking-tight">Focus timer</h2><Badge tone={timer.status === 'running' ? 'accent' : 'neutral'}>{timer.status === 'running' ? 'Running' : timer.status === 'paused' ? 'Paused' : 'Ready'}</Badge></div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{String(Math.floor(Math.ceil(timer.msLeft / 1000) / 60)).padStart(2, '0')}:{String(Math.ceil(timer.msLeft / 1000) % 60).padStart(2, '0')}</p>
            <p className="mt-0.5 text-xs text-muted">{timer.todaySessions} sessions, {fmtMinutes(timer.todayMinutes)} focused today</p>
            <Button variant="primary" className="mt-4 w-full" onClick={() => ui.setFocusOpen(true)}><Play className="h-4 w-4" />{timer.status === 'idle' ? 'Start focusing' : 'Open timer'}</Button>
          </Card>
          <Card>
            <CardHeader title="Priority tasks" subtitle="Due within 3 days or overdue" />
            <ul className="p-3 pt-2">
              {prio.length === 0 && <li className="px-2 py-4 text-center text-sm text-muted">No urgent tasks. Nicely done.</li>}
              {prio.map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-sunken">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" checked={t.status === 'completed'} onChange={() => { toggleTask(t.id); ui.toast('Task completed'); }} aria-label={`Complete ${t.title}`} />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ui.openForm('task', { id: t.id })}>
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted"><SubjectChip subject={subj(t.subjectId)} /><span className={isOverdue(t) ? 'font-medium text-bad' : ''}>{relativeDue(t.dueDate)}</span><Badge tone={t.priority === 'high' ? 'bad' : t.priority === 'medium' ? 'warn' : 'neutral'}>{PRIORITY_LABEL[t.priority]}</Badge></p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Study hours this week" subtitle={`Focus timer and completed sessions. Dashed line is your daily average goal (${dailyGoalH.toFixed(1)}h).`} />
          <div className="h-64 px-3 pb-3 pt-4" role="img" aria-label={`Bar chart of study hours per day this week. Total ${fmtHours(weekMin)}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid {...grid} /><XAxis dataKey="day" {...axis} /><YAxis {...axis} unit="h" allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--c-line)', opacity: 0.4 }} content={<ChartTip fmt={(v) => `${v}h`} />} />
                <ReferenceLine y={dailyGoalH} stroke="var(--c-muted)" strokeDasharray="4 4" />
                <Bar dataKey="hours" name="Studied" fill="var(--c-accent)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Subject progress" subtitle="Syllabus topics completed" action={<Link to="/subjects" className="text-[13px] font-medium text-accent hover:underline">All</Link>} />
          <ul className="space-y-3.5 p-5 pt-4">
            {subjects.length === 0 && <li className="py-4 text-center text-sm text-muted">Add subjects to track syllabus progress.</li>}
            {subjects.slice(0, 6).map((s) => (
              <li key={s.id}><div className="mb-1 flex items-center justify-between gap-2 text-sm"><SubjectChip subject={s} className="text-sm text-fg" /><span className="tabular-nums text-muted">{subjectPct(s)}%</span></div><Progress label={`${s.name} progress`} value={subjectPct(s)} color={s.color} /></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Upcoming deadlines" subtitle="Tasks and exams in the next 30 days" action={<Link to="/tasks" className="text-[13px] font-medium text-accent hover:underline">All tasks</Link>} />
        <ul className="grid grid-cols-1 gap-x-6 p-3 pt-2 md:grid-cols-2">
          {deadlines.length === 0 && <li className="col-span-2 px-2 py-6 text-center text-sm text-muted">Nothing due soon. Add a task or exam to see it here.</li>}
          {deadlines.map((d) => (
            <li key={d.kind + d.id}>
              <Link to={d.kind === 'exam' ? `/exams?open=${d.id}` : `/tasks?open=${d.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sunken">
                <span className={`rounded-lg p-2 ${d.kind === 'exam' ? 'bg-bad/10 text-bad' : 'bg-accent/10 text-accent'}`} aria-hidden>{d.kind === 'exam' ? <GraduationCap className="h-4 w-4" /> : <Target className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.title}</span><span className="block truncate text-xs text-muted">{subj(d.subjectId)?.name ?? 'No subject'}, {fmtDate(d.date)}</span></span>
                <Badge tone={d.kind === 'exam' ? 'bad' : 'neutral'}>{relativeDue(d.date)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
