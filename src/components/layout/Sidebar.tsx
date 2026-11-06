import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { BarChart3, BookOpen, CalendarClock, CalendarDays, GraduationCap, HardDrive, LayoutDashboard, ListChecks, PanelLeftClose, PanelLeftOpen, Settings, NotebookPen, Ellipsis } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { Modal } from '../ui/Modal';
import { taskStats } from '../../lib/stats';
import { parseDate, todayStr } from '../../lib/dates';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/subjects', label: 'My Subjects', icon: BookOpen },
  { to: '/planner', label: 'Study Planner', icon: CalendarClock },
  { to: '/tasks', label: 'Tasks & Assignments', icon: ListChecks },
  { to: '/exams', label: 'Exam Preparation', icon: GraduationCap },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/analytics', label: 'Study Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Small live counts shown next to nav items so the sidebar doubles as a status glance. */
function useNavBadges(): Record<string, { text: string; tone: 'bad' | 'warn' } | undefined> {
  const { data } = useStore();
  return useMemo(() => {
    const overdue = taskStats(data.tasks).overdue; const today = todayStr();
    const next = data.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const days = next ? differenceInCalendarDays(parseDate(next.date), parseDate(today)) : null;
    return {
      '/tasks': overdue > 0 ? { text: `${overdue} overdue`, tone: 'bad' as const } : undefined,
      '/exams': days !== null && days <= 14 ? { text: days === 0 ? 'today' : `${days}d`, tone: days <= 3 ? 'bad' as const : 'warn' as const } : undefined,
    };
  }, [data.tasks, data.exams]);
}

function NavList({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const badges = useNavBadges();
  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} title={compact ? label : undefined}
          className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', compact && 'justify-center px-0',
            isActive ? 'marker font-semibold text-fg' : 'text-muted hover:bg-sunken hover:text-fg')}>
          {({ isActive }) => (<>
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className={cn('flex-1', compact && 'sr-only')}>{label}</span>
            {badges[to] && <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', compact ? 'absolute right-1 top-1 px-1' : '', badges[to]!.tone === 'bad' ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn')}>{compact ? <span aria-hidden>•</span> : badges[to]!.text}{compact && <span className="sr-only">{badges[to]!.text}</span>}</span>}
            {isActive && <span className="sr-only">(current page)</span>}
          </>)}
        </NavLink>
      ))}
    </nav>
  );
}
function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex h-16 items-center gap-2.5 px-5', compact && 'justify-center px-0')}>
      <div className="rounded-lg bg-accent p-1.5 text-accent-fg"><NotebookPen className="h-4 w-4" aria-hidden /></div>
      <span className={cn('font-display text-lg font-semibold tracking-tight', compact && 'sr-only')}>Study Planner</span>
    </div>
  );
}

export function Sidebar() {
  const { data, updatePrefs } = useStore(); const compact = data.prefs.compactSidebar;
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex', compact ? 'w-[72px]' : 'w-64')}>
      <Brand compact={compact} />
      <NavList compact={compact} />
      <div className="space-y-2 border-t border-line p-3">
        {!compact && <p className="flex items-center gap-2 px-2 text-xs text-muted"><HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />Saved in this browser</p>}
        <button type="button" onClick={() => updatePrefs({ compactSidebar: !compact })} aria-pressed={compact} title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-fg', compact && 'justify-center px-0')}>
          {compact ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          <span className={cn(compact && 'sr-only')}>{compact ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
    </aside>
  );
}
export function MobileNav() {
  const { navOpen, setNavOpen } = useUI();
  return (
    <Modal open={navOpen} onClose={() => setNavOpen(false)} title="Navigation" variant="left" hideHeader>
      <div className="-mx-5 -my-4 flex h-full flex-col"><Brand /><NavList onNavigate={() => setNavOpen(false)} /></div>
    </Modal>
  );
}

const TABS = [NAV[0], NAV[2], NAV[3], NAV[4]];
/** Thumb-reach navigation for phones; the fifth tab opens the full menu. */
export function MobileTabs() {
  const { setNavOpen } = useUI(); const badges = useNavBadges();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => cn('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-fg' : 'text-muted')}>
              {({ isActive }) => (<>
                <span className={cn('relative grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'marker')}><Icon className="h-[18px] w-[18px]" aria-hidden />{badges[to] && <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-bad ring-2 ring-surface" aria-hidden />}</span>
                <span>{label.split(' ')[0] === 'My' ? 'Subjects' : label.split(' ')[0]}</span>
                {isActive && <span className="sr-only">(current page)</span>}
              </>)}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button type="button" onClick={() => setNavOpen(true)} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
            <span className="grid h-7 w-12 place-items-center"><Ellipsis className="h-[18px] w-[18px]" aria-hidden /></span><span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
