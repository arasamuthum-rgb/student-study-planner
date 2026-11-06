/** All dates are local wall-clock strings: dates 'yyyy-MM-dd', times 'HH:mm'. Timestamps are ISO-8601 UTC. */
export type ID = string;
export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type SessionStatus = 'pending' | 'completed' | 'skipped';
export type Recurrence = 'none' | 'daily' | 'weekly';
export type EventType = 'lecture' | 'lab' | 'self_study' | 'break' | 'other';
export type ExamType = 'midterm' | 'final' | 'quiz' | 'practical' | 'other';

interface Base { id: ID; isDemo?: boolean; createdAt: string; updatedAt: string }

export interface Subject extends Base {
  name: string; code: string; instructor: string; term: string;
  targetHoursPerWeek: number; color: string; difficulty: 1 | 2 | 3 | 4 | 5;
  totalTopics: number; completedTopics: number; notes: string; resources: string; archived: boolean;
}
export interface ChecklistItem { id: ID; text: string; done: boolean }
export interface Task extends Base {
  title: string; description: string; subjectId: ID; dueDate: string; dueTime: string;
  priority: Priority; status: TaskStatus; estimatedMinutes: number; checklist: ChecklistItem[]; notes: string;
  completedAt: string | null;
}
export interface StudySession extends Base {
  subjectId: ID; date: string; start: string; end: string; topic: string; notes: string;
  priority: Priority; status: SessionStatus; actualMinutes: number | null;
  recurrenceGroupId: ID | null; source: 'manual' | 'recommended';
}
export interface Exam extends Base {
  subjectId: ID; title: string; date: string; time: string; type: ExamType; location: string; targetCompletionDate: string;
}
export interface ExamTopic extends Base {
  examId: ID; chapter: string; title: string; done: boolean; confidence: 1 | 2 | 3 | 4 | 5; targetDate: string;
}
export interface TimetableEvent extends Base {
  title: string; type: EventType; subjectId: ID; location: string;
  /** weekly: repeats every `weekday` (0=Sun..6=Sat). otherwise one-off on `date`. */
  repeat: 'weekly' | 'once'; weekday: number; date: string; start: string; end: string;
}
export interface FocusSession extends Base {
  subjectId: ID; taskId: ID; startedAt: string; minutes: number; kind: 'focus';
}
export interface Preferences {
  theme: 'light' | 'dark' | 'system'; accent: 'sky' | 'indigo' | 'emerald' | 'violet' | 'rose';
  firstDayOfWeek: 0 | 1 | 6; compactSidebar: boolean;
  focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakEvery: number;
  weeklyGoalHours: number; studyDayStart: string; studyDayEnd: string;
  notifyDeadlines: boolean; notifyOverdue: boolean; notifyExams: boolean; browserNotifications: boolean;
  lastBrowserNotifyDate: string;
}
export interface Profile { name: string; email: string; school: string; term: string }
export interface AppData {
  version: 1; onboarded: boolean; profile: Profile; prefs: Preferences;
  subjects: Subject[]; tasks: Task[]; sessions: StudySession[]; exams: Exam[]; examTopics: ExamTopic[];
  events: TimetableEvent[]; focus: FocusSession[]; hasDemo: boolean;
}
export type CollectionKey = 'subjects' | 'tasks' | 'sessions' | 'exams' | 'examTopics' | 'events' | 'focus';
