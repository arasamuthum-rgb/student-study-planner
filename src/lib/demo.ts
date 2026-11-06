import { addDays } from 'date-fns';
import type { AppData, Exam, ExamTopic, FocusSession, Preferences, StudySession, Subject, Task, TimetableEvent, Priority, TaskStatus } from '../types';
import { toDateStr } from './dates';
import { uid } from './cn';

type Demo = Pick<AppData, 'subjects' | 'tasks' | 'sessions' | 'exams' | 'examTopics' | 'events' | 'focus'>;

function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Sample data, generated relative to today and flagged isDemo so it can be removed in one click. */
export function buildDemoData(_prefs: Preferences): Demo {
  const stamp = new Date().toISOString();
  const base = { isDemo: true, createdAt: stamp, updatedAt: stamp };
  const day = (o: number) => toDateStr(addDays(new Date(), o));
  const r = rng(Number(day(0).replace(/-/g, '')));

  const mk = (name: string, code: string, instructor: string, target: number, color: string, difficulty: 1 | 2 | 3 | 4 | 5, total: number, done: number, notes: string, resources: string): Subject =>
    ({ ...base, id: uid('sub'), name, code, instructor, term: 'Fall 2026', targetHoursPerWeek: target, color, difficulty, totalTopics: total, completedTopics: done, notes, resources, archived: false });
  const subjects = [
    mk('Calculus II', 'MATH201', 'Dr. Rao', 5, '#0ea5e9', 4, 24, 14, 'Series and convergence tests need the most practice.', 'https://openstax.org/details/books/calculus-volume-2\nPast papers folder on the course portal'),
    mk('Organic Chemistry', 'CHEM210', 'Prof. Lindqvist', 5, '#8b5cf6', 5, 20, 8, 'Focus on reaction mechanisms before memorising reagents.', 'Lecture slides weeks 1 to 7'),
    mk('Data Structures', 'CS220', 'Ms. Okafor', 4, '#10b981', 3, 18, 12, '', 'https://visualgo.net'),
    mk('World History', 'HIST105', 'Dr. Mendes', 3, '#f59e0b', 2, 16, 11, 'Essay on the Industrial Revolution due soon.', ''),
    mk('Academic Writing', 'ENG101', 'Prof. Hale', 2, '#ec4899', 2, 10, 6, '', ''),
  ];
  const [calc, chem, ds, hist, eng] = subjects;

  const task = (title: string, s: Subject, off: number, time: string, priority: Priority, status: TaskStatus, est: number, check: string[] = [], desc = ''): Task => ({
    ...base, id: uid('task'), title, description: desc, subjectId: s.id, dueDate: day(off), dueTime: time, priority, status, estimatedMinutes: est, notes: '',
    checklist: check.map((t, i) => ({ id: uid('chk'), text: t, done: status === 'completed' || (status === 'in_progress' && i === 0) })),
    completedAt: status === 'completed' ? new Date(Date.now() + off * 864e5).toISOString() : null,
  });
  const tasks = [
    task('Problem set 6: series convergence', calc, -1, '23:59', 'high', 'in_progress', 120, ['Ratio test problems', 'Comparison test problems', 'Alternating series'], 'Textbook chapter 8, exercises 1 to 30.'),
    task('Lab report: titration', chem, 0, '17:00', 'high', 'in_progress', 90, ['Data table', 'Calculations', 'Discussion'], 'Write up results from Thursday lab.'),
    task('Binary tree implementation', ds, 1, '23:59', 'medium', 'not_started', 150, ['Insert and delete', 'Traversals', 'Unit tests']),
    task('Read chapters 9 and 10', hist, 2, '12:00', 'low', 'not_started', 75),
    task('Essay draft: Industrial Revolution', hist, 4, '23:59', 'high', 'not_started', 180, ['Outline', 'First draft', 'Citations'], '1,500 words.'),
    task('Peer review of thesis statement', eng, 3, '18:00', 'medium', 'not_started', 45),
    task('Mechanisms worksheet', chem, 6, '23:59', 'medium', 'not_started', 100),
    task('Graph algorithms assignment', ds, 9, '23:59', 'high', 'not_started', 200, ['BFS and DFS', 'Dijkstra', 'Write-up']),
    task('Annotated bibliography', eng, 12, '23:59', 'low', 'not_started', 90),
    task('Quiz 3 revision notes', calc, -2, '10:00', 'medium', 'completed', 60),
    task('Reading response', hist, -4, '23:59', 'low', 'completed', 40),
    task('Array exercises', ds, -6, '23:59', 'medium', 'completed', 60),
  ];

  const ses = (off: number, start: string, end: string, s: Subject, topic: string, priority: Priority = 'medium'): StudySession => {
    const past = off < 0; const roll = r();
    const status = past ? (roll < 0.8 ? 'completed' : 'skipped') : 'pending';
    const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
    const dur = eh * 60 + em - (sh * 60 + sm);
    return { ...base, id: uid('ses'), subjectId: s.id, date: day(off), start, end, topic, notes: '', priority, status, actualMinutes: status === 'completed' ? Math.max(20, dur - Math.round(r() * 15)) : null, recurrenceGroupId: null, source: 'manual' };
  };
  const sessions = [
    ses(-6, '18:00', '19:30', calc, 'Integration techniques'), ses(-5, '17:30', '19:00', chem, 'Alkene reactions', 'high'), ses(-4, '18:00', '19:00', ds, 'Linked lists'),
    ses(-3, '18:00', '20:00', calc, 'Sequences and series', 'high'), ses(-2, '17:30', '18:30', hist, 'Industrial Revolution notes'), ses(-1, '18:30', '20:00', chem, 'Stereochemistry', 'high'),
    ses(0, '18:00', '19:30', calc, 'Convergence tests', 'high'), ses(0, '20:00', '21:00', ds, 'Binary trees'),
    ses(1, '17:30', '19:00', chem, 'Mechanisms practice', 'high'), ses(2, '18:00', '19:00', hist, 'Essay outline'), ses(3, '18:00', '19:30', calc, 'Past paper', 'medium'),
    ses(4, '10:00', '12:00', chem, 'Midterm revision', 'high'), ses(5, '10:00', '11:30', ds, 'Graphs'), ses(6, '17:30', '19:00', calc, 'Power series'),
  ];

  const ev = (title: string, type: TimetableEvent['type'], s: Subject | null, weekday: number, start: string, end: string, location: string): TimetableEvent =>
    ({ ...base, id: uid('evt'), title, type, subjectId: s?.id ?? '', repeat: 'weekly', weekday, date: '', start, end, location });
  const events = [
    ev('Calculus II lecture', 'lecture', calc, 1, '09:00', '10:30', 'Hall B'), ev('Calculus II lecture', 'lecture', calc, 3, '09:00', '10:30', 'Hall B'),
    ev('Organic Chemistry lecture', 'lecture', chem, 2, '10:00', '11:30', 'Science 204'), ev('Organic Chemistry lab', 'lab', chem, 4, '14:00', '17:00', 'Lab 3'),
    ev('Data Structures lecture', 'lecture', ds, 1, '13:00', '14:30', 'CS Building 12'), ev('Data Structures lab', 'lab', ds, 3, '14:00', '16:00', 'Computer Lab 1'),
    ev('World History seminar', 'lecture', hist, 5, '11:00', '12:00', 'Arts 101'), ev('Academic Writing', 'lecture', eng, 5, '13:00', '14:30', 'Arts 110'),
    ev('Lunch', 'break', null, 1, '12:00', '13:00', ''), ev('Library self-study', 'self_study', null, 2, '14:00', '16:00', 'Main library'),
  ];

  const exam = (title: string, s: Subject, off: number, time: string, type: Exam['type'], target: number): Exam =>
    ({ ...base, id: uid('exam'), subjectId: s.id, title, date: day(off), time, type, location: 'Exam Hall A', targetCompletionDate: day(target) });
  const exams = [exam('Organic Chemistry midterm', chem, 5, '10:00', 'midterm', 3), exam('Calculus II midterm', calc, 9, '09:00', 'midterm', 7), exam('Data Structures quiz', ds, 16, '13:00', 'quiz', 14), exam('World History final', hist, 41, '14:00', 'final', 38)];
  const topic = (e: Exam, chapter: string, title: string, done: boolean, confidence: 1 | 2 | 3 | 4 | 5, off: number): ExamTopic =>
    ({ ...base, id: uid('top'), examId: e.id, chapter, title, done, confidence, targetDate: day(off) });
  const [eChem, eCalc, eDs] = exams;
  const examTopics = [
    topic(eChem, 'Reactions', 'Alkene addition reactions', true, 4, -3), topic(eChem, 'Reactions', 'Alkyl halide substitution', true, 3, -2), topic(eChem, 'Reactions', 'Elimination reactions', false, 2, 1),
    topic(eChem, 'Stereochemistry', 'Chirality and R/S naming', true, 3, -1), topic(eChem, 'Stereochemistry', 'Optical activity', false, 1, 2), topic(eChem, 'Spectroscopy', 'IR interpretation', false, 2, 3), topic(eChem, 'Spectroscopy', 'NMR basics', false, 1, 3),
    topic(eCalc, 'Integration', 'Integration by parts', true, 5, -5), topic(eCalc, 'Integration', 'Trigonometric substitution', true, 3, -2), topic(eCalc, 'Series', 'Ratio and root tests', false, 2, 3),
    topic(eCalc, 'Series', 'Power series', false, 2, 5), topic(eCalc, 'Series', 'Taylor series', false, 1, 6), topic(eCalc, 'Applications', 'Arc length and surface area', false, 3, 6),
    topic(eDs, 'Trees', 'Binary search trees', true, 4, 4), topic(eDs, 'Trees', 'Balanced trees', false, 2, 8), topic(eDs, 'Graphs', 'Traversal', false, 3, 10), topic(eDs, 'Graphs', 'Shortest paths', false, 1, 12),
  ];

  const focus: FocusSession[] = [];
  const nowD = new Date();
  for (let off = -41; off <= 0; off++) {
    const d = addDays(nowD, off); const wk = d.getDay() === 0 || d.getDay() === 6;
    if (r() > (wk ? 0.5 : 0.82)) continue;
    const count = 1 + Math.floor(r() * (wk ? 3 : 4));
    for (let i = 0; i < count; i++) {
      const hour = Math.min(22, Math.round(9 + r() * 12 + (r() > 0.55 ? 3 : 0)));
      const start = new Date(d); start.setHours(hour, Math.floor(r() * 4) * 15, 0, 0);
      if (start.getTime() > nowD.getTime() - 40 * 60000) continue;
      const s = subjects[Math.floor(Math.pow(r(), 1.3) * subjects.length)];
      focus.push({ ...base, id: uid('foc'), subjectId: s.id, taskId: '', startedAt: start.toISOString(), minutes: r() > 0.8 ? 45 : r() > 0.5 ? 50 : 25, kind: 'focus' });
    }
  }
  return { subjects, tasks, sessions, exams, examTopics, events, focus };
}
