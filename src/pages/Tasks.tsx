import { useMemo, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ListChecks, ListFilter, Plus, Trash2 } from 'lucide-react';
import { Badge, Card, DemoBadge, EmptyState, PageHeader, Progress, Stat, SubjectChip } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Segmented, Select } from '../components/ui/fields';
import { MonthGrid } from '../components/MonthGrid';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useOpenParam } from '../hooks/useOpenParam';
import { isOverdue, taskChecklistPct, taskStats } from '../lib/stats';
import { dateTime, daysUntil, fmtMinutes, fmtTime, relativeDue, toDateStr } from '../lib/dates';
import { PRIORITY_LABEL, PRIORITY_RANK, STATUS_LABEL } from '../lib/constants';
import type { Priority, Task, TaskStatus } from '../types';

type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'later';

export default function Tasks() {
  const { data, toggleTask, updateTask, deleteTask, toggleChecklist } = useStore(); const ui = useUI();
  const [subject, setSubject] = useState('all'); const [status, setStatus] = useState<'all' | TaskStatus>('all'); const [priority, setPriority] = useState<'all' | Priority>('all');
  const [due, setDue] = useState<DueFilter>('all'); const [sort, setSort] = useState<'deadline' | 'priority'>('deadline'); const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => new Date());
  useOpenParam((id) => ui.openForm('task', { id }));
  const subj = (id: string) => data.subjects.find((s) => s.id === id);
  const stats = useMemo(() => taskStats(data.tasks), [data.tasks]);
  const dueSoon = data.tasks.filter((t) => t.status !== 'completed' && !isOverdue(t) && daysUntil(t.dueDate) <= 7).length;

  const list = useMemo(() => data.tasks.filter((t) => {
    if (subject !== 'all' && t.subjectId !== subject) return false;
    if (status !== 'all' && t.status !== status) return false;
    if (priority !== 'all' && t.priority !== priority) return false;
    const n = daysUntil(t.dueDate);
    if (due === 'overdue') return isOverdue(t);
    if (due === 'today') return n === 0; if (due === 'week') return n >= 0 && n <= 7; if (due === 'later') return n > 7;
    return true;
  }).sort((a, b) => {
    const da = dateTime(a.dueDate, a.dueTime).getTime() - dateTime(b.dueDate, b.dueTime).getTime();
    const doneDiff = Number(a.status === 'completed') - Number(b.status === 'completed');
    return doneDiff || (sort === 'priority' ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || da : da);
  }), [data.tasks, subject, status, priority, due, sort]);
  const filtered = subject !== 'all' || status !== 'all' || priority !== 'all' || due !== 'all';
  const clear = () => { setSubject('all'); setStatus('all'); setPriority('all'); setDue('all'); };

  const remove = async (t: Task) => { if (await ui.confirm({ title: 'Delete this task?', body: `"${t.title}" will be removed permanently.`, confirmLabel: 'Delete task', danger: true })) { deleteTask(t.id); ui.toast('Task deleted'); } };
  const complete = (t: Task) => { toggleTask(t.id); ui.toast(t.status === 'completed' ? 'Task reopened' : 'Task completed'); };

  return (
    <div>
      <PageHeader title="Tasks & Assignments" description="Track what's due, what's in progress and what's done." actions={<Button variant="primary" onClick={() => ui.openForm('task')}><Plus className="h-4 w-4" />Add task</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<ListChecks />} label="Open tasks" value={stats.open} sub={`${stats.total} in total`} />
        <Stat icon={<CheckCircle2 />} tone="ok" label="Completion rate" value={`${stats.rate}%`} sub={<Progress thin className="mt-1.5" label="Task completion rate" value={stats.rate} color="rgb(var(--ok))" />} />
        <Stat icon={<CalendarDays />} tone="warn" label="Due in 7 days" value={dueSoon} sub="Not yet overdue" />
        <Stat icon={<ListFilter />} tone="bad" label="Overdue" value={stats.overdue} sub={stats.overdue ? 'Needs attention' : 'You are on track'} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Select aria-label="Filter by subject" className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="all">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select aria-label="Filter by status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value as 'all' | TaskStatus)}><option value="all">Any status</option>{(Object.keys(STATUS_LABEL) as TaskStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</Select>
        <Select aria-label="Filter by priority" className="w-auto" value={priority} onChange={(e) => setPriority(e.target.value as 'all' | Priority)}><option value="all">Any priority</option>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABEL[k]}</option>)}</Select>
        <Select aria-label="Filter by due date" className="w-auto" value={due} onChange={(e) => setDue(e.target.value as DueFilter)}><option value="all">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="week">Next 7 days</option><option value="later">Later</option></Select>
        <Select aria-label="Sort tasks" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value as 'deadline' | 'priority')}><option value="deadline">Sort: Deadline</option><option value="priority">Sort: Priority</option></Select>
        {filtered && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
        <div className="ml-auto"><Segmented<'list' | 'calendar'> label="Task view" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} /></div>
      </div>

      {view === 'calendar' ? (
        <Card>
          <div className="flex items-center gap-2 px-4 pt-3">
            <Button size="iconSm" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="iconSm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => setMonth(new Date())}>Today</Button><h2 className="ml-1 text-[15px] font-semibold" aria-live="polite">{format(month, 'MMMM yyyy')}</h2>
          </div>
          <div className="mt-3"><MonthGrid month={month} firstDay={data.prefs.firstDayOfWeek} onDayClick={(d) => ui.openForm('task', { defaults: { dueDate: toDateStr(d) } })} dayLabel={(d) => `${format(d, 'EEEE, MMMM d')}. Add a task due this day`}
            renderDay={(d) => { const ts = list.filter((t) => t.dueDate === toDateStr(d)); return <>{ts.slice(0, 3).map((t) => (
              <button key={t.id} type="button" onClick={() => ui.openForm('task', { id: t.id })} className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] hover:brightness-95" style={{ backgroundColor: `${subj(t.subjectId)?.color ?? '#94a3b8'}24` }} aria-label={`${t.title}, ${STATUS_LABEL[t.status]}`}>
                <span className={t.status === 'completed' ? 'line-through opacity-60' : isOverdue(t) ? 'text-bad' : ''}>{t.title}</span></button>))}{ts.length > 3 && <p className="px-1.5 text-[11px] text-muted">+{ts.length - 3} more</p>}</>; }} /></div>
        </Card>
      ) : data.tasks.length === 0 ? <EmptyState icon={<ListChecks />} title="No tasks yet" body="Add assignments, readings and projects with due dates, and they'll show up in your dashboard and notifications." action={<Button variant="primary" onClick={() => ui.openForm('task')}>Add your first task</Button>} />
        : list.length === 0 ? <EmptyState icon={<ListFilter />} title="No tasks match these filters" body="Try widening the filters to see more tasks." action={<Button onClick={clear}>Clear filters</Button>} />
        : (
          <ul className="space-y-2">
            {list.map((t) => {
              const done = t.status === 'completed'; const over = isOverdue(t); const pct = taskChecklistPct(t);
              return (
                <li key={t.id}>
                  <Card as="div" className="p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={done} onChange={() => complete(t)} aria-label={`${done ? 'Reopen' : 'Complete'} ${t.title}`} className="mt-1 h-[18px] w-[18px] shrink-0 accent-[rgb(var(--accent))]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <button type="button" onClick={() => ui.openForm('task', { id: t.id })} className="min-w-0 text-left"><span className={`block truncate text-sm font-semibold hover:text-accent ${done ? 'text-muted line-through' : ''}`}>{t.title}</span></button>
                          <div className="flex items-center gap-2">
                            <Select aria-label={`Status of ${t.title}`} className="h-8 w-auto py-0 text-[13px]" value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus })}>{(Object.keys(STATUS_LABEL) as TaskStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</Select>
                            <Button variant="ghost" size="iconSm" aria-label={`Delete ${t.title}`} onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <SubjectChip subject={subj(t.subjectId)} />
                          <span className={over ? 'font-medium text-bad' : ''}>{done ? 'Done' : relativeDue(t.dueDate)}, {fmtTime(t.dueTime)}</span>
                          <span>{fmtMinutes(t.estimatedMinutes)} estimated</span>
                          <Badge tone={t.priority === 'high' ? 'bad' : t.priority === 'medium' ? 'warn' : 'neutral'}>{PRIORITY_LABEL[t.priority]}</Badge>
                          {over && <Badge tone="bad">Overdue</Badge>}{t.isDemo && <DemoBadge />}
                        </p>
                        {(t.checklist.length > 0 || t.status === 'in_progress') && (
                          <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-muted"><span>{t.checklist.length ? `${t.checklist.filter((c) => c.done).length} of ${t.checklist.length} steps` : 'In progress'}</span><span className="tabular-nums">{pct}%</span></div><Progress thin label={`Progress on ${t.title}`} value={pct} color={subj(t.subjectId)?.color} /></div>
                        )}
                        {t.checklist.length > 0 && !done && (
                          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">{t.checklist.map((c) => (
                            <li key={c.id}><label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={c.done} onChange={() => toggleChecklist(t.id, c.id)} className="h-3.5 w-3.5 accent-[rgb(var(--accent))]" /><span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span></label></li>))}</ul>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
