import { addDays, differenceInCalendarDays } from 'date-fns';
import type { AppData, Exam, StudySession, Subject, Task, TimetableEvent } from '../types';
import { dateTime, daysUntil, durationMin, parseDate, timesOverlap, toDateStr, todayStr } from './dates';
import { STREAK_MIN_MINUTES, PRIORITY_RANK } from './constants';

export const sessionMinutes = (s: StudySession): number => (s.status === 'completed' ? s.actualMinutes ?? durationMin(s.start, s.end) : 0);
export const plannedMinutes = (s: StudySession): number => durationMin(s.start, s.end);

/** Study minutes per local date = minutes from completed planned sessions + focus-timer sessions. */
export function studyMinutesByDate(d: AppData): Map<string, number> {
  const m = new Map<string, number>();
  const add = (k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  d.sessions.forEach((s) => { const v = sessionMinutes(s); if (v) add(s.date, v); });
  d.focus.forEach((f) => add(toDateStr(new Date(f.startedAt)), f.minutes));
  return m;
}
export function sumRange(m: Map<string, number>, from: Date, to: Date): number {
  const a = toDateStr(from), b = toDateStr(to); let t = 0;
  m.forEach((v, k) => { if (k >= a && k <= b) t += v; }); return t;
}
export function minutesBySubject(d: AppData, from: Date, to: Date): Map<string, number> {
  const a = toDateStr(from), b = toDateStr(to); const m = new Map<string, number>();
  const add = (k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  d.sessions.forEach((s) => { if (s.date >= a && s.date <= b) { const v = sessionMinutes(s); if (v) add(s.subjectId, v); } });
  d.focus.forEach((f) => { const k = toDateStr(new Date(f.startedAt)); if (k >= a && k <= b) add(f.subjectId || '_none', f.minutes); });
  return m;
}
export function streak(d: AppData): { current: number; best: number } {
  const m = studyMinutesByDate(d);
  const ok = (dt: Date) => (m.get(toDateStr(dt)) ?? 0) >= STREAK_MIN_MINUTES;
  let cur = 0, day = new Date();
  if (!ok(day)) day = addDays(day, -1);
  while (ok(day)) { cur++; day = addDays(day, -1); }
  const keys = [...m.keys()].filter((k) => (m.get(k) ?? 0) >= STREAK_MIN_MINUTES).sort();
  let best = 0, run = 0, prev: Date | null = null;
  for (const k of keys) { const dt = parseDate(k); run = prev && differenceInCalendarDays(dt, prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = dt; }
  return { current: cur, best };
}
export function taskStats(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === 'completed').length;
  const open = tasks.length - done;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  return { total: tasks.length, done, open, overdue, rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}
export const isOverdue = (t: Task): boolean => t.status !== 'completed' && dateTime(t.dueDate, t.dueTime).getTime() < Date.now();
export const taskChecklistPct = (t: Task): number => (t.checklist.length ? Math.round((t.checklist.filter((c) => c.done).length / t.checklist.length) * 100) : t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0);
export const subjectPct = (s: Subject): number => (s.totalTopics ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0);
export function syllabusPct(subjects: Subject[]): number {
  const t = subjects.reduce((a, s) => a + s.totalTopics, 0); const c = subjects.reduce((a, s) => a + s.completedTopics, 0);
  return t ? Math.round((c / t) * 100) : 0;
}

/** Estimated daily productivity: 60% study minutes vs. daily target, 40% tasks finished vs. due today. */
export function productivityFor(d: AppData, date: string): number {
  const mins = studyMinutesByDate(d).get(date) ?? 0;
  const dailyTarget = (d.prefs.weeklyGoalHours * 60) / 7;
  const studyPct = Math.min(1, mins / Math.max(1, dailyTarget));
  const due = d.tasks.filter((t) => t.dueDate === date || (t.completedAt && toDateStr(new Date(t.completedAt)) === date));
  if (!due.length) return Math.round(studyPct * 100);
  const doneCount = due.filter((t) => t.status === 'completed').length;
  return Math.round((0.6 * studyPct + 0.4 * (doneCount / due.length)) * 100);
}

export function eventsOnDate(events: TimetableEvent[], date: string): TimetableEvent[] {
  const wd = parseDate(date).getDay();
  return events.filter((e) => (e.repeat === 'weekly' ? e.weekday === wd : e.date === date)).sort((a, b) => a.start.localeCompare(b.start));
}
export function sessionsOnDate(sessions: StudySession[], date: string): StudySession[] {
  return sessions.filter((s) => s.date === date).sort((a, b) => a.start.localeCompare(b.start));
}

export function findConflicts(args: { date: string; start: string; end: string; sessions: StudySession[]; events: TimetableEvent[]; excludeId?: string }) {
  const sessions = args.sessions.filter((s) => s.id !== args.excludeId && s.date === args.date && s.status !== 'skipped' && timesOverlap(args.start, args.end, s.start, s.end));
  const events = eventsOnDate(args.events, args.date).filter((e) => e.type !== 'break' && timesOverlap(args.start, args.end, e.start, e.end));
  return { sessions, events };
}

export const examCompletion = (d: AppData, exam: Exam): { total: number; done: number; pct: number; avgConfidence: number } => {
  const ts = d.examTopics.filter((t) => t.examId === exam.id);
  const done = ts.filter((t) => t.done).length;
  return { total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, avgConfidence: ts.length ? ts.reduce((a, t) => a + t.confidence, 0) / ts.length : 0 };
};
/** An exam needs urgent preparation if it is close and the syllabus is not nearly done. */
export function examUrgency(d: AppData, exam: Exam): 'urgent' | 'soon' | 'ok' | 'past' {
  const days = daysUntil(exam.date);
  if (days < 0) return 'past';
  const { pct, total } = examCompletion(d, exam);
  const remaining = total ? 100 - pct : 100;
  if ((days <= 3 && remaining > 20) || (days <= 7 && remaining > 40)) return 'urgent';
  if (days <= 14) return 'soon';
  return 'ok';
}

export interface DeadlineItem { kind: 'task' | 'exam'; id: string; title: string; subjectId: string; when: Date; date: string; priority?: Task['priority'] }
export function upcomingDeadlines(d: AppData, limit = 8, horizonDays = 30): DeadlineItem[] {
  const items: DeadlineItem[] = [];
  d.tasks.filter((t) => t.status !== 'completed').forEach((t) => items.push({ kind: 'task', id: t.id, title: t.title, subjectId: t.subjectId, when: dateTime(t.dueDate, t.dueTime), date: t.dueDate, priority: t.priority }));
  d.exams.forEach((e) => { if (daysUntil(e.date) >= 0) items.push({ kind: 'exam', id: e.id, title: e.title, subjectId: e.subjectId, when: dateTime(e.date, e.time), date: e.date }); });
  const horizon = addDays(new Date(), horizonDays).getTime();
  return items.filter((i) => i.when.getTime() <= horizon).sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, limit);
}
export function priorityTasks(d: AppData, limit = 5): Task[] {
  const horizon = addDays(new Date(), 3).getTime();
  return d.tasks.filter((t) => t.status !== 'completed' && dateTime(t.dueDate, t.dueTime).getTime() <= horizon)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || dateTime(a.dueDate, a.dueTime).getTime() - dateTime(b.dueDate, b.dueTime).getTime()).slice(0, limit);
}

/** weekday x hour matrix (minutes), from focus sessions and completed planned sessions. */
export function heatmap(d: AppData, from: Date, to: Date): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const a = toDateStr(from), b = toDateStr(to);
  d.focus.forEach((f) => { const dt = new Date(f.startedAt); const k = toDateStr(dt); if (k >= a && k <= b) grid[dt.getDay()][dt.getHours()] += f.minutes; });
  d.sessions.forEach((s) => { if (s.date >= a && s.date <= b) { const v = sessionMinutes(s); if (v) grid[parseDate(s.date).getDay()][Number(s.start.slice(0, 2))] += v; } });
  return grid;
}

export interface AppNotification { id: string; kind: 'overdue' | 'deadline' | 'exam' | 'session'; title: string; detail: string; to: string; tone: 'bad' | 'warn' | 'info' }
export function buildNotifications(d: AppData): AppNotification[] {
  const out: AppNotification[] = []; const p = d.prefs; const nowMs = Date.now();
  const subj = (id: string) => d.subjects.find((s) => s.id === id)?.name ?? 'No subject';
  if (p.notifyOverdue) d.tasks.filter(isOverdue).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).forEach((t) => out.push({ id: `o-${t.id}`, kind: 'overdue', tone: 'bad', title: `Overdue: ${t.title}`, detail: `${subj(t.subjectId)}, was due ${t.dueDate}`, to: `/tasks?open=${t.id}` }));
  if (p.notifyDeadlines) d.tasks.filter((t) => t.status !== 'completed' && !isOverdue(t) && dateTime(t.dueDate, t.dueTime).getTime() - nowMs < 48 * 36e5)
    .forEach((t) => out.push({ id: `d-${t.id}`, kind: 'deadline', tone: 'warn', title: `Due soon: ${t.title}`, detail: `${subj(t.subjectId)}, ${t.dueDate} at ${t.dueTime}`, to: `/tasks?open=${t.id}` }));
  if (p.notifyExams) d.exams.filter((e) => { const n = daysUntil(e.date); return n >= 0 && n <= 7; }).sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => { const n = daysUntil(e.date); out.push({ id: `e-${e.id}`, kind: 'exam', tone: n <= 3 ? 'bad' : 'warn', title: `${e.title} ${n === 0 ? 'is today' : n === 1 ? 'is tomorrow' : `in ${n} days`}`, detail: subj(e.subjectId), to: `/exams?open=${e.id}` }); });
  const today = todayStr();
  d.sessions.filter((s) => s.date === today && s.status === 'pending' && dateTime(s.date, s.start).getTime() > nowMs && dateTime(s.date, s.start).getTime() - nowMs < 3 * 36e5)
    .forEach((s) => out.push({ id: `s-${s.id}`, kind: 'session', tone: 'info', title: `Study session at ${s.start}`, detail: `${subj(s.subjectId)}: ${s.topic}`, to: `/planner?open=${s.id}` }));
  return out;
}
