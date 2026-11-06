import { Suspense, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Sidebar, MobileNav, MobileTabs } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoBanner } from './DemoBanner';
import { Skeleton } from '../ui/misc';
import { FocusPanel } from './FocusPanel';
import { FormHost } from '../forms/FormHost';
import { PlanDialog } from '../PlanDialog';
import { useStore } from '../../store/AppStore';
import { buildNotifications } from '../../lib/stats';
import { todayStr } from '../../lib/dates';
import { cn } from '../../lib/cn';

export function AppShell() {
  const { data, saveError, updatePrefs } = useStore();
  const compact = data.prefs.compactSidebar;
  const notes = useMemo(() => buildNotifications(data), [data]);

  // Once a day, with permission, summarise what needs attention in a browser notification.
  useEffect(() => {
    const p = data.prefs; const urgent = notes.filter((n) => n.tone !== 'info');
    if (!p.browserNotifications || typeof Notification === 'undefined' || Notification.permission !== 'granted' || p.lastBrowserNotifyDate === todayStr() || !urgent.length) return;
    try { new Notification('Study Planner', { body: `${urgent.length} item${urgent.length > 1 ? 's' : ''} need your attention. ${urgent[0].title}` }); } catch { /* ignore */ }
    updatePrefs({ lastBrowserNotifyDate: todayStr() });
  }, [data.prefs, notes, updatePrefs]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <Sidebar /><MobileNav /><MobileTabs />
      <div className={cn('transition-[padding] duration-200', compact ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar />
        <main id="main" className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-7">
          {saveError && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p><strong>Your latest changes could not be saved.</strong> {saveError}. Export your data from Settings to keep a copy.</p></div>}
          {data.hasDemo && <DemoBanner />}
          <Suspense fallback={<div className="space-y-4" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 w-full" /></div>}><Outlet /></Suspense>
        </main>
      </div>
      <FormHost /><FocusPanel /><PlanDialog />
    </div>
  );
}
