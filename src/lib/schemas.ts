import { z } from 'zod';
import { timeToMin } from './dates';

const num = (label: string, min: number, max: number) =>
  z.number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);
const int = (label: string, min: number, max: number) => num(label, min, max).int(`${label} must be a whole number`);
const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);
const time = (label: string) => z.string().regex(/^\d{2}:\d{2}$/, `${label} is required`);
const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const subjectSchema = z.object({
  name: text('Subject name', 80), code: z.string().trim().max(20, 'Code is too long'), instructor: z.string().trim().max(80),
  term: text('Academic term', 40), targetHoursPerWeek: num('Target hours', 0, 80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  difficulty: int('Difficulty', 1, 5), totalTopics: int('Total topics', 0, 500), completedTopics: int('Completed topics', 0, 500),
  notes: z.string().max(5000), resources: z.string().max(3000),
}).refine((v) => v.completedTopics <= v.totalTopics, { path: ['completedTopics'], message: 'Cannot exceed total topics' });
export type SubjectForm = z.infer<typeof subjectSchema>;

export const taskSchema = z.object({
  title: text('Title', 120), description: z.string().max(2000), subjectId: z.string().min(1, 'Choose a subject'),
  dueDate: date('Due date'), dueTime: time('Due time'), priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['not_started', 'in_progress', 'completed']), estimatedMinutes: int('Estimate', 5, 2400), notes: z.string().max(3000),
});
export type TaskForm = z.infer<typeof taskSchema>;

export const sessionSchema = z.object({
  subjectId: z.string().min(1, 'Choose a subject'), date: date('Date'), start: time('Start time'), end: time('End time'),
  topic: text('Topic', 120), notes: z.string().max(2000), priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'completed', 'skipped']), actualMinutes: z.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes only').min(1, 'At least 1 minute').max(720, 'At most 720 minutes').nullable(), recurrence: z.enum(['none', 'daily', 'weekly']), occurrences: int('Occurrences', 1, 30),
}).refine((v) => timeToMin(v.end) > timeToMin(v.start), { path: ['end'], message: 'End time must be after start time' })
  .refine((v) => timeToMin(v.end) - timeToMin(v.start) >= 10, { path: ['end'], message: 'Sessions must be at least 10 minutes' });
export type SessionFormValues = z.infer<typeof sessionSchema>;

export const examSchema = z.object({
  subjectId: z.string().min(1, 'Choose a subject'), title: text('Exam title', 100), date: date('Exam date'), time: time('Start time'),
  type: z.enum(['midterm', 'final', 'quiz', 'practical', 'other']), location: z.string().max(80), targetCompletionDate: z.string(),
}).refine((v) => !v.targetCompletionDate || v.targetCompletionDate <= v.date, { path: ['targetCompletionDate'], message: 'Target must be on or before the exam date' });
export type ExamFormValues = z.infer<typeof examSchema>;

export const eventSchema = z.object({
  title: text('Title', 80), type: z.enum(['lecture', 'lab', 'self_study', 'break', 'other']), subjectId: z.string(), location: z.string().max(80),
  repeat: z.enum(['weekly', 'once']), weekday: int('Day', 0, 6), date: z.string(), start: time('Start time'), end: time('End time'),
}).refine((v) => timeToMin(v.end) > timeToMin(v.start), { path: ['end'], message: 'End time must be after start time' })
  .refine((v) => v.repeat === 'weekly' || /^\d{4}-\d{2}-\d{2}$/.test(v.date), { path: ['date'], message: 'Date is required' });
export type EventFormValues = z.infer<typeof eventSchema>;

export const topicSchema = z.object({ chapter: z.string().trim().max(80), title: text('Topic', 120) });
export const profileSchema = z.object({
  name: text('Name', 60), email: z.string().trim().email('Enter a valid email').or(z.literal('')), school: z.string().trim().max(80), term: text('Academic term', 40),
});
export type ProfileForm = z.infer<typeof profileSchema>;
export const prefsSchema = z.object({
  weeklyGoalHours: num('Weekly goal', 1, 100), studyDayStart: time('Start'), studyDayEnd: time('End'),
  focusMinutes: int('Focus length', 1, 180), shortBreakMinutes: int('Short break', 1, 60), longBreakMinutes: int('Long break', 1, 120), longBreakEvery: int('Sessions before long break', 2, 12),
}).refine((v) => timeToMin(v.studyDayEnd) - timeToMin(v.studyDayStart) >= 60, { path: ['studyDayEnd'], message: 'Study window must be at least one hour' });
export type PrefsForm = z.infer<typeof prefsSchema>;
