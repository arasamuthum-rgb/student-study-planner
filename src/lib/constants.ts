import type { EventType, ExamType, Priority, TaskStatus, SessionStatus } from '../types';
export const SUBJECT_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const STATUS_LABEL: Record<TaskStatus, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = { pending: 'Pending', completed: 'Completed', skipped: 'Skipped' };
export const EVENT_LABEL: Record<EventType, string> = { lecture: 'Lecture', lab: 'Lab', self_study: 'Self-study', break: 'Break', other: 'Other' };
export const EVENT_COLOR: Record<EventType, string> = { lecture: '#6366f1', lab: '#0ea5e9', self_study: '#10b981', break: '#94a3b8', other: '#f59e0b' };
export const EXAM_LABEL: Record<ExamType, string> = { midterm: 'Midterm', final: 'Final', quiz: 'Quiz', practical: 'Practical', other: 'Other' };
export const TERMS = ['Fall 2026', 'Spring 2027', 'Summer 2027', 'Semester 1', 'Semester 2', 'Term 1', 'Term 2', 'Term 3'];
export const STREAK_MIN_MINUTES = 15;
export const ACCENTS = [
  { id: 'sky', label: 'Ink blue', swatch: '#3448eb' }, { id: 'indigo', label: 'Sky', swatch: '#0278b9' },
  { id: 'emerald', label: 'Emerald', swatch: '#047857' }, { id: 'violet', label: 'Violet', swatch: '#6d28d9' },
  { id: 'rose', label: 'Rose', swatch: '#be123c' },
] as const;
