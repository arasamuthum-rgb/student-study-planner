import { addDays, differenceInCalendarDays, format, parse, startOfWeek, isValid } from 'date-fns';

export const DATE_FMT = 'yyyy-MM-dd';
export const toDateStr = (d: Date): string => format(d, DATE_FMT);
export const parseDate = (s: string): Date => parse(s, DATE_FMT, new Date());
export const todayStr = (): string => toDateStr(new Date());
export const timeToMin = (t: string): number => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const minToTime = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const durationMin = (start: string, end: string): number => timeToMin(end) - timeToMin(start);
export const dateTime = (date: string, time: string): Date => {
  const d = parse(`${date} ${time || '23:59'}`, `${DATE_FMT} HH:mm`, new Date());
  return isValid(d) ? d : parseDate(date);
};
export const fmtTime = (t: string): string => format(parse(t, 'HH:mm', new Date()), 'h:mm a');
export const fmtDate = (s: string, f = 'EEE, MMM d'): string => (s ? format(parseDate(s), f) : '');
export const daysUntil = (s: string): number => differenceInCalendarDays(parseDate(s), new Date());
export const fmtMinutes = (m: number): string => {
  const r = Math.round(m);
  if (r < 60) return `${r}m`;
  const h = Math.floor(r / 60), mm = r % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
};
export const fmtHours = (m: number): string => `${(m / 60).toFixed(1).replace(/\.0$/, '')}h`;
export function weekStart(d: Date, first: number): Date { return startOfWeek(d, { weekStartsOn: first as 0 | 1 | 6 }); }
export function weekDays(d: Date, first: number): Date[] { const s = weekStart(d, first); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
export function relativeDue(date: string): string {
  const n = daysUntil(date);
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  if (n < 0) return `${-n} days overdue`; if (n < 7) return `In ${n} days`;
  return fmtDate(date, 'MMM d');
}
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function orderedWeekdays(first: number): number[] { return Array.from({ length: 7 }, (_, i) => (first + i) % 7); }
export const timesOverlap = (aS: string, aE: string, bS: string, bE: string): boolean => timeToMin(aS) < timeToMin(bE) && timeToMin(bS) < timeToMin(aE);
