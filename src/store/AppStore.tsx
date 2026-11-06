import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, ChecklistItem, Exam, ExamTopic, FocusSession, Preferences, Profile, StudySession, Subject, Task, TimetableEvent } from '../types';
import { LocalStorageAdapter, emptyData, normalizeData, type StorageAdapter } from '../storage/adapter';
import { uid } from '../lib/cn';
import { buildDemoData } from '../lib/demo';

type New<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;
const now = () => new Date().toISOString();
const stamp = <T extends object>(v: T, prefix: string) => ({ ...v, id: uid(prefix), createdAt: now(), updatedAt: now() });

export interface Store {
  data: AppData; status: 'loading' | 'ready' | 'error'; error: string | null; saveError: string | null;
  storageLabel: string;
  addSubject(v: New<Subject>): Subject; updateSubject(id: string, p: Partial<Subject>): void; deleteSubject(id: string): void;
  addTask(v: New<Task>): Task; updateTask(id: string, p: Partial<Task>): void; deleteTask(id: string): void; toggleTask(id: string): void;
  toggleChecklist(taskId: string, itemId: string): void; setChecklist(taskId: string, list: ChecklistItem[]): void;
  addSessions(v: New<StudySession>[]): StudySession[]; updateSession(id: string, p: Partial<StudySession>): void; deleteSession(id: string, series?: boolean): void;
  addExam(v: New<Exam>): Exam; updateExam(id: string, p: Partial<Exam>): void; deleteExam(id: string): void;
  addTopic(v: New<ExamTopic>): void; updateTopic(id: string, p: Partial<ExamTopic>): void; deleteTopic(id: string): void;
  addEvent(v: New<TimetableEvent>): TimetableEvent; updateEvent(id: string, p: Partial<TimetableEvent>): void; deleteEvent(id: string): void;
  addFocus(v: Omit<FocusSession, 'id' | 'createdAt' | 'updatedAt' | 'isDemo' | 'kind'>): void;
  updatePrefs(p: Partial<Preferences>): void; updateProfile(p: Partial<Profile>): void; finishOnboarding(): void;
  loadDemo(): void; removeDemo(): void; clearAll(): void; importData(json: string): { ok: true } | { ok: false; error: string };
  exportJson(): string;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => { const s = useContext(Ctx); if (!s) throw new Error('useStore outside provider'); return s; };

const recount = (d: AppData): AppData => ({ ...d, hasDemo: [...d.subjects, ...d.tasks, ...d.sessions, ...d.exams, ...d.events, ...d.focus].some((x) => x.isDemo) });
/** Using a demo subject for your own item turns that subject into yours so "remove demo data" never deletes your work. */
const adopt = (d: AppData, subjectId: string): AppData =>
  subjectId && d.subjects.some((s) => s.id === subjectId && s.isDemo)
    ? { ...d, subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, isDemo: false } : s)) } : d;
const patchIn = <T extends { id: string }>(arr: T[], id: string, p: Partial<T>): T[] =>
  arr.map((x) => (x.id === id ? { ...x, ...p, updatedAt: now() } : x));

export function AppStoreProvider({ children, adapter }: { children: ReactNode; adapter?: StorageAdapter }) {
  const ad = useMemo<StorageAdapter>(() => adapter ?? new LocalStorageAdapter(), [adapter]);
  const [data, setDataRaw] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(data); latest.current = data;
  const dirty = useRef(false);

  useEffect(() => {
    let alive = true;
    ad.load().then((d) => { if (!alive) return; if (d) setDataRaw(d); setStatus('ready'); })
      .catch((e: unknown) => { if (!alive) return; setError(e instanceof Error ? e.message : 'Could not read saved data'); setStatus('error'); });
    return () => { alive = false; };
  }, [ad]);

  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    ad.save(latest.current).then(() => setSaveError(null)).catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save changes'));
  }, [ad]);

  useEffect(() => {
    if (status !== 'ready' || !dirty.current) return;
    const t = setTimeout(flush, 150);
    return () => clearTimeout(t);
  }, [data, status, flush]);
  useEffect(() => {
    const h = () => flush();
    window.addEventListener('pagehide', h); document.addEventListener('visibilitychange', h);
    return () => { window.removeEventListener('pagehide', h); document.removeEventListener('visibilitychange', h); };
  }, [flush]);
  // keep several open tabs in sync
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === LocalStorageAdapter.key && e.newValue) { try { const d = normalizeData(JSON.parse(e.newValue)); if (d) { dirty.current = false; setDataRaw(d); } } catch { /* ignore */ } } };
    window.addEventListener('storage', h); return () => window.removeEventListener('storage', h);
  }, []);

  const set = useCallback((fn: (d: AppData) => AppData) => { dirty.current = true; setDataRaw((d) => recount(fn(d))); }, []);

  const store = useMemo<Store>(() => {
    const s: Store = {
      data, status, error, saveError, storageLabel: ad.label,
      addSubject: (v) => { const x = stamp(v, 'sub') as Subject; set((d) => ({ ...d, subjects: [...d.subjects, x] })); return x; },
      updateSubject: (id, p) => set((d) => ({ ...d, subjects: patchIn(d.subjects, id, { ...p, isDemo: false }) })),
      deleteSubject: (id) => set((d) => {
        const examIds = new Set(d.exams.filter((e) => e.subjectId === id).map((e) => e.id));
        return { ...d, subjects: d.subjects.filter((x) => x.id !== id), tasks: d.tasks.filter((x) => x.subjectId !== id),
          sessions: d.sessions.filter((x) => x.subjectId !== id), exams: d.exams.filter((x) => x.subjectId !== id),
          examTopics: d.examTopics.filter((t) => !examIds.has(t.examId)),
          events: d.events.map((e) => (e.subjectId === id ? { ...e, subjectId: '' } : e)),
          focus: d.focus.map((f) => (f.subjectId === id ? { ...f, subjectId: '' } : f)) };
      }),
      addTask: (v) => { const x = stamp(v, 'task') as Task; set((d) => ({ ...adopt(d, v.subjectId), tasks: [...d.tasks, x] })); return x; },
      updateTask: (id, p) => set((d) => ({ ...d, tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...p, updatedAt: now() };
        if (p.status && p.status !== t.status) next.completedAt = p.status === 'completed' ? now() : null;
        return next;
      }) })),
      deleteTask: (id) => set((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id), focus: d.focus.map((f) => (f.taskId === id ? { ...f, taskId: '' } : f)) })),
      toggleTask: (id) => set((d) => ({ ...d, tasks: d.tasks.map((t) => t.id !== id ? t : t.status === 'completed'
        ? { ...t, status: 'not_started', completedAt: null, updatedAt: now() } : { ...t, status: 'completed', completedAt: now(), updatedAt: now() }) })),
      toggleChecklist: (taskId, itemId) => set((d) => ({ ...d, tasks: d.tasks.map((t) => t.id !== taskId ? t : { ...t, updatedAt: now(),
        checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }) })),
      setChecklist: (taskId, list) => set((d) => ({ ...d, tasks: patchIn(d.tasks, taskId, { checklist: list }) })),
      addSessions: (vs) => { const xs = vs.map((v) => stamp(v, 'ses') as StudySession); set((d) => ({ ...adopt(d, vs[0]?.subjectId ?? ''), sessions: [...d.sessions, ...xs] })); return xs; },
      updateSession: (id, p) => set((d) => ({ ...d, sessions: patchIn(d.sessions, id, p) })),
      deleteSession: (id, series) => set((d) => {
        const target = d.sessions.find((x) => x.id === id);
        return { ...d, sessions: d.sessions.filter((x) => x.id !== id && !(series && target?.recurrenceGroupId && x.recurrenceGroupId === target.recurrenceGroupId && x.date >= target.date)) };
      }),
      addExam: (v) => { const x = stamp(v, 'exam') as Exam; set((d) => ({ ...adopt(d, v.subjectId), exams: [...d.exams, x] })); return x; },
      updateExam: (id, p) => set((d) => ({ ...d, exams: patchIn(d.exams, id, p) })),
      deleteExam: (id) => set((d) => ({ ...d, exams: d.exams.filter((e) => e.id !== id), examTopics: d.examTopics.filter((t) => t.examId !== id) })),
      addTopic: (v) => set((d) => ({ ...d, examTopics: [...d.examTopics, stamp(v, 'top') as ExamTopic] })),
      updateTopic: (id, p) => set((d) => ({ ...d, examTopics: patchIn(d.examTopics, id, p) })),
      deleteTopic: (id) => set((d) => ({ ...d, examTopics: d.examTopics.filter((t) => t.id !== id) })),
      addEvent: (v) => { const x = stamp(v, 'evt') as TimetableEvent; set((d) => ({ ...adopt(d, v.subjectId), events: [...d.events, x] })); return x; },
      updateEvent: (id, p) => set((d) => ({ ...d, events: patchIn(d.events, id, p) })),
      deleteEvent: (id) => set((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) })),
      addFocus: (v) => set((d) => ({ ...adopt(d, v.subjectId), focus: [...d.focus, { ...stamp(v, 'foc'), kind: 'focus' } as FocusSession] })),
      updatePrefs: (p) => set((d) => ({ ...d, prefs: { ...d.prefs, ...p } })),
      updateProfile: (p) => set((d) => ({ ...d, profile: { ...d.profile, ...p } })),
      finishOnboarding: () => set((d) => ({ ...d, onboarded: true })),
      loadDemo: () => set((d) => {
        const demo = buildDemoData(d.prefs);
        return { ...d, onboarded: true, subjects: [...d.subjects, ...demo.subjects], tasks: [...d.tasks, ...demo.tasks], sessions: [...d.sessions, ...demo.sessions],
          exams: [...d.exams, ...demo.exams], examTopics: [...d.examTopics, ...demo.examTopics], events: [...d.events, ...demo.events], focus: [...d.focus, ...demo.focus] };
      }),
      removeDemo: () => set((d) => {
        const subs = d.subjects.filter((x) => !x.isDemo); const subIds = new Set(subs.map((x) => x.id));
        const exams = d.exams.filter((x) => !x.isDemo && subIds.has(x.subjectId)); const examIds = new Set(exams.map((x) => x.id));
        return { ...d, subjects: subs, tasks: d.tasks.filter((x) => !x.isDemo && subIds.has(x.subjectId)),
          sessions: d.sessions.filter((x) => !x.isDemo && subIds.has(x.subjectId)), exams,
          examTopics: d.examTopics.filter((t) => examIds.has(t.examId)),
          events: d.events.filter((x) => !x.isDemo).map((e) => (subIds.has(e.subjectId) ? e : { ...e, subjectId: '' })),
          focus: d.focus.filter((x) => !x.isDemo).map((f) => (subIds.has(f.subjectId) ? f : { ...f, subjectId: '' })) };
      }),
      clearAll: () => set((d) => ({ ...emptyData(), onboarded: true, prefs: d.prefs, profile: d.profile })),
      importData: (json) => {
        try {
          const d = normalizeData(JSON.parse(json));
          if (!d) return { ok: false, error: 'This file is not a Study Planner export (version 1).' };
          set(() => d); return { ok: true };
        } catch { return { ok: false, error: 'The file is not valid JSON.' }; }
      },
      exportJson: () => JSON.stringify(latest.current, null, 2),
    };
    return s;
  }, [data, status, error, saveError, ad, set]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}


