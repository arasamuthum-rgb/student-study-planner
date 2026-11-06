import { useEffect, useState } from 'react';
import { CalendarCheck, Check, Info, Pencil, RefreshCw, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge, EmptyState, SubjectChip } from './ui/misc';
import { Segmented } from './ui/fields';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { recommendSchedule, type Recommendation } from '../lib/scheduler';
import { fmtDate, fmtMinutes, durationMin } from '../lib/dates';
import { PRIORITY_LABEL } from '../lib/constants';

/** Shows rule-based schedule suggestions. Nothing is saved until the student accepts a suggestion. */
export function PlanDialog() {
  const { plan, closePlan, openForm, toast } = useUI(); const store = useStore(); const { data, addSessions } = store;
  const [recs, setRecs] = useState<Recommendation[]>([]); const [days, setDays] = useState<'7' | '14'>('7');
  const generate = () => setRecs(recommendSchedule(data, { ...plan, days: plan?.subjectId ? 14 : Number(days) }));
  useEffect(() => { if (plan) generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [plan, days]);
  const subject = (id: string) => data.subjects.find((s) => s.id === id);
  const accept = (r: Recommendation) => { addSessions([{ subjectId: r.subjectId, date: r.date, start: r.start, end: r.end, topic: r.topic, notes: `Suggested: ${r.reasons.join('; ')}`, priority: r.priority, status: 'pending', actualMinutes: null, recurrenceGroupId: null, source: 'recommended' }]); setRecs((x) => x.filter((y) => y.id !== r.id)); toast('Session added to your planner'); };
  const acceptAll = () => { addSessions(recs.map((r) => ({ subjectId: r.subjectId, date: r.date, start: r.start, end: r.end, topic: r.topic, notes: `Suggested: ${r.reasons.join('; ')}`, priority: r.priority, status: 'pending' as const, actualMinutes: null, recurrenceGroupId: null, source: 'recommended' as const }))); toast(`Added ${recs.length} sessions to your planner`); setRecs([]); closePlan(); };
  const edit = (r: Recommendation) => { setRecs((x) => x.filter((y) => y.id !== r.id)); openForm('session', { defaults: { subjectId: r.subjectId, date: r.date, start: r.start, end: r.end, topic: r.topic, priority: r.priority, source: 'recommended' } }); };
  const total = recs.reduce((a, r) => a + durationMin(r.start, r.end), 0);
  const scoped = plan?.subjectId ? subject(plan.subjectId)?.name : null;
  return (
    <Modal open={!!plan} onClose={closePlan} size="lg" title={scoped ? `Revision plan for ${scoped}` : 'Suggested study schedule'} description="Built from your exams, tasks, subject difficulty, progress and free time."
      footer={<><Button onClick={generate}><RefreshCw className="h-4 w-4" />Regenerate</Button><Button onClick={closePlan}>Close</Button><Button variant="primary" onClick={acceptAll} disabled={!recs.length}>Accept all ({recs.length})</Button></>}>
      <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-sunken p-3 text-[13px] text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>This planner follows fixed scheduling rules, not AI. It weighs how close each exam is, how much syllabus is left, subject difficulty, your weekly target and task priorities, then fills free gaps between {data.prefs.studyDayStart} and {data.prefs.studyDayEnd}. Accept, edit or reject each suggestion.</p>
      </div>
      {!scoped && <div className="mb-4"><Segmented<'7' | '14'> label="Planning window" value={days} onChange={setDays} options={[{ value: '7', label: 'Next 7 days' }, { value: '14', label: 'Next 14 days' }]} /></div>}
      {recs.length === 0 ? (
        <EmptyState icon={<CalendarCheck />} title="Nothing to suggest right now" body={data.subjects.some((s) => !s.archived) ? 'Your planned time already meets your weekly goal, or there are no free gaps in your study hours. Raise your goal or widen your study window in Settings.' : 'Add a subject first so there is something to schedule.'} />
      ) : (<>
        <p className="mb-2 text-[13px] text-muted">{recs.length} suggestions, {fmtMinutes(total)} in total</p>
        <ul className="space-y-2.5">
          {recs.map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{fmtDate(r.date)}, {r.start} to {r.end}<span className="ml-2 font-normal text-muted">{fmtMinutes(durationMin(r.start, r.end))}</span></p>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><SubjectChip subject={subject(r.subjectId)} /><span className="truncate text-[13px]">{r.topic}</span><Badge tone={r.priority === 'high' ? 'bad' : r.priority === 'medium' ? 'warn' : 'neutral'}>{PRIORITY_LABEL[r.priority]}</Badge></div>
                  <p className="mt-2 text-xs text-muted"><span className="font-medium text-fg">Why: </span>{r.reasons.length ? r.reasons.join('. ') : 'Keeps this subject moving toward its weekly target'}.</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="subtle" onClick={() => accept(r)}><Check className="h-3.5 w-3.5" />Accept</Button>
                  <Button size="sm" onClick={() => edit(r)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRecs((x) => x.filter((y) => y.id !== r.id))} aria-label="Reject suggestion"><X className="h-3.5 w-3.5" />Reject</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </>)}
    </Modal>
  );
}
