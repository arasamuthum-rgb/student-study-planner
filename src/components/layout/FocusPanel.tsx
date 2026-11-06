import { Link } from 'react-router-dom';
import { Coffee, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/fields';
import { Segmented } from '../ui/fields';
import { useStore } from '../../store/AppStore';
import { useTimer, type Phase } from '../../store/TimerContext';
import { useUI } from '../../store/UIContext';
import { cn } from '../../lib/cn';
import { fmtMinutes } from '../../lib/dates';

const LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

function Ring({ progress, children, phase }: { progress: number; children: React.ReactNode; phase: Phase }) {
  const r = 104, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-60 w-60">
      <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="120" cy="120" r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="10" />
        <circle cx="120" cy="120" r={r} fill="none" stroke={phase === 'focus' ? 'rgb(var(--accent))' : 'rgb(var(--ok))'} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: 'stroke-dashoffset .5s linear, stroke .3s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function FocusPanel() {
  const { focusOpen, setFocusOpen } = useUI(); const t = useTimer(); const { data, updatePrefs } = useStore();
  const secs = Math.ceil(t.msLeft / 1000); const label = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const progress = t.totalMs ? 1 - t.msLeft / t.totalMs : 0;
  const tasks = data.tasks.filter((x) => x.status !== 'completed' && (!t.subjectId || x.subjectId === t.subjectId));
  const idle = t.status === 'idle'; const p = data.prefs;
  const setDur = (k: 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakEvery', v: string, max: number, min = 1) => { const n = Math.round(Number(v)); if (Number.isFinite(n) && n >= min && n <= max) updatePrefs({ [k]: n }); };
  const inCycle = t.cycle % p.longBreakEvery;
  return (
    <Modal open={focusOpen} onClose={() => setFocusOpen(false)} title="Focus timer" description="Work in focused blocks with short breaks in between." variant="right">
      <div className="space-y-5">
        <div className="flex justify-center">
          <Segmented<Phase> label="Timer mode" value={t.phase} onChange={(v) => idle && t.setPhase(v)} options={(['focus', 'short', 'long'] as Phase[]).map((v) => ({ value: v, label: LABEL[v] }))} />
        </div>
        <Ring progress={progress} phase={t.phase}>
          <div>
            <p className="text-5xl font-semibold tabular-nums tracking-tight" role="timer" aria-live="off" aria-label={`${label} remaining`}>{label}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">{t.phase !== 'focus' && <Coffee className="h-3.5 w-3.5" aria-hidden />}{LABEL[t.phase]}{t.status === 'paused' ? ' (paused)' : ''}</p>
          </div>
        </Ring>
        <div className="flex items-center justify-center gap-2">
          {t.status === 'idle' && <Button variant="primary" size="md" className="min-w-28" onClick={t.start}><Play className="h-4 w-4" />Start</Button>}
          {t.status === 'running' && <Button variant="primary" className="min-w-28" onClick={t.pause}><Pause className="h-4 w-4" />Pause</Button>}
          {t.status === 'paused' && <Button variant="primary" className="min-w-28" onClick={t.resume}><Play className="h-4 w-4" />Resume</Button>}
          <Button onClick={t.reset} disabled={idle && t.msLeft === t.totalMs} aria-label="Reset timer"><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button onClick={t.skip} aria-label={t.phase === 'focus' ? 'Skip to break' : 'Skip to focus'}><SkipForward className="h-4 w-4" />Skip</Button>
        </div>
        <p className="text-center text-xs text-muted">Only completed focus sessions are saved. Reset and skip do not record time.</p>
        <div className="flex items-center justify-center gap-1.5" aria-label={`${inCycle} of ${p.longBreakEvery} focus sessions before a long break`} role="img">
          {Array.from({ length: p.longBreakEvery }, (_, i) => <span key={i} className={cn('h-2 w-2 rounded-full', i < inCycle ? 'bg-accent' : 'bg-line')} />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[13px] font-medium">Subject<Select className="mt-1" value={t.subjectId} onChange={(e) => { t.setSubject(e.target.value); t.setTask(''); }}>
            <option value="">No subject</option>{data.subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
          <label className="block text-[13px] font-medium">Task<Select className="mt-1" value={t.taskId} onChange={(e) => t.setTask(e.target.value)}>
            <option value="">No task</option>{tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select></label>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-sunken p-3 text-center">
          <div><p className="text-xl font-semibold tabular-nums">{t.todaySessions}</p><p className="text-xs text-muted">Sessions today</p></div>
          <div><p className="text-xl font-semibold tabular-nums">{fmtMinutes(t.todayMinutes)}</p><p className="text-xs text-muted">Focused today</p></div>
        </div>
        <details className="rounded-xl border border-line px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Timer lengths</summary>
          <div className="grid grid-cols-2 gap-3 pb-2 pt-3">
            {([['focusMinutes', 'Focus (min)', 180], ['shortBreakMinutes', 'Short break (min)', 60], ['longBreakMinutes', 'Long break (min)', 120]] as const).map(([k, l, max]) => (
              <label key={k} className="block text-[13px] font-medium">{l}<Input className="mt-1" type="number" min={1} max={max} defaultValue={p[k]} key={p[k]} disabled={!idle} onBlur={(e) => setDur(k, e.target.value, max)} /></label>
            ))}
            <label className="block text-[13px] font-medium">Long break after<Input className="mt-1" type="number" min={2} max={12} defaultValue={p.longBreakEvery} key={p.longBreakEvery} disabled={!idle} onBlur={(e) => setDur('longBreakEvery', e.target.value, 12, 2)} /></label>
          </div>
          <p className="pb-1 text-xs text-muted">{idle ? 'Changes apply to the next session.' : 'Reset or finish the current session to change lengths.'} <Link to="/settings" onClick={() => setFocusOpen(false)} className="text-accent underline">More settings</Link></p>
        </details>
      </div>
    </Modal>
  );
}
