# Student Study Planner

A working study-planning app for students: subjects, a study planner with calendar views, tasks and assignments,
exam preparation, a weekly timetable, a Pomodoro-style focus timer, and analytics calculated from real activity.

**Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, Lucide icons, Recharts, React Hook Form + Zod, React Router, date-fns.

## Design notes

- **Look:** cool paper background, ink-navy text, and a single highlighter-yellow "marker" cue that means *you are here* (active nav item, the Now pin on today's timeline). Headings use Bricolage Grotesque, body text uses Figtree, both bundled locally via Fontsource.
- **Dashboard:** a Today hero with the next session, a one-tap Start focusing button and a day timeline; the four key numbers live in one stat strip.
- **Navigation:** live badges in the sidebar (overdue tasks, days to the next exam) and a bottom tab bar on phones.
- **Performance:** every page is a lazy-loaded route chunk.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build in dist/
npm run build:single # one self-contained HTML file in dist-single/index.html
npm run typecheck
```

Requires Node 18+. No environment variables are needed to run the app.

## Where your data lives (persistence mode)

**Local-first mode is the only mode implemented.** All data is stored in this browser's `localStorage` behind a small
`StorageAdapter` interface (`src/storage/adapter.ts`). Settings shows the active mode.

- There is **no authentication and no backend connected**. Nothing is synced between devices.
- Clearing browser data removes the planner. Use **Settings > Export** for backups (JSON, re-importable).
- Changes are saved automatically (debounced) and flushed when the tab is hidden. Save failures (for example a full
  quota) show a persistent error banner. Several open tabs stay in sync through the `storage` event.

### Connecting Supabase (not done yet)

`supabase/schema.sql` contains the schema for all entities with check constraints, indexes, composite foreign keys that
stop cross-user references, a server-side overlap trigger for study sessions, and Row Level Security so every row is
readable and writable only by `auth.uid()`. It has not been executed against a live database in this build.
To use it you would still need to: run the SQL, add `@supabase/supabase-js`, implement a `StorageAdapter` (or per-table
services) and a sign-in screen, and fill `.env` from `.env.example`. Only the **anon** key belongs in the browser.

## Features

| Area | What it does |
| --- | --- |
| Onboarding | Profile and term, add subjects, optional exams and assignments, weekly goal, then a suggested schedule. Or explore with sample data. |
| Dashboard | Study hours vs goal, tasks, streak, estimated productivity, today's timeline (sessions and classes), priority tasks, weekly chart, subject progress, deadlines, quick actions. |
| Subjects | Create, edit, archive, delete (with cascade warning). Search, term filter, sort, progress, weekly time vs target, notes and resource links. |
| Study Planner | Day, week and month views. Recurring sessions, overlap blocking, class-conflict warning, completed/skipped/pending, planned vs actual time. |
| Smart planner | Deterministic scheduler (not AI) that scores subjects by exam proximity, remaining syllabus, difficulty, weekly-target deficit and task priority, explains each suggestion, and lets you accept, edit or reject it. |
| Tasks | Filters (subject, status, priority, due), sorting, checklists, overdue flags, statistics, list and month-calendar views. |
| Exams | Countdown, urgency, topics with chapter, confidence (1 to 5) and target date, revision checklist, revision session recommendations. |
| Timetable | Weekly grid, recurring or one-off entries, colour-coded types, conflict warning, day tabs on small screens. |
| Analytics | 7/30/90-day range. Study trend, subject split, planned vs completed, task completion, syllabus completion, estimated productivity, streak, weekday-by-hour heatmap. |
| Focus timer | Configurable lengths, long break cycle, subject/task link, pause/resume, saved sessions. Timestamp-based and persisted, so it survives navigation and refresh. |
| Search, notifications, settings | Global search (press `/` or Ctrl/Cmd+K) with deep links. In-app notifications plus opt-in browser notifications. Profile, goals, theme, accent, first weekday, export/import, sample-data controls. |

### How metrics are defined

- **Study time** = completed planner sessions (actual minutes) + focus-timer sessions. Doing both for the same hour counts twice.
- **Streak** = consecutive days with at least 15 minutes of study time.
- **Productivity** is labelled *estimated*: 60% study time vs your daily share of the weekly goal, 40% tasks finished vs due that day.
- **Sample data** is generated relative to today, flagged `isDemo`, labelled "Sample" in the UI, and removable in one click. Using a sample subject for your own item converts that subject to yours so removal never deletes your work.

## Project structure

```
src/
  components/   ui/ (primitives), layout/, forms/ (RHF + Zod dialogs), charts/, TimeGrid, MonthGrid, PlanDialog, Onboarding
  pages/        Dashboard, Subjects, Planner, Tasks, Exams, Timetable, Analytics, Settings
  store/        AppStore (data + CRUD), UIContext (toasts, confirm, dialogs), TimerContext
  storage/      StorageAdapter interface + localStorage implementation
  lib/          schemas (Zod), stats (all metrics), scheduler, demo data, date helpers
supabase/schema.sql   database schema and RLS policies
```

## Accessibility and responsiveness

Native `<dialog>` modals (focus trap, Esc), visible focus rings, labelled controls with inline errors, `aria-live`
toasts, skip link, keyboard-operable search combobox, reduced-motion support, and light/dark/system themes via CSS
variables. Layouts were checked at 1440px and 390px with no horizontal page overflow.

## Known limitations and deviations from the brief

- **No Supabase connection or auth** (schema only), as described above.
- **shadcn/ui** was not installed; the UI primitives in `src/components/ui` follow the same conventions (tokens, variants) without Radix.
- **FullCalendar** was not used; day/week/month/timetable views are custom components.
- Browser notifications only fire while the app is open; there is no service worker or push.
- Sessions are edited one at a time (deleting offers "this one" then "the rest of the series"); editing a whole series is not supported.
- Pages are code-split; the entry chunk is ~418 kB (124 kB gzipped) and Recharts loads with the Dashboard and Analytics chunks.
- Verified with a type-check, a production build and scripted browser tests of core flows. There is no automated unit-test suite yet.
