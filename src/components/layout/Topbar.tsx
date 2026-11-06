import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, BellRing, BookOpen, Bell, CalendarClock, CalendarDays, ChevronDown, Download, GraduationCap, ListChecks, Menu, Moon, Plus, Settings, Sun, Timer, UserRound } from 'lucide-react';
import { SearchBox } from './SearchBox';
import { Popover, MenuItem } from '../ui/Popover';
import { Badge } from '../ui/misc';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { useTimer } from '../../store/TimerContext';
import { buildNotifications } from '../../lib/stats';
import { downloadText } from '../../lib/download';
import { cn } from '../../lib/cn';

const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const iconBtn = 'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-fg';

export function Topbar() {
  const { data, updatePrefs, exportJson } = useStore(); const ui = useUI(); const timer = useTimer(); const nav = useNavigate();
  const notes = useMemo(() => buildNotifications(data), [data]);
  const urgent = notes.filter((n) => n.tone !== 'info').length;
  const dark = data.prefs.theme === 'dark' || (data.prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const running = timer.status !== 'idle';
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <button type="button" onClick={() => ui.setNavOpen(true)} aria-label="Open navigation" className={cn(iconBtn, 'lg:hidden')}><Menu className="h-5 w-5" /></button>
        <span className="font-display text-base font-semibold tracking-tight lg:hidden">Study Planner</span>
        <div className="order-last w-full md:order-none md:max-w-md md:flex-1 lg:max-w-lg"><SearchBox /></div>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button type="button" onClick={() => ui.setFocusOpen(true)} aria-label={running ? `Focus timer ${timer.status}, ${mmss(timer.msLeft)} left` : 'Open focus timer'}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium', running ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-sunken hover:text-fg')}>
            <Timer className="h-4 w-4" aria-hidden />{running ? <span className="tabular-nums">{mmss(timer.msLeft)}</span> : <span className="hidden sm:inline">Focus</span>}
          </button>
          <Popover label="Quick add" buttonClass="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg hover:brightness-110" button={<><Plus className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Add</span></>}>
            {(close) => (<>
              <MenuItem icon={<CalendarClock />} onClick={() => { close(); ui.openForm('session'); }}>Study session</MenuItem>
              <MenuItem icon={<ListChecks />} onClick={() => { close(); ui.openForm('task'); }}>Task or assignment</MenuItem>
              <MenuItem icon={<GraduationCap />} onClick={() => { close(); ui.openForm('exam'); }}>Exam</MenuItem>
              <MenuItem icon={<BookOpen />} onClick={() => { close(); ui.openForm('subject'); }}>Subject</MenuItem>
              <MenuItem icon={<CalendarDays />} onClick={() => { close(); ui.openForm('event'); }}>Timetable entry</MenuItem>
            </>)}
          </Popover>
          <Popover label={`Notifications${notes.length ? `, ${notes.length} items` : ''}`} buttonClass={iconBtn} panelClass="w-[min(22rem,calc(100vw-1.5rem))] p-0"
            button={<><Bell className="h-[18px] w-[18px]" aria-hidden />{urgent > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bad ring-2 ring-bg" aria-hidden />}</>}>
            {(close) => (
              <div>
                <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2>{notes.length > 0 && <Badge>{notes.length}</Badge>}</div>
                <ul className="max-h-80 overflow-y-auto p-1.5">
                  {notes.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">You're all caught up. Deadlines and exams will show here.</li>}
                  {notes.map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => { close(); nav(n.to); }} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sunken">
                        <span className={cn('mt-0.5 rounded-md p-1.5', n.tone === 'bad' ? 'bg-bad/10 text-bad' : n.tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-accent/10 text-accent')} aria-hidden>
                          {n.tone === 'info' ? <BellRing className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{n.title}</span><span className="block truncate text-xs text-muted">{n.detail}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line p-1.5"><MenuItem icon={<Settings />} onClick={() => { close(); nav('/settings#notifications'); }}>Notification preferences</MenuItem></div>
              </div>
            )}
          </Popover>
          <button type="button" className={cn(iconBtn, 'hidden sm:inline-flex')} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => updatePrefs({ theme: dark ? 'light' : 'dark' })}>
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <Popover label="Profile menu" buttonClass="flex h-9 items-center gap-1 rounded-lg pl-1 pr-1.5 hover:bg-sunken" panelClass="w-64"
            button={<><span className="grid h-7 w-7 place-items-center rounded-full bg-ind/15 text-xs font-semibold text-ind">{(data.profile.name.trim()[0] ?? '').toUpperCase() || <UserRound className="h-3.5 w-3.5" />}</span><ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" aria-hidden /></>}>
            {(close) => (<>
              <div className="px-2.5 pb-2 pt-1.5"><p className="truncate text-sm font-semibold">{data.profile.name || 'Student'}</p><p className="truncate text-xs text-muted">{data.profile.email || 'Local profile, no sign-in'}</p></div>
              <div className="my-1 border-t border-line" />
              <MenuItem icon={<Settings />} onClick={() => { close(); nav('/settings'); }}>Profile and settings</MenuItem>
              <div className="sm:hidden"><MenuItem icon={dark ? <Sun /> : <Moon />} onClick={() => { close(); updatePrefs({ theme: dark ? 'light' : 'dark' }); }}>{dark ? 'Switch to light theme' : 'Switch to dark theme'}</MenuItem></div>
              <MenuItem icon={<Download />} onClick={() => { close(); downloadText(`study-planner-${format(new Date(), 'yyyy-MM-dd')}.json`, exportJson()); ui.toast('Exported your data'); }}>Export my data</MenuItem>
              <p className="px-2.5 pb-1 pt-2 text-xs text-muted">Your data is stored only in this browser. There is no account or cloud sync.</p>
            </>)}
          </Popover>
        </div>
      </div>
    </header>
  );
}
