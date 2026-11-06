import { lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider, useStore } from './store/AppStore';
import { UIProvider } from './store/UIContext';
import { TimerProvider } from './store/TimerContext';
import { AppShell } from './components/layout/AppShell';
import { Onboarding } from './components/Onboarding';
import { Skeleton } from './components/ui/misc';
import { Button } from './components/ui/Button';
import { LocalStorageAdapter } from './storage/adapter';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Planner = lazy(() => import('./pages/Planner'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Exams = lazy(() => import('./pages/Exams'));
const Timetable = lazy(() => import('./pages/Timetable'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function ThemeSync() {
  const { data } = useStore(); const { theme, accent } = data.prefs;
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
    el.setAttribute('data-accent', accent);
  }, [theme, accent]);
  return null;
}

function Gate() {
  const { status, error, data } = useStore();
  if (status === 'loading') return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6" aria-busy="true" aria-label="Loading your planner">
      <Skeleton className="h-12 w-full" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72 w-full" />
    </div>
  );
  if (status === 'error') return (
    <div className="mx-auto mt-24 max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
      <h1 className="text-lg font-semibold">Your saved data could not be read</h1>
      <p className="mt-2 text-sm text-muted">{error}. Nothing has been deleted yet. You can start fresh, but this will replace the unreadable data.</p>
      <Button className="mt-4" variant="danger" onClick={() => { localStorage.removeItem(LocalStorageAdapter.key); location.reload(); }}>Start fresh</Button>
    </div>
  );
  if (!data.onboarded) return <Onboarding />;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="planner" element={<Planner />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="exams" element={<Exams />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppStoreProvider>
        <UIProvider>
          <TimerProvider>
            <ThemeSync />
            <Gate />
          </TimerProvider>
        </UIProvider>
      </AppStoreProvider>
    </HashRouter>
  );
}
