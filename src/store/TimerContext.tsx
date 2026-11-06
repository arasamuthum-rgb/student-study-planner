import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from './AppStore';
import { useUI } from './UIContext';

export type Phase = 'focus' | 'short' | 'long';
export type TimerStatus = 'idle' | 'running' | 'paused';
interface Persisted { phase: Phase; status: TimerStatus; endsAt: number | null; remainingMs: number; totalMs: number; cycle: number; subjectId: string; taskId: string; startedAt: string }
export interface TimerApi extends Persisted {
  msLeft: number; start(): void; pause(): void; resume(): void; reset(): void; skip(): void; setPhase(p: Phase): void; setSubject(id: string): void; setTask(id: string): void;
  todayMinutes: number; todaySessions: number; durationFor(p: Phase): number;
}
const KEY = 'studyplanner:v1:timer';
const Ctx = createContext<TimerApi | null>(null);
export const useTimer = (): TimerApi => { const c = useContext(Ctx); if (!c) throw new Error('useTimer outside provider'); return c; };

function load(): Partial<Persisted> | null { try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as Partial<Persisted>) : null; } catch { return null; } }

export function TimerProvider({ children }: { children: ReactNode }) {
  const { data, addFocus } = useStore(); const { toast } = useUI(); const p = data.prefs;
  const dur = useCallback((ph: Phase) => (ph === 'focus' ? p.focusMinutes : ph === 'short' ? p.shortBreakMinutes : p.longBreakMinutes) * 60000, [p.focusMinutes, p.shortBreakMinutes, p.longBreakMinutes]);
  const [st, setSt] = useState<Persisted>(() => {
    const s = load(); const base: Persisted = { phase: 'focus', status: 'idle', endsAt: null, remainingMs: 25 * 60000, totalMs: 25 * 60000, cycle: 0, subjectId: '', taskId: '', startedAt: '' };
    return { ...base, ...s };
  });
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(st); ref.current = st;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage unavailable */ } }, [st]);

  // when idle, follow changes to the configured durations
  useEffect(() => { if (st.status === 'idle') setSt((s) => ({ ...s, remainingMs: dur(s.phase), totalMs: dur(s.phase) })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dur]);

  const notify = useCallback((title: string, body: string) => {
    if (data.prefs.browserNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification(title, { body }); } catch { /* ignore */ } }
  }, [data.prefs.browserNotifications]);

  const complete = useCallback((recorded: boolean) => {
    const s = ref.current;
    if (s.phase === 'focus') {
      const cycle = s.cycle + 1; const next: Phase = cycle % p.longBreakEvery === 0 ? 'long' : 'short';
      if (recorded) {
        addFocus({ subjectId: s.subjectId, taskId: s.taskId, startedAt: s.startedAt || new Date(Date.now() - s.totalMs).toISOString(), minutes: Math.max(1, Math.round(s.totalMs / 60000)) });
        toast(`Focus session saved. Time for a ${next === 'long' ? 'long' : 'short'} break.`); notify('Focus session complete', `Nice work. Take a ${next === 'long' ? 'long' : 'short'} break.`);
      } else toast('The timer finished while the app was closed, so it was not recorded.', 'info');
      setSt((x) => ({ ...x, phase: next, status: 'idle', endsAt: null, cycle, remainingMs: dur(next), totalMs: dur(next) }));
    } else {
      toast('Break finished. Ready for the next focus session?', 'info'); notify('Break finished', 'Ready for the next focus session?');
      setSt((x) => ({ ...x, phase: 'focus', status: 'idle', endsAt: null, remainingMs: dur('focus'), totalMs: dur('focus') }));
    }
  }, [addFocus, dur, notify, p.longBreakEvery, toast]);

  useEffect(() => {
    if (st.status !== 'running') return;
    const tick = () => {
      const t = Date.now(); setNow(t); const s = ref.current;
      if (s.status === 'running' && s.endsAt !== null && s.endsAt <= t) complete(t - s.endsAt <= 120000);
    };
    tick(); const i = setInterval(tick, 500); return () => clearInterval(i);
  }, [st.status, complete]);

  const msLeft = st.status === 'running' && st.endsAt ? Math.max(0, st.endsAt - now) : st.remainingMs;
  useEffect(() => {
    const m = Math.ceil(msLeft / 1000); const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    document.title = st.status === 'running' ? `${label} ${st.phase === 'focus' ? 'Focus' : 'Break'} | Study Planner` : 'Student Study Planner';
    return () => { document.title = 'Student Study Planner'; };
  }, [msLeft, st.status, st.phase]);

  const api = useMemo<TimerApi>(() => {
    const today = new Date().toDateString();
    const todays = data.focus.filter((f) => new Date(f.startedAt).toDateString() === today);
    return {
      ...st, msLeft, durationFor: dur, todayMinutes: todays.reduce((a, f) => a + f.minutes, 0), todaySessions: todays.length,
      start: () => setSt((s) => ({ ...s, status: 'running', endsAt: Date.now() + dur(s.phase), totalMs: dur(s.phase), remainingMs: dur(s.phase), startedAt: s.phase === 'focus' ? new Date().toISOString() : s.startedAt })),
      pause: () => setSt((s) => (s.status === 'running' && s.endsAt ? { ...s, status: 'paused', remainingMs: Math.max(0, s.endsAt - Date.now()), endsAt: null } : s)),
      resume: () => setSt((s) => (s.status === 'paused' ? { ...s, status: 'running', endsAt: Date.now() + s.remainingMs } : s)),
      reset: () => setSt((s) => ({ ...s, status: 'idle', endsAt: null, remainingMs: dur(s.phase), totalMs: dur(s.phase) })),
      skip: () => setSt((s) => { const next: Phase = s.phase === 'focus' ? (( s.cycle + 1) % p.longBreakEvery === 0 ? 'long' : 'short') : 'focus'; return { ...s, phase: next, status: 'idle', endsAt: null, remainingMs: dur(next), totalMs: dur(next), cycle: s.phase === 'focus' ? s.cycle + 1 : s.cycle }; }),
      setPhase: (ph) => setSt((s) => (s.status === 'idle' ? { ...s, phase: ph, remainingMs: dur(ph), totalMs: dur(ph) } : s)),
      setSubject: (id) => setSt((s) => ({ ...s, subjectId: id })), setTask: (id) => setSt((s) => ({ ...s, taskId: id })),
    };
  }, [st, msLeft, dur, data.focus, p.longBreakEvery]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
