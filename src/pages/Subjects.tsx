import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, BookOpen, ExternalLink, GraduationCap, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2, Minus } from 'lucide-react';
import { Badge, Card, DemoBadge, EmptyState, PageHeader, Progress } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Input, Segmented, Select } from '../components/ui/fields';
import { Modal } from '../components/ui/Modal';
import { MenuItem, Popover } from '../components/ui/Popover';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useOpenParam } from '../hooks/useOpenParam';
import { minutesBySubject, subjectPct } from '../lib/stats';
import { dateTime, fmtDate, fmtHours, relativeDue, weekStart } from '../lib/dates';
import { addDays } from 'date-fns';
import type { Subject } from '../types';

type Sort = 'name' | 'progress' | 'hours' | 'deadline';

export default function Subjects() {
  const { data, updateSubject, deleteSubject } = useStore(); const ui = useUI();
  const [q, setQ] = useState(''); const [term, setTerm] = useState('all'); const [sort, setSort] = useState<Sort>('name'); const [view, setView] = useState<'active' | 'archived' | 'all'>('active');
  const [detail, setDetail] = useState<string | null>(null);
  useOpenParam(setDetail);

  const ws = weekStart(new Date(), data.prefs.firstDayOfWeek);
  const weekMins = useMemo(() => minutesBySubject(data, ws, addDays(ws, 6)), [data, ws]);
  const nextDue = (s: Subject): { date: string; label: string; at: number } | null => {
    const items = [
      ...data.tasks.filter((t) => t.subjectId === s.id && t.status !== 'completed').map((t) => ({ date: t.dueDate, label: t.title, at: dateTime(t.dueDate, t.dueTime).getTime() })),
      ...data.exams.filter((e) => e.subjectId === s.id && dateTime(e.date, e.time).getTime() >= Date.now()).map((e) => ({ date: e.date, label: e.title, at: dateTime(e.date, e.time).getTime() })),
    ];
    return items.sort((a, b) => a.at - b.at)[0] ?? null;
  };
  const terms = Array.from(new Set(data.subjects.map((s) => s.term)));
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.subjects
      .filter((s) => (view === 'all' || (view === 'archived') === s.archived) && (term === 'all' || s.term === term) && (!t || [s.name, s.code, s.instructor].some((v) => v.toLowerCase().includes(t))))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'progress' ? subjectPct(b) - subjectPct(a) : sort === 'hours' ? b.targetHoursPerWeek - a.targetHoursPerWeek : (nextDue(a)?.at ?? Infinity) - (nextDue(b)?.at ?? Infinity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, term, sort, view]);

  const remove = async (s: Subject) => {
    const n = { t: data.tasks.filter((x) => x.subjectId === s.id).length, s: data.sessions.filter((x) => x.subjectId === s.id).length, e: data.exams.filter((x) => x.subjectId === s.id).length };
    if (await confirm(s, n)) { deleteSubject(s.id); setDetail(null); ui.toast(`Deleted ${s.name}`); }
  };
  const confirm = (s: Subject, n: { t: number; s: number; e: number }) => ui.confirm({ title: `Delete ${s.name}?`, body: `This also deletes ${n.t} task${n.t === 1 ? '' : 's'}, ${n.s} study session${n.s === 1 ? '' : 's'} and ${n.e} exam${n.e === 1 ? '' : 's'} for this subject. To keep your history, archive it instead.`, confirmLabel: 'Delete subject', danger: true });
  const toggleArchive = (s: Subject) => { updateSubject(s.id, { archived: !s.archived }); ui.toast(s.archived ? `Restored ${s.name}` : `Archived ${s.name}`); };
  const open = data.subjects.find((s) => s.id === detail);

  return (
    <div>
      <PageHeader title="My Subjects" description="Everything you're studying, with progress and what's due next." actions={<Button variant="primary" onClick={() => ui.openForm('subject')}><Plus className="h-4 w-4" />Add subject</Button>} />
      {data.subjects.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-52 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden /><Input aria-label="Search subjects" placeholder="Search by name, code or instructor" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select aria-label="Filter by term" className="w-auto" value={term} onChange={(e) => setTerm(e.target.value)}><option value="all">All terms</option>{terms.map((t) => <option key={t}>{t}</option>)}</Select>
          <Select aria-label="Sort subjects" className="w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="name">Sort: Name</option><option value="progress">Sort: Progress</option><option value="hours">Sort: Weekly target</option><option value="deadline">Sort: Next deadline</option></Select>
          <Segmented<'active' | 'archived' | 'all'> label="Show subjects" value={view} onChange={setView} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }, { value: 'all', label: 'All' }]} />
        </div>
      )}
      {data.subjects.length === 0 ? <EmptyState icon={<BookOpen />} title="No subjects yet" body="Add the courses you're taking this term. You'll be able to attach tasks, exams and study sessions to each one." action={<Button variant="primary" onClick={() => ui.openForm('subject')}>Add your first subject</Button>} />
        : list.length === 0 ? <EmptyState icon={<Search />} title="No subjects match" body="Try a different search or filter." action={<Button onClick={() => { setQ(''); setTerm('all'); setView('all'); }}>Clear filters</Button>} /> : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const pct = subjectPct(s); const wk = (weekMins.get(s.id) ?? 0); const nd = nextDue(s);
              return (
                <li key={s.id}>
                  <Card as="article" className="h-full overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: s.color }} aria-hidden />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => setDetail(s.id)} className="min-w-0 text-left">
                          <h2 className="truncate text-[15px] font-semibold tracking-tight hover:text-accent">{s.name}</h2>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">{[s.code, s.term].filter(Boolean).join(', ')}{s.archived && <Badge>Archived</Badge>}{s.isDemo && <DemoBadge />}</p>
                        </button>
                        <Popover label={`Actions for ${s.name}`} buttonClass="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-fg" button={<MoreHorizontal className="h-4 w-4" />}>
                          {(close) => (<>
                            <MenuItem icon={<Pencil />} onClick={() => { close(); ui.openForm('subject', { id: s.id }); }}>Edit</MenuItem>
                            <MenuItem icon={s.archived ? <ArchiveRestore /> : <Archive />} onClick={() => { close(); toggleArchive(s); }}>{s.archived ? 'Restore' : 'Archive'}</MenuItem>
                            <MenuItem icon={<Trash2 />} danger onClick={() => { close(); remove(s); }}>Delete</MenuItem>
                          </>)}
                        </Popover>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs"><span className="text-muted">{s.completedTopics} of {s.totalTopics} topics</span><span className="font-medium tabular-nums">{pct}%</span></div>
                        <Progress label={`${s.name} syllabus progress`} value={pct} color={s.color} />
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs"><span className="text-muted">This week</span><span className="tabular-nums">{fmtHours(wk)} of {s.targetHoursPerWeek}h</span></div>
                        <Progress thin label={`${s.name} weekly study time`} value={s.targetHoursPerWeek ? (wk / (s.targetHoursPerWeek * 60)) * 100 : 0} color="rgb(var(--ind))" />
                      </div>
                      <p className="mt-3 truncate border-t border-line pt-3 text-xs text-muted">{nd ? <><span className="font-medium text-fg">{relativeDue(nd.date)}:</span> {nd.label}</> : 'No upcoming deadlines'}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

      <Modal open={!!open} onClose={() => setDetail(null)} title={open?.name ?? ''} description={open ? [open.code, open.instructor, open.term].filter(Boolean).join(', ') : ''} variant="right"
        footer={open && <><Button variant="ghost" className="mr-auto text-bad hover:bg-bad/10 hover:text-bad" onClick={() => remove(open)}><Trash2 className="h-4 w-4" />Delete</Button><Button onClick={() => toggleArchive(open)}>{open.archived ? 'Restore' : 'Archive'}</Button><Button variant="primary" onClick={() => { const id = open.id; setDetail(null); ui.openForm('subject', { id }); }}><Pencil className="h-4 w-4" />Edit</Button></>}>
        {open && <SubjectDetail s={open} />}
      </Modal>
    </div>
  );
}

function SubjectDetail({ s }: { s: Subject }) {
  const { data, updateSubject } = useStore(); const ui = useUI();
  const exams = data.exams.filter((e) => e.subjectId === s.id && dateTime(e.date, e.time).getTime() >= Date.now()).sort((a, b) => a.date.localeCompare(b.date));
  const tasks = data.tasks.filter((t) => t.subjectId === s.id && t.status !== 'completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const step = (d: number) => updateSubject(s.id, { completedTopics: Math.max(0, Math.min(s.totalTopics, s.completedTopics + d)) });
  const links = s.resources.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-5">
      <section aria-label="Syllabus progress">
        <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Syllabus progress</h3><span className="text-sm tabular-nums text-muted">{subjectPct(s)}%</span></div>
        <Progress label="Syllabus progress" value={subjectPct(s)} color={s.color} />
        <div className="mt-3 flex items-center justify-between rounded-xl bg-sunken px-3 py-2"><span className="text-sm">{s.completedTopics} of {s.totalTopics} topics done</span>
          <span className="flex gap-1"><Button size="iconSm" aria-label="Mark one fewer topic complete" disabled={s.completedTopics <= 0} onClick={() => step(-1)}><Minus className="h-4 w-4" /></Button><Button size="iconSm" aria-label="Mark one more topic complete" disabled={s.completedTopics >= s.totalTopics} onClick={() => step(1)}><Plus className="h-4 w-4" /></Button></span></div>
      </section>
      <section><h3 className="mb-2 text-sm font-semibold">Upcoming assessments</h3>
        {exams.length + tasks.length === 0 && <p className="text-sm text-muted">Nothing upcoming for this subject.</p>}
        <ul className="space-y-1.5">
          {exams.map((e) => <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><GraduationCap className="h-4 w-4 shrink-0 text-bad" aria-hidden /><span className="truncate">{e.title}</span></span><Badge tone="bad">{relativeDue(e.date)}</Badge></li>)}
          {tasks.map((t) => <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"><button type="button" className="min-w-0 truncate text-left hover:text-accent" onClick={() => ui.openForm('task', { id: t.id })}>{t.title}</button><span className="shrink-0 text-xs text-muted">{fmtDate(t.dueDate)}</span></li>)}
        </ul>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => ui.openForm('task', { defaults: { subjectId: s.id } })}><Plus className="h-3.5 w-3.5" />Task</Button>
        <Button size="sm" onClick={() => ui.openForm('exam', { defaults: { subjectId: s.id } })}><Plus className="h-3.5 w-3.5" />Exam</Button>
        <Button size="sm" onClick={() => ui.openForm('session', { defaults: { subjectId: s.id } })}><Plus className="h-3.5 w-3.5" />Session</Button>
        <Button size="sm" onClick={() => ui.openPlan({ subjectId: s.id })}><Sparkles className="h-3.5 w-3.5" />Plan sessions</Button>
      </div>
      <section><h3 className="mb-1 text-sm font-semibold">Notes</h3><p className="whitespace-pre-wrap text-sm text-muted">{s.notes || 'No notes yet. Use Edit to add some.'}</p></section>
      <section><h3 className="mb-1 text-sm font-semibold">Resources</h3>
        {links.length === 0 ? <p className="text-sm text-muted">No resources added.</p> : <ul className="space-y-1">{links.map((l) => <li key={l} className="text-sm">{/^https?:\/\//.test(l) ? <a href={l} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 break-all text-accent hover:underline">{l}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden /></a> : <span className="text-muted">{l}</span>}</li>)}</ul>}
      </section>
    </div>
  );
}
