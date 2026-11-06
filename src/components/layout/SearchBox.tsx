import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarClock, GraduationCap, ListChecks, Search } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { cn } from '../../lib/cn';
import { fmtDate } from '../../lib/dates';

interface Result { key: string; group: string; title: string; sub: string; to: string; icon: typeof Search }

export function SearchBox() {
  const { data } = useStore(); const nav = useNavigate();
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null); const box = useRef<HTMLDivElement>(null); const listId = useId();
  const subj = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? '';

  const results = useMemo<Result[]>(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    const has = (...v: string[]) => v.some((x) => x.toLowerCase().includes(t));
    const out: Result[] = [];
    data.subjects.filter((s) => has(s.name, s.code, s.instructor, s.notes)).slice(0, 4).forEach((s) => out.push({ key: s.id, group: 'Subjects', title: s.name, sub: [s.code, s.term].filter(Boolean).join(', '), to: `/subjects?open=${s.id}`, icon: BookOpen }));
    data.tasks.filter((x) => has(x.title, x.description, x.notes)).slice(0, 4).forEach((x) => out.push({ key: x.id, group: 'Tasks', title: x.title, sub: `${subj(x.subjectId)}, due ${fmtDate(x.dueDate)}`, to: `/tasks?open=${x.id}`, icon: ListChecks }));
    data.exams.filter((x) => has(x.title, x.location)).slice(0, 3).forEach((x) => out.push({ key: x.id, group: 'Exams', title: x.title, sub: `${subj(x.subjectId)}, ${fmtDate(x.date)}`, to: `/exams?open=${x.id}`, icon: GraduationCap }));
    data.sessions.filter((x) => has(x.topic, x.notes)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).forEach((x) => out.push({ key: x.id, group: 'Study sessions', title: x.topic, sub: `${subj(x.subjectId)}, ${fmtDate(x.date)} ${x.start}`, to: `/planner?open=${x.id}`, icon: CalendarClock }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))) { e.preventDefault(); input.current?.focus(); setOpen(true); } };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, []);
  const go = (r: Result) => { setOpen(false); setQ(''); input.current?.blur(); nav(r.to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
  };
  let last = '';
  return (
    <div ref={box} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input ref={input} type="search" role="combobox" aria-expanded={open && !!q.trim()} aria-controls={listId} aria-autocomplete="list" aria-label="Search subjects, tasks, exams and sessions"
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined} value={q} placeholder="Search everything" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        className="h-9 w-full rounded-lg border border-line bg-sunken pl-9 pr-12 text-sm placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 [&::-webkit-search-cancel-button]:hidden" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[11px] text-muted sm:block" aria-hidden>/</kbd>
      {open && q.trim() && (
        <div id={listId} role="listbox" aria-label="Search results" className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] animate-pop overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No matches for "{q.trim()}"</p>}
          {results.map((r, i) => {
            const header = r.group !== last; last = r.group; const Icon = r.icon;
            return (
              <div key={r.key}>
                {header && <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted">{r.group}</p>}
                <div id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', i === active && 'bg-sunken')}>
                  <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{r.title}</p><p className="truncate text-xs text-muted">{r.sub}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
