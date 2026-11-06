import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { addDays } from 'date-fns';
import { Button } from './ui/Button';
import { Field, Input, Select } from './ui/fields';
import { Card } from './ui/misc';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { SUBJECT_COLORS, TERMS } from '../lib/constants';
import { toDateStr } from '../lib/dates';
import { cn, uid } from '../lib/cn';

interface DSub { id: string; name: string; code: string; hours: number }
interface DExam { id: string; subjectId: string; title: string; date: string }
interface DTask { id: string; subjectId: string; title: string; date: string }
const STEPS = ['Profile', 'Subjects', 'Exams and tasks', 'Weekly goal'];

export function Onboarding() {
  const { data, addSubject, addExam, addTask, updateProfile, updatePrefs, finishOnboarding, loadDemo } = useStore(); const { toast, openPlan } = useUI(); const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.profile.name); const [school, setSchool] = useState(data.profile.school); const [term, setTerm] = useState(data.profile.term);
  const [subs, setSubs] = useState<DSub[]>([]); const [sn, setSn] = useState(''); const [sc, setSc] = useState(''); const [sh, setSh] = useState(4);
  const [exams, setExams] = useState<DExam[]>([]); const [tasks, setTasks] = useState<DTask[]>([]);
  const [en, setEn] = useState({ subjectId: '', title: '', date: toDateStr(addDays(new Date(), 21)) }); const [tn, setTn] = useState({ subjectId: '', title: '', date: toDateStr(addDays(new Date(), 5)) });
  const [goal, setGoal] = useState(data.prefs.weeklyGoalHours); const [from, setFrom] = useState(data.prefs.studyDayStart); const [to, setTo] = useState(data.prefs.studyDayEnd);
  const [err, setErr] = useState<string>('');

  const next = () => {
    setErr('');
    if (step === 0 && !name.trim()) return setErr('Enter your name so we can personalise your dashboard.');
    if (step === 3) { if (!(goal >= 1 && goal <= 100)) return setErr('Enter a weekly goal between 1 and 100 hours.'); if (to <= from) return setErr('The study window must end after it starts.'); }
    setStep((s) => s + 1);
  };
  const commit = (goToPlanner: boolean) => {
    updateProfile({ name: name.trim(), school: school.trim(), term }); updatePrefs({ weeklyGoalHours: goal, studyDayStart: from, studyDayEnd: to });
    const map = new Map<string, string>();
    subs.forEach((s, i) => map.set(s.id, addSubject({ name: s.name, code: s.code, instructor: '', term, targetHoursPerWeek: s.hours, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], difficulty: 3, totalTopics: 10, completedTopics: 0, notes: '', resources: '', archived: false }).id));
    exams.forEach((e) => addExam({ subjectId: map.get(e.subjectId) ?? '', title: e.title, date: e.date, time: '09:00', type: 'midterm', location: '', targetCompletionDate: '' }));
    tasks.forEach((t) => addTask({ subjectId: map.get(t.subjectId) ?? '', title: t.title, description: '', dueDate: t.date, dueTime: '23:59', priority: 'medium', status: 'not_started', estimatedMinutes: 60, checklist: [], notes: '', completedAt: null }));
    finishOnboarding(); toast(`Welcome, ${name.trim()}! Your planner is ready.`);
    if (goToPlanner && subs.length) { nav('/planner'); openPlan(); } else nav('/');
  };
  const useSample = () => { if (!name.trim()) return setErr('Enter your name first, then explore with sample data.'); updateProfile({ name: name.trim(), school: school.trim(), term }); loadDemo(); toast('Sample data loaded. Remove it any time from the banner or Settings.', 'info'); nav('/'); };
  const addSub = () => { if (!sn.trim()) return setErr('Give the subject a name.'); setErr(''); const id = uid('tmp'); setSubs((s) => [...s, { id, name: sn.trim(), code: sc.trim(), hours: sh }]); setSn(''); setSc(''); };
  const addEx = () => { if (!en.subjectId || !en.title.trim() || !en.date) return setErr('Choose a subject, title and date for the exam.'); setErr(''); setExams((x) => [...x, { id: uid('tmp'), subjectId: en.subjectId, title: en.title.trim(), date: en.date }]); setEn({ ...en, title: '' }); };
  const addTk = () => { if (!tn.subjectId || !tn.title.trim() || !tn.date) return setErr('Choose a subject, title and due date for the task.'); setErr(''); setTasks((x) => [...x, { id: uid('tmp'), subjectId: tn.subjectId, title: tn.title.trim(), date: tn.date }]); setTn({ ...tn, title: '' }); };
  const subName = (id: string) => subs.find((s) => s.id === id)?.name ?? '';
  const subSelect = (value: string, onChange: (v: string) => void) => <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Subject"><option value="">Choose subject</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5"><div className="rounded-lg bg-accent p-1.5 text-accent-fg"><NotebookPen className="h-4 w-4" aria-hidden /></div><span className="font-display text-lg font-semibold tracking-tight">Study Planner</span></div>
      <ol className="mb-6 flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold', i < step ? 'bg-accent text-accent-fg' : i === step ? 'border-2 border-accent text-accent' : 'border border-line text-muted')}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={cn('hidden text-[13px] sm:inline', i === step ? 'font-medium' : 'text-muted')}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>
      <Card className="p-6">
        {step === 0 && (<div className="space-y-4">
          <div><h1 className="text-xl font-semibold tracking-tight">Welcome. Let's set up your study planner.</h1><p className="mt-1 text-sm text-muted">It takes about two minutes. Everything is stored in this browser, and you can change it all later.</p></div>
          <Field label="Your name">{(p) => <Input {...p} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya" />}</Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="School or university (optional)">{(p) => <Input {...p} value={school} onChange={(e) => setSchool(e.target.value)} />}</Field>
            <Field label="Academic term">{(p) => <Select {...p} value={term} onChange={(e) => setTerm(e.target.value)}>{TERMS.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          </div>
        </div>)}
        {step === 1 && (<div className="space-y-4">
          <div><h1 className="text-xl font-semibold tracking-tight">Add your subjects</h1><p className="mt-1 text-sm text-muted">Add the courses you're taking in {term}. You can add syllabus topics and more detail later.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_6rem_auto] sm:items-end">
            <Field label="Subject name">{(p) => <Input {...p} autoFocus value={sn} onChange={(e) => setSn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }} placeholder="e.g. Biology" />}</Field>
            <Field label="Code (optional)">{(p) => <Input {...p} value={sc} onChange={(e) => setSc(e.target.value)} />}</Field>
            <Field label="Hours/week">{(p) => <Input {...p} type="number" min={0} step={0.5} value={sh} onChange={(e) => setSh(Number(e.target.value))} />}</Field>
            <Button onClick={addSub}><Plus className="h-4 w-4" />Add</Button>
          </div>
          <ul className="space-y-1.5">
            {subs.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} aria-hidden />
                <span className="flex-1 font-medium">{s.name}{s.code && <span className="ml-2 font-normal text-muted">{s.code}</span>}</span><span className="text-muted">{s.hours}h/week</span>
                <Button variant="ghost" size="iconSm" aria-label={`Remove ${s.name}`} onClick={() => { setSubs((x) => x.filter((y) => y.id !== s.id)); setExams((x) => x.filter((y) => y.subjectId !== s.id)); setTasks((x) => x.filter((y) => y.subjectId !== s.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button></li>
            ))}
          </ul>
        </div>)}
        {step === 2 && (<div className="space-y-5">
          <div><h1 className="text-xl font-semibold tracking-tight">Upcoming exams and assignments</h1><p className="mt-1 text-sm text-muted">Optional, but the planner uses them to decide what to study first.</p></div>
          {subs.length === 0 ? <p className="rounded-lg bg-sunken p-3 text-sm text-muted">Add a subject in the previous step to attach exams and tasks. You can also skip this and add them later.</p> : (<>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">Exam</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_9.5rem_auto]">{subSelect(en.subjectId, (v) => setEn({ ...en, subjectId: v }))}<Input aria-label="Exam title" placeholder="e.g. Midterm exam" value={en.title} onChange={(e) => setEn({ ...en, title: e.target.value })} /><Input aria-label="Exam date" type="date" value={en.date} onChange={(e) => setEn({ ...en, date: e.target.value })} /><Button onClick={addEx}><Plus className="h-4 w-4" />Add</Button></div>
              {exams.map((e) => <p key={e.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-sm"><span>{e.title} <span className="text-muted">({subName(e.subjectId)}, {e.date})</span></span><Button variant="ghost" size="iconSm" aria-label={`Remove ${e.title}`} onClick={() => setExams((x) => x.filter((y) => y.id !== e.id))}><Trash2 className="h-3.5 w-3.5" /></Button></p>)}
            </fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">Assignment</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_9.5rem_auto]">{subSelect(tn.subjectId, (v) => setTn({ ...tn, subjectId: v }))}<Input aria-label="Assignment title" placeholder="e.g. Lab report 2" value={tn.title} onChange={(e) => setTn({ ...tn, title: e.target.value })} /><Input aria-label="Due date" type="date" value={tn.date} onChange={(e) => setTn({ ...tn, date: e.target.value })} /><Button onClick={addTk}><Plus className="h-4 w-4" />Add</Button></div>
              {tasks.map((t) => <p key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-sm"><span>{t.title} <span className="text-muted">({subName(t.subjectId)}, due {t.date})</span></span><Button variant="ghost" size="iconSm" aria-label={`Remove ${t.title}`} onClick={() => setTasks((x) => x.filter((y) => y.id !== t.id))}><Trash2 className="h-3.5 w-3.5" /></Button></p>)}
            </fieldset></>)}
        </div>)}
        {step === 3 && (<div className="space-y-4">
          <div><h1 className="text-xl font-semibold tracking-tight">Set your weekly study goal</h1><p className="mt-1 text-sm text-muted">The planner keeps suggested sessions within this goal and inside your preferred hours.</p></div>
          <Field label="Study hours per week" hint="Be realistic. 10 to 20 hours suits most full-time students.">{(p) => <Input {...p} type="number" min={1} max={100} value={goal} onChange={(e) => setGoal(Number(e.target.value))} />}</Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Earliest study time">{(p) => <Input {...p} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field><Field label="Latest study time">{(p) => <Input {...p} type="time" value={to} onChange={(e) => setTo(e.target.value)} />}</Field></div>
        </div>)}
        {step === 4 && (<div className="space-y-3">
          <h1 className="text-xl font-semibold tracking-tight">You're all set, {name.trim()}</h1>
          <p className="text-sm text-muted">{subs.length} subject{subs.length === 1 ? '' : 's'}, {exams.length} exam{exams.length === 1 ? '' : 's'} and {tasks.length} task{tasks.length === 1 ? '' : 's'} will be added, with a goal of {goal} hours a week.</p>
          <p className="rounded-lg bg-sunken p-3 text-sm">Next, the planner can suggest a study schedule from your exams, tasks and free time. It uses fixed rules rather than AI, shows why it picked each slot, and nothing is saved until you accept it.</p>
        </div>)}
        {err && <p role="alert" className="mt-4 text-sm text-bad">{err}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div>{step === 0 ? <Button variant="ghost" onClick={useSample}>Explore with sample data</Button> : <Button variant="ghost" onClick={() => { setErr(''); setStep((s) => s - 1); }}>Back</Button>}</div>
          <div className="flex gap-2">
            {step === 4 ? (<><Button onClick={() => commit(false)}>Go to dashboard</Button><Button variant="primary" onClick={() => commit(true)} disabled={!subs.length}>Suggest a schedule</Button></>)
              : (<>{(step === 1 || step === 2) && <Button variant="ghost" onClick={() => { setErr(''); setStep((s) => s + 1); }}>Skip</Button>}<Button variant="primary" onClick={next}>Continue</Button></>)}
          </div>
        </div>
      </Card>
    </div>
  );
}
