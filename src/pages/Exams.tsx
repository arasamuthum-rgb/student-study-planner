import { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, GraduationCap, Plus, Sparkles, Star, Trash2, Pencil, ListChecks } from 'lucide-react';
import { Badge, Card, DemoBadge, EmptyState, PageHeader, Progress, SubjectChip } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Field, Input, Segmented } from '../components/ui/fields';
import { Modal } from '../components/ui/Modal';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { useOpenParam } from '../hooks/useOpenParam';
import { examCompletion, examUrgency } from '../lib/stats';
import { daysUntil, fmtDate, fmtTime } from '../lib/dates';
import { EXAM_LABEL } from '../lib/constants';
import { cn } from '../lib/cn';
import type { Exam, ExamTopic } from '../types';

const URG = { urgent: { tone: 'bad', label: 'Needs urgent preparation' }, soon: { tone: 'warn', label: 'Coming up' }, ok: { tone: 'neutral', label: 'On track' }, past: { tone: 'neutral', label: 'Finished' } } as const;
const countdown = (n: number) => (n < 0 ? 'Passed' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`);

export default function Exams() {
  const { data, deleteExam } = useStore(); const ui = useUI();
  const [open, setOpen] = useState<string | null>(null);
  useOpenParam(setOpen);
  const subj = (id: string) => data.subjects.find((s) => s.id === id);
  const sorted = useMemo(() => [...data.exams].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [data.exams]);
  const upcoming = sorted.filter((e) => daysUntil(e.date) >= 0); const past = sorted.filter((e) => daysUntil(e.date) < 0);
  const urgentCount = upcoming.filter((e) => examUrgency(data, e) === 'urgent').length;
  const exam = data.exams.find((e) => e.id === open);

  const card = (e: Exam) => {
    const c = examCompletion(data, e); const n = daysUntil(e.date); const u = examUrgency(data, e); const s = subj(e.subjectId);
    return (
      <li key={e.id}>
        <Card as="article" className={cn('h-full', u === 'urgent' && 'border-bad/40')}>
          <button type="button" onClick={() => setOpen(e.id)} className="block w-full p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-[15px] font-semibold tracking-tight">{e.title}</h2><p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted"><SubjectChip subject={s} /><Badge>{EXAM_LABEL[e.type]}</Badge>{e.isDemo && <DemoBadge />}</p></div>
              <div className="shrink-0 text-right"><p className={cn('text-xl font-semibold tabular-nums', u === 'urgent' ? 'text-bad' : n >= 0 && n <= 14 ? 'text-warn' : '')}>{countdown(n)}</p><p className="text-xs text-muted">{fmtDate(e.date)}, {fmtTime(e.time)}</p></div>
            </div>
            <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span className="text-muted">{c.total ? `${c.done} of ${c.total} topics revised` : 'No topics added yet'}</span><span className="tabular-nums font-medium">{c.pct}%</span></div><Progress label={`${e.title} syllabus completion`} value={c.pct} color={s?.color} /></div>
            <p className="mt-3"><Badge tone={URG[u].tone}>{URG[u].label}</Badge></p>
          </button>
        </Card>
      </li>
    );
  };

  return (
    <div>
      <PageHeader title="Exam Preparation" description="Countdowns, syllabus progress and revision plans for every exam." actions={<Button variant="primary" onClick={() => ui.openForm('exam')}><Plus className="h-4 w-4" />Add exam</Button>} />
      {urgentCount > 0 && <div role="status" className="mb-5 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad"><strong>{urgentCount} exam{urgentCount > 1 ? 's need' : ' needs'} urgent preparation.</strong> They are close and a lot of the syllabus is still open. Open one to generate a revision checklist.</div>}
      {data.exams.length === 0 ? <EmptyState icon={<GraduationCap />} title="No exams yet" body="Add an exam, list its chapters and topics, and track how confident you feel about each one as the date gets closer." action={<Button variant="primary" onClick={() => ui.openForm('exam')}>Add your first exam</Button>} /> : (<>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{upcoming.map(card)}</ul>
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming exams.</p>}
        {past.length > 0 && <><h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Past exams</h2><ul className="grid grid-cols-1 gap-4 opacity-75 md:grid-cols-2 xl:grid-cols-3">{past.map(card)}</ul></>}
      </>)}
      <Modal open={!!exam} onClose={() => setOpen(null)} size="xl" title={exam?.title ?? ''} description={exam ? `${subj(exam.subjectId)?.name ?? 'No subject'}, ${fmtDate(exam.date, 'EEEE, MMM d')} at ${fmtTime(exam.time)}${exam.location ? `, ${exam.location}` : ''}` : ''}
        footer={exam && <><Button variant="ghost" className="mr-auto text-bad hover:bg-bad/10 hover:text-bad" onClick={async () => { if (await ui.confirm({ title: 'Delete this exam?', body: 'The exam and all of its syllabus topics will be removed.', confirmLabel: 'Delete exam', danger: true })) { deleteExam(exam.id); setOpen(null); ui.toast('Exam deleted'); } }}><Trash2 className="h-4 w-4" />Delete</Button><Button onClick={() => { const id = exam.id; setOpen(null); ui.openForm('exam', { id }); }}><Pencil className="h-4 w-4" />Edit exam</Button><Button variant="primary" onClick={() => setOpen(null)}>Done</Button></>}>
        {exam && <ExamDetail exam={exam} />}
      </Modal>
    </div>
  );
}

function ExamDetail({ exam }: { exam: Exam }) {
  const store = useStore(); const { data, addTopic, updateTopic, deleteTopic } = store; const ui = useUI();
  const [tab, setTab] = useState<'topics' | 'checklist'>('topics');
  const [chapter, setChapter] = useState(''); const [title, setTitle] = useState(''); const [err, setErr] = useState('');
  const topics = data.examTopics.filter((t) => t.examId === exam.id);
  const c = examCompletion(data, exam); const n = daysUntil(exam.date);
  const grouped = useMemo(() => { const g = new Map<string, ExamTopic[]>(); topics.forEach((t) => g.set(t.chapter || 'General', [...(g.get(t.chapter || 'General') ?? []), t])); return [...g.entries()]; }, [topics]);
  const add = () => { const t = title.trim(); if (!t) return setErr('Enter a topic name.'); if (t.length > 120) return setErr('Topic is too long.'); setErr(''); addTopic({ examId: exam.id, chapter: chapter.trim(), title: t, done: false, confidence: 3, targetDate: exam.targetCompletionDate }); setTitle(''); };
  // revision checklist: topics not yet done, weakest first, plus finished topics you rated 2 or lower
  const checklist = [...topics.filter((t) => !t.done).sort((a, b) => a.confidence - b.confidence), ...topics.filter((t) => t.done && t.confidence <= 2)];
  const remainingMin = topics.filter((t) => !t.done).length * 40;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card as="div" className="p-4"><p className="text-xs text-muted">Countdown</p><p className="mt-1 text-2xl font-semibold tabular-nums">{countdown(n)}</p></Card>
        <Card as="div" className="p-4"><p className="text-xs text-muted">Syllabus completion</p><p className="mt-1 text-2xl font-semibold tabular-nums">{c.pct}%</p><Progress thin className="mt-2" label="Syllabus completion" value={c.pct} /></Card>
        <Card as="div" className="p-4"><p className="text-xs text-muted">Average confidence</p><p className="mt-1 text-2xl font-semibold tabular-nums">{c.total ? c.avgConfidence.toFixed(1) : 'None'}<span className="text-sm font-normal text-muted">{c.total ? ' / 5' : ''}</span></p>{exam.targetCompletionDate && <p className="mt-1 text-xs text-muted">Finish syllabus by {fmtDate(exam.targetCompletionDate)}</p>}</Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented<'topics' | 'checklist'> label="Exam workspace" value={tab} onChange={setTab} options={[{ value: 'topics', label: 'Syllabus topics', icon: <ListChecks className="h-3.5 w-3.5" /> }, { value: 'checklist', label: 'Revision checklist', icon: <CalendarCheck className="h-3.5 w-3.5" /> }]} />
        <Button onClick={() => { ui.openPlan({ subjectId: exam.subjectId, untilDate: exam.date }); }} disabled={n <= 0}><Sparkles className="h-4 w-4" />Recommend revision sessions</Button>
      </div>
      {tab === 'topics' ? (<>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <Field label="Chapter (optional)">{(p) => <Input {...p} value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Chapter 4" />}</Field>
          <Field label="Topic" error={err}>{(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="e.g. Eigenvalues" />}</Field>
          <Button onClick={add}><Plus className="h-4 w-4" />Add topic</Button>
        </div>
        {topics.length === 0 ? <EmptyState icon={<ListChecks />} title="Add your syllabus topics" body="List each chapter or topic that could be on the exam. You'll rate your confidence and tick them off as you revise." /> : grouped.map(([ch, ts]) => (
          <section key={ch}><h3 className="mb-1.5 text-sm font-semibold">{ch}</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">{ts.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <input type="checkbox" checked={t.done} onChange={() => updateTopic(t.id, { done: !t.done })} aria-label={`Mark ${t.title} as revised`} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                <span className={cn('min-w-0 flex-1 text-sm', t.done && 'text-muted line-through')}>{t.title}</span>
                <span role="radiogroup" aria-label={`Confidence for ${t.title}`} className="flex">{[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={t.confidence === v} aria-label={`${v} of 5`} onClick={() => updateTopic(t.id, { confidence: v as ExamTopic['confidence'] })} className="p-0.5"><Star className={cn('h-4 w-4', v <= t.confidence ? 'fill-warn text-warn' : 'text-line')} /></button>))}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted">Target<input type="date" aria-label={`Target date for ${t.title}`} value={t.targetDate} max={exam.date} onChange={(e) => updateTopic(t.id, { targetDate: e.target.value })} className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg" /></label>
                <Button variant="ghost" size="iconSm" aria-label={`Remove ${t.title}`} onClick={() => deleteTopic(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>))}</ul></section>))}
      </>) : (
        <section aria-label="Revision checklist">
          {topics.length === 0 ? <EmptyState icon={<ListChecks />} title="No topics to revise yet" body="Add syllabus topics first, and the checklist will list what to revise, weakest topics first." />
            : checklist.length === 0 ? <EmptyState icon={<CheckCircle2 />} title="Everything is revised" body="All topics are done and you feel confident about them. Consider a practice paper to test yourself." /> : (<>
              <p className="mb-2 text-sm text-muted">{checklist.length} item{checklist.length > 1 ? 's' : ''} to go, roughly {Math.round(remainingMin / 60 * 10) / 10}h of revision at about 40 minutes per open topic. Weakest topics come first.</p>
              <ul className="space-y-1.5">{checklist.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                  <input type="checkbox" checked={false} onChange={() => (t.done ? updateTopic(t.id, { confidence: 3 }) : updateTopic(t.id, { done: true }))} aria-label={t.done ? `Mark ${t.title} as re-revised` : `Mark ${t.title} as revised`} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{t.done ? 'Re-revise' : 'Revise'}: {t.title}</span><span className="text-xs text-muted">{t.chapter || 'General'}{t.targetDate && `, target ${fmtDate(t.targetDate)}`}</span></span>
                  <Badge tone={t.confidence <= 2 ? 'bad' : 'neutral'}>Confidence {t.confidence}/5</Badge>
                </li>))}</ul></>)}
        </section>
      )}
    </div>
  );
}
