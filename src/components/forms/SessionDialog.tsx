import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/fields';
import { ConflictNotice, FormFooter, SubjectSelect } from './shared';
import { sessionSchema, type SessionFormValues } from '../../lib/schemas';
import { PRIORITY_LABEL, SESSION_STATUS_LABEL } from '../../lib/constants';
import { durationMin, fmtDate, parseDate, toDateStr, todayStr } from '../../lib/dates';
import { findConflicts } from '../../lib/stats';
import { uid } from '../../lib/cn';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import type { Priority, SessionStatus } from '../../types';

export function SessionDialog({ id, defaults, onClose }: { id?: string; defaults?: Record<string, string | number | boolean>; onClose: () => void }) {
  const { data, addSessions, updateSession, deleteSession } = useStore(); const { toast, confirm } = useUI();
  const existing = data.sessions.find((s) => s.id === id);
  const [conflict, setConflict] = useState<{ hard: string[]; soft: string[] }>({ hard: [], soft: [] });
  const [ack, setAck] = useState(false);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: existing ? { ...existing, recurrence: 'none', occurrences: 1 } : {
      subjectId: (defaults?.subjectId as string) ?? '', date: (defaults?.date as string) ?? todayStr(), start: (defaults?.start as string) ?? '18:00', end: (defaults?.end as string) ?? '19:00',
      topic: (defaults?.topic as string) ?? '', notes: '', priority: (defaults?.priority as Priority) ?? 'medium', status: 'pending', actualMinutes: null, recurrence: 'none', occurrences: 4,
    },
  });
  const status = useWatch({ control, name: 'status' }); const recurrence = useWatch({ control, name: 'recurrence' });

  const submit = handleSubmit(async (v) => {
    const dates = existing || v.recurrence === 'none' ? [v.date] : Array.from({ length: v.occurrences }, (_, i) => toDateStr(addDays(parseDate(v.date), i * (v.recurrence === 'daily' ? 1 : 7))));
    const hard: string[] = []; const soft: string[] = [];
    for (const date of dates) {
      const c = findConflicts({ date, start: v.start, end: v.end, sessions: data.sessions, events: data.events, excludeId: existing?.id });
      c.sessions.forEach((s) => hard.push(`${fmtDate(date)}: ${s.start} to ${s.end}, ${s.topic}`));
      c.events.forEach((e) => soft.push(`${fmtDate(date)}: ${e.title} (${e.start} to ${e.end})`));
    }
    if (hard.length || (soft.length && !ack)) { setConflict({ hard, soft }); setAck(!hard.length); return; }
    const planned = durationMin(v.start, v.end);
    const { recurrence: _r, occurrences: _o, actualMinutes, ...core } = v;
    const actual = v.status === 'completed' ? actualMinutes ?? planned : null;
    if (existing) { updateSession(existing.id, { ...core, actualMinutes: actual }); toast('Session updated'); }
    else {
      const group = dates.length > 1 ? uid('grp') : null;
      addSessions(dates.map((date) => ({ ...core, date, actualMinutes: actual, recurrenceGroupId: group, source: (defaults?.source === 'recommended' ? 'recommended' : 'manual') as 'manual' | 'recommended' })));
      toast(dates.length > 1 ? `Scheduled ${dates.length} sessions` : 'Session scheduled');
    }
    onClose();
  });
  const remove = async () => {
    if (!existing) return;
    const series = !!existing.recurrenceGroupId && data.sessions.filter((s) => s.recurrenceGroupId === existing.recurrenceGroupId && s.date >= existing.date).length > 1;
    const ok = await confirm({ title: 'Delete this session?', body: series ? 'This is part of a repeating series. Only this session will be deleted. Use "Delete series" on the next prompt to remove the rest.' : `"${existing.topic}" will be removed from your planner.`, confirmLabel: 'Delete session', danger: true });
    if (!ok) return;
    deleteSession(existing.id, false);
    if (series && await confirm({ title: 'Delete the following sessions too?', body: 'Remove all later sessions in this repeating series.', confirmLabel: 'Delete series', danger: true })) deleteSession(existing.id, true);
    toast('Session deleted'); onClose();
  };
  const clear = () => { setConflict({ hard: [], soft: [] }); setAck(false); };
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit study session' : 'Schedule a study session'} size="lg"
      footer={<FormFooter formId="session-form" onCancel={onClose} busy={isSubmitting} submitLabel={ack ? 'Save anyway' : existing ? 'Save changes' : 'Schedule session'} onDelete={existing ? remove : undefined} deleteLabel="Delete session" />}>
      <form id="session-form" onSubmit={submit} onChange={clear} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subject" error={errors.subjectId?.message}>{(p) => <SubjectSelect {...p} {...register('subjectId')} />}</Field>
        <Field label="Topic" error={errors.topic?.message}>{(p) => <Input {...p} placeholder="e.g. Chapter 5 practice" {...register('topic')} />}</Field>
        <Field label="Date" error={errors.date?.message}>{(p) => <Input {...p} type="date" {...register('date')} />}</Field>
        <Field label="Priority" error={errors.priority?.message}>{(p) => <Select {...p} {...register('priority')}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABEL[k]}</option>)}</Select>}</Field>
        <Field label="Start time" error={errors.start?.message}>{(p) => <Input {...p} type="time" {...register('start')} />}</Field>
        <Field label="End time" error={errors.end?.message}>{(p) => <Input {...p} type="time" {...register('end')} />}</Field>
        {existing && <Field label="Status" error={errors.status?.message}>{(p) => <Select {...p} {...register('status')}>{(Object.keys(SESSION_STATUS_LABEL) as SessionStatus[]).map((k) => <option key={k} value={k}>{SESSION_STATUS_LABEL[k]}</option>)}</Select>}</Field>}
        {existing && status === 'completed' && <Field label="Actual time studied (minutes)" hint="Leave empty to use the planned length." error={errors.actualMinutes?.message}>{(p) => <Input {...p} type="number" min={1} {...register('actualMinutes', { setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)) })} />}</Field>}
        {!existing && (
          <>
            <Field label="Repeat" error={errors.recurrence?.message}>{(p) => <Select {...p} {...register('recurrence')}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option></Select>}</Field>
            {recurrence !== 'none' && <Field label="Number of sessions" error={errors.occurrences?.message}>{(p) => <Input {...p} type="number" min={1} max={30} {...register('occurrences', { valueAsNumber: true })} />}</Field>}
          </>
        )}
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">{(p) => <Textarea {...p} {...register('notes')} />}</Field>
      </form>
      <ConflictNotice hard={conflict.hard} soft={conflict.soft} />
    </Modal>
  );
}
