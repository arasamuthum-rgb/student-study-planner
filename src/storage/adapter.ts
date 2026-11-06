import type { AppData, Preferences } from '../types';

/**
 * Persistence boundary. The app only talks to this interface, so a Supabase-backed adapter can be
 * dropped in later (see supabase/schema.sql). Today only the local adapter is implemented.
 */
export interface StorageAdapter {
  readonly mode: 'local';
  readonly label: string;
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export const defaultPrefs: Preferences = {
  theme: 'light', accent: 'sky', firstDayOfWeek: 1, compactSidebar: false,
  focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4,
  weeklyGoalHours: 15, studyDayStart: '08:00', studyDayEnd: '21:00',
  notifyDeadlines: true, notifyOverdue: true, notifyExams: true, browserNotifications: false, lastBrowserNotifyDate: '',
};

export function emptyData(): AppData {
  return {
    version: 1, onboarded: false, hasDemo: false,
    profile: { name: '', email: '', school: '', term: 'Fall 2026' },
    prefs: { ...defaultPrefs },
    subjects: [], tasks: [], sessions: [], exams: [], examTopics: [], events: [], focus: [],
  };
}

const ARRAYS = ['subjects', 'tasks', 'sessions', 'exams', 'examTopics', 'events', 'focus'] as const;

/** Validates and normalises untrusted data (storage or file import). Returns null if unusable. */
export function normalizeData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  const base = emptyData();
  for (const k of ARRAYS) {
    if (!Array.isArray(r[k])) return null;
    for (const item of r[k] as unknown[]) {
      if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') return null;
    }
  }
  const out = { ...base, ...(r as object) } as AppData;
  out.prefs = { ...defaultPrefs, ...((r.prefs as object) ?? {}) };
  out.profile = { ...base.profile, ...((r.profile as object) ?? {}) };
  out.hasDemo = [...out.subjects, ...out.tasks, ...out.sessions, ...out.exams, ...out.events, ...out.focus].some((x) => x.isDemo);
  return out;
}

const KEY = 'studyplanner:v1:data';

export class LocalStorageAdapter implements StorageAdapter {
  readonly mode = 'local' as const;
  readonly label = 'This browser (localStorage)';
  async load(): Promise<AppData | null> {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    return normalizeData(JSON.parse(s));
  }
  async save(data: AppData): Promise<void> { localStorage.setItem(KEY, JSON.stringify(data)); }
  async clear(): Promise<void> { localStorage.removeItem(KEY); }
  static readonly key = KEY;
}
