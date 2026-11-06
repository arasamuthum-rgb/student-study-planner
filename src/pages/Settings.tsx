import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Bell, Check, Clipboard, Database, Download, FlaskConical, HardDrive, Palette, Target, Trash2, Upload, UserRound } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Field, Input, Segmented, Select, Switch, Textarea } from '../components/ui/fields';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { prefsSchema, profileSchema, type PrefsForm, type ProfileForm } from '../lib/schemas';
import { ACCENTS, TERMS } from '../lib/constants';
import { downloadText } from '../lib/download';
import { cn } from '../lib/cn';
import type { Preferences } from '../types';

export default function SettingsPage() {
  const store = useStore(); const { data, updatePrefs, updateProfile, storageLabel } = store; const ui = useUI(); const loc = useLocation();
  useEffect(() => { if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: 'start' }); }, [loc.hash]);
  const p = data.prefs;

  const profile = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: { ...data.profile } });
  const goals = useForm<PrefsForm>({ resolver: zodResolver(prefsSchema), defaultValues: { weeklyGoalHours: p.weeklyGoalHours, studyDayStart: p.studyDayStart, studyDayEnd: p.studyDayEnd, focusMinutes: p.focusMinutes, shortBreakMinutes: p.shortBreakMinutes, longBreakMinutes: p.longBreakMinutes, longBreakEvery: p.longBreakEvery } });
  const termOptions = Array.from(new Set([data.profile.term, ...TERMS]));

  const [importText, setImportText] = useState(''); const [importErr, setImportErr] = useState(''); const file = useRef<HTMLInputElement>(null);
  const doImport = async (text: string) => {
    const r = store.importData(text);
    if (!r.ok) { setImportErr(r.error); return; }
    setImportErr(''); setImportText(''); ui.toast('Data imported');
  };
  const setNotif = async (key: keyof Preferences, v: boolean) => updatePrefs({ [key]: v });
  const browserSupported = typeof Notification !== 'undefined';
  const toggleBrowser = async (v: boolean) => {
    if (!v) return updatePrefs({ browserNotifications: false });
    if (!browserSupported) return ui.toast('This browser does not support notifications.', 'error');
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm === 'granted') { updatePrefs({ browserNotifications: true }); ui.toast('Browser notifications enabled'); } else ui.toast('Permission was not granted, so notifications stay off. You can allow them in your browser settings.', 'error');
  };
  const clearAll = async () => { if (await ui.confirm({ title: 'Clear all your data?', body: 'This permanently deletes every subject, task, session, exam, timetable entry and focus session. Your profile and settings are kept. Export first if you want a backup.', confirmLabel: 'Clear all data', danger: true })) { store.clearAll(); ui.toast('All data cleared'); } };
  const removeDemo = async () => { if (await ui.confirm({ title: 'Remove sample data?', body: 'Only the sample items are deleted. Anything you created is kept.', confirmLabel: 'Remove sample data', danger: true })) { store.removeDemo(); ui.toast('Sample data removed'); } };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Profile, goals, appearance, notifications and your data." />

      <Card as="section" aria-label="Profile">
        <CardHeader title="Profile" subtitle="Used for your greeting. It never leaves this browser." action={<UserRound className="h-4 w-4 text-muted" aria-hidden />} />
        <form noValidate className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2" onSubmit={profile.handleSubmit((v) => { updateProfile(v); ui.toast('Profile saved'); })}>
          <Field label="Name" error={profile.formState.errors.name?.message}>{(x) => <Input {...x} {...profile.register('name')} />}</Field>
          <Field label="Email (optional)" error={profile.formState.errors.email?.message}>{(x) => <Input {...x} type="email" {...profile.register('email')} />}</Field>
          <Field label="School or university" error={profile.formState.errors.school?.message}>{(x) => <Input {...x} {...profile.register('school')} />}</Field>
          <Field label="Current academic term" error={profile.formState.errors.term?.message}>{(x) => <Select {...x} {...profile.register('term')}>{termOptions.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          <div className="sm:col-span-2"><Button variant="primary" type="submit" loading={profile.formState.isSubmitting}>Save profile</Button></div>
        </form>
      </Card>

      <Card as="section" aria-label="Study goals and timer">
        <CardHeader title="Study goals and focus timer" subtitle="The planner and dashboard use these." action={<Target className="h-4 w-4 text-muted" aria-hidden />} />
        <form noValidate className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2" onSubmit={goals.handleSubmit((v) => { updatePrefs(v); ui.toast('Goals and timer saved'); })}>
          <Field label="Weekly study goal (hours)" error={goals.formState.errors.weeklyGoalHours?.message}>{(x) => <Input {...x} type="number" step="0.5" {...goals.register('weeklyGoalHours', { valueAsNumber: true })} />}</Field>
          <div />
          <Field label="Preferred study hours start" error={goals.formState.errors.studyDayStart?.message}>{(x) => <Input {...x} type="time" {...goals.register('studyDayStart')} />}</Field>
          <Field label="Preferred study hours end" error={goals.formState.errors.studyDayEnd?.message}>{(x) => <Input {...x} type="time" {...goals.register('studyDayEnd')} />}</Field>
          <Field label="Focus length (minutes)" error={goals.formState.errors.focusMinutes?.message}>{(x) => <Input {...x} type="number" {...goals.register('focusMinutes', { valueAsNumber: true })} />}</Field>
          <Field label="Short break (minutes)" error={goals.formState.errors.shortBreakMinutes?.message}>{(x) => <Input {...x} type="number" {...goals.register('shortBreakMinutes', { valueAsNumber: true })} />}</Field>
          <Field label="Long break (minutes)" error={goals.formState.errors.longBreakMinutes?.message}>{(x) => <Input {...x} type="number" {...goals.register('longBreakMinutes', { valueAsNumber: true })} />}</Field>
          <Field label="Focus sessions before a long break" error={goals.formState.errors.longBreakEvery?.message}>{(x) => <Input {...x} type="number" {...goals.register('longBreakEvery', { valueAsNumber: true })} />}</Field>
          <div className="sm:col-span-2"><Button variant="primary" type="submit">Save goals</Button></div>
        </form>
      </Card>

      <Card as="section" aria-label="Appearance">
        <CardHeader title="Appearance" action={<Palette className="h-4 w-4 text-muted" aria-hidden />} />
        <div className="space-y-5 p-5">
          <div><p className="mb-1.5 text-[13px] font-medium">Theme</p><Segmented<Preferences['theme']> label="Theme" value={p.theme} onChange={(v) => updatePrefs({ theme: v })} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Match device' }]} /></div>
          <div><p className="mb-1.5 text-[13px] font-medium">Accent color</p>
            <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">{ACCENTS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={p.accent === a.id} onClick={() => updatePrefs({ accent: a.id })} className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm', p.accent === a.id ? 'border-accent bg-accent/10' : 'border-line hover:bg-sunken')}>
                <span className="grid h-4 w-4 place-items-center rounded-full text-white" style={{ backgroundColor: a.swatch }}>{p.accent === a.id && <Check className="h-3 w-3" />}</span>{a.label}</button>))}</div></div>
          <div className="max-w-xs"><label className="mb-1 block text-[13px] font-medium" htmlFor="fdow">First day of the week</label>
            <Select id="fdow" value={p.firstDayOfWeek} onChange={(e) => updatePrefs({ firstDayOfWeek: Number(e.target.value) as Preferences['firstDayOfWeek'] })}><option value={1}>Monday</option><option value={0}>Sunday</option><option value={6}>Saturday</option></Select></div>
          <Switch checked={p.compactSidebar} onChange={(v) => updatePrefs({ compactSidebar: v })} label="Compact sidebar" description="Show only icons in the desktop sidebar." />
        </div>
      </Card>

      <Card as="section" aria-label="Notifications"><div id="notifications" className="scroll-mt-24" />
        <CardHeader title="Notifications" subtitle="In-app alerts appear in the bell menu at the top." action={<Bell className="h-4 w-4 text-muted" aria-hidden />} />
        <div className="divide-y divide-line px-5 pb-3 pt-1">
          <Switch checked={p.notifyDeadlines} onChange={(v) => setNotif('notifyDeadlines', v)} label="Upcoming deadlines" description="Tasks due within 48 hours and sessions starting soon." />
          <Switch checked={p.notifyOverdue} onChange={(v) => setNotif('notifyOverdue', v)} label="Overdue tasks" />
          <Switch checked={p.notifyExams} onChange={(v) => setNotif('notifyExams', v)} label="Approaching exams" description="Exams within the next 7 days." />
          <Switch checked={p.browserNotifications && browserSupported && Notification.permission === 'granted'} onChange={toggleBrowser} label="Browser notifications" description={browserSupported ? 'Asks for permission first. Used when a focus session ends and for a once-a-day summary while the app is open.' : 'Not supported in this browser.'} />
        </div>
      </Card>

      <Card as="section" aria-label="Data and storage">
        <CardHeader title="Data and storage" action={<Database className="h-4 w-4 text-muted" aria-hidden />} />
        <div className="space-y-5 p-5">
          <div className="flex items-start gap-3 rounded-xl bg-sunken p-3.5 text-sm"><HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p><span className="font-medium">Active storage: {storageLabel}.</span> <span className="text-muted">There is no account, sign-in or cloud sync, so clearing browser data or switching device loses your planner unless you export it. A Supabase schema with row-level security is included in the project for when you connect a backend.</span></p></div>
          <div><p className="mb-2 text-[13px] font-medium">Export</p><div className="flex flex-wrap gap-2">
            <Button onClick={() => { downloadText(`study-planner-${format(new Date(), 'yyyy-MM-dd')}.json`, store.exportJson()); ui.toast('Exported your data'); }}><Download className="h-4 w-4" />Download JSON</Button>
            <Button onClick={async () => { try { await navigator.clipboard.writeText(store.exportJson()); ui.toast('Copied your data to the clipboard'); } catch { ui.toast('Could not access the clipboard. Use Download instead.', 'error'); } }}><Clipboard className="h-4 w-4" />Copy to clipboard</Button></div></div>
          <div><p className="mb-2 text-[13px] font-medium">Import</p><p className="mb-2 text-xs text-muted">Importing replaces everything currently in the app with the contents of an export file.</p>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose export file" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const t = await f.text(); e.target.value = ''; if (await ui.confirm({ title: 'Replace your data with this file?', body: 'Your current data will be overwritten. Export first if you need a backup.', confirmLabel: 'Import and replace', danger: true })) doImport(t); }} />
            <Button onClick={() => file.current?.click()}><Upload className="h-4 w-4" />Choose file</Button>
            <div className="mt-3"><Field label="Or paste exported JSON" error={importErr}>{(x) => <Textarea {...x} rows={3} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"version":1, ...}' />}</Field>
              <Button className="mt-2" disabled={!importText.trim()} onClick={async () => { if (await ui.confirm({ title: 'Replace your data with this JSON?', body: 'Your current data will be overwritten.', confirmLabel: 'Import and replace', danger: true })) doImport(importText); }}>Import pasted JSON</Button></div></div>
          <div className="border-t border-line pt-5"><p className="mb-2 text-[13px] font-medium">Sample and personal data</p><div className="flex flex-wrap gap-2">
            {data.hasDemo ? <Button onClick={removeDemo}><FlaskConical className="h-4 w-4" />Remove sample data</Button> : <Button onClick={() => { store.loadDemo(); ui.toast('Sample data added', 'info'); }}><FlaskConical className="h-4 w-4" />Add sample data</Button>}
            <Button variant="danger" onClick={clearAll}><Trash2 className="h-4 w-4" />Clear all data</Button></div></div>
        </div>
      </Card>
    </div>
  );
}
