import { addDays } from 'date-fns';
import type { AppData, Priority, Subject } from '../types';
import { daysUntil, minToTime, timeToMin, toDateStr } from './dates';
import { eventsOnDate } from './stats';
import { uid } from './cn';

/**
 * Deterministic, rule-based planner (not AI). For every free slot inside the student's study window it picks the subject
 * with the highest "need" score and records plain-language reasons, so each suggestion can be explained, edited or rejected.
 *
 * score = exam proximity (0-45) + remaining syllabus (0-15) + difficulty (3-15) + weekly-target deficit (0-15) + tasks due soon (0-15)
 */
export interface Recommendation {
  id: string; subjectId: string; date: string; start: string; end: string; topic: string; priority: Priority; score: number; reasons: string[];
}
export interface PlanOptions { subjectId?: string; untilDate?: string; days?: number }

interface Need { score: number; reasons: string[]; hasUrgentExam: boolean; hasHighTask: boolean }

function need(d: AppData, s: Subject, assignedMin: number, plannedInWindow: number, windowDays: number): Need {
  let score = 0; const reasons: string[] = []; let hasUrgentExam = false; let hasHighTask = false;
  const exam = d.exams.filter((e) => e.subjectId === s.id && daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (exam) {
    const n = daysUntil(exam.date);
    if (n <= 30) { score += 35 * (1 - n / 30) + (n <= 7 ? 10 : 0); reasons.push(`${exam.title} is ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`}`); hasUrgentExam = n <= 7; }
    const topics = d.examTopics.filter((t) => t.examId === exam.id);
    const open = topics.filter((t) => !t.done).length;
    if (topics.length && open) { score += (open / topics.length) * 15; reasons.push(`${open} of ${topics.length} exam topics still open`); }
  } else if (s.totalTopics && s.completedTopics < s.totalTopics) {
    const left = s.totalTopics - s.completedTopics; score += (left / s.totalTopics) * 15; reasons.push(`${left} of ${s.totalTopics} syllabus topics left`);
  }
  score += s.difficulty * 3; if (s.difficulty >= 4) reasons.push(`Rated difficulty ${s.difficulty}/5`);
  const target = s.targetHoursPerWeek * 60 * (windowDays / 7);
  if (target > 0) {
    const deficit = Math.max(0, target - plannedInWindow - assignedMin) / target;
    score += deficit * 15; if (deficit > 0.5) reasons.push(`Behind weekly target (${s.targetHoursPerWeek}h/week)`);
  }
  const tasks = d.tasks.filter((t) => t.subjectId === s.id && t.status !== 'completed' && daysUntil(t.dueDate) <= 7);
  const tp = Math.min(15, tasks.reduce((a, t) => a + (t.priority === 'high' ? 6 : t.priority === 'medium' ? 3 : 1), 0));
  if (tp) { score += tp; reasons.push(`${tasks.length} task${tasks.length > 1 ? 's' : ''} due within a week`); }
  hasHighTask = tasks.some((t) => t.priority === 'high' && daysUntil(t.dueDate) <= 3);
  return { score, reasons, hasUrgentExam, hasHighTask };
}

function freeGaps(d: AppData, date: string, from: number, to: number): Array<[number, number]> {
  const busy: Array<[number, number]> = [
    ...d.sessions.filter((s) => s.date === date && s.status !== 'skipped').map((s): [number, number] => [timeToMin(s.start), timeToMin(s.end)]),
    ...eventsOnDate(d.events, date).map((e): [number, number] => [timeToMin(e.start), timeToMin(e.end)]),
  ].sort((a, b) => a[0] - b[0]);
  const gaps: Array<[number, number]> = []; let cur = from;
  for (const [s, e] of busy) { if (s > cur) gaps.push([cur, Math.min(s, to)]); cur = Math.max(cur, e); if (cur >= to) break; }
  if (cur < to) gaps.push([cur, to]);
  return gaps.filter(([a, b]) => b - a >= 45);
}

export function recommendSchedule(d: AppData, opts: PlanOptions = {}): Recommendation[] {
  const subjects = d.subjects.filter((s) => !s.archived && (!opts.subjectId || s.id === opts.subjectId));
  if (!subjects.length) return [];
  const windowDays = opts.days ?? 7;
  const startDay = new Date();
  const dayStart = timeToMin(d.prefs.studyDayStart), dayEnd = timeToMin(d.prefs.studyDayEnd);
  const nowMin = Math.ceil((startDay.getHours() * 60 + startDay.getMinutes() + 15) / 15) * 15;
  const windowFrom = toDateStr(startDay), windowTo = toDateStr(addDays(startDay, windowDays - 1));
  const planned = new Map<string, number>();
  d.sessions.filter((s) => s.date >= windowFrom && s.date <= windowTo && s.status !== 'skipped').forEach((s) => planned.set(s.subjectId, (planned.get(s.subjectId) ?? 0) + timeToMin(s.end) - timeToMin(s.start)));
  const plannedTotal = [...planned.values()].reduce((a, b) => a + b, 0);

  let budget = Math.max(0, d.prefs.weeklyGoalHours * 60 * (windowDays / 7) - plannedTotal);
  if (opts.subjectId) {
    const s = subjects[0]; const exam = d.exams.filter((e) => e.subjectId === s.id && daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
    const open = exam ? d.examTopics.filter((t) => t.examId === exam.id && !t.done).length : Math.max(0, s.totalTopics - s.completedTopics);
    budget = Math.max(60, open * 40);
  }
  const used = new Map<string, number>(); const usedTopics = new Set<string>(); const usedTasks = new Set<string>(); const out: Recommendation[] = [];

  for (let i = 0; i < windowDays && budget >= 30; i++) {
    const day = addDays(startDay, i); const date = toDateStr(day);
    if (opts.untilDate && date > opts.untilDate) break;
    if (opts.subjectId && opts.untilDate && date >= opts.untilDate) break; // never schedule on the exam day itself
    const from = i === 0 ? Math.max(dayStart, nowMin) : dayStart;
    const slots: Array<[number, number]> = [];
    for (const [a, b] of freeGaps(d, date, from, dayEnd)) {
      let cur = a;
      while (b - cur >= 45) { let len = Math.min(60, b - cur); if (b - cur - len < 30 && b - cur <= 80) len = b - cur; slots.push([cur, cur + len]); cur += len + 10; }
    }
    const perDay = new Map<string, number>(); let blocks = 0;
    for (const [a, b] of slots) {
      if (budget < 30 || blocks >= 3) break;
      let best: { s: Subject; n: Need; adj: number } | null = null;
      for (const s of subjects) {
        const n = need(d, s, used.get(s.id) ?? 0, planned.get(s.id) ?? 0, windowDays);
        const adj = n.score * (perDay.get(s.id) ? 0.55 : 1);
        if (!best || adj > best.adj) best = { s, n, adj };
      }
      if (!best) break;
      const { s, n } = best; const len = Math.min(b - a, budget);
      if (len < 30) break;
      const exam = d.exams.filter((e) => e.subjectId === s.id && daysUntil(e.date) >= 0).sort((x, y) => x.date.localeCompare(y.date))[0];
      const nextTopic = exam ? d.examTopics.filter((t) => t.examId === exam.id && !t.done && !usedTopics.has(t.id)).sort((x, y) => x.confidence - y.confidence)[0] : undefined;
      const task = d.tasks.filter((t) => t.subjectId === s.id && t.status !== 'completed').sort((x, y) => x.dueDate.localeCompare(y.dueDate))[0];
      let topic = 'Review course material';
      if (nextTopic) { topic = nextTopic.title; usedTopics.add(nextTopic.id); } else if (task) { topic = `${usedTasks.has(task.id) ? 'Continue' : 'Work on'}: ${task.title}`; usedTasks.add(task.id); }
      const priority: Priority = n.hasUrgentExam || n.hasHighTask ? 'high' : n.score < 22 ? 'low' : 'medium';
      out.push({ id: uid('rec'), subjectId: s.id, date, start: minToTime(a), end: minToTime(a + len), topic, priority, score: Math.round(n.score), reasons: n.reasons.slice(0, 3) });
      used.set(s.id, (used.get(s.id) ?? 0) + len); perDay.set(s.id, (perDay.get(s.id) ?? 0) + 1); budget -= len; blocks++;
    }
  }
  return out;
}
