import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Field, Input, Select } from '../ui/fields';
import { ConflictNotice, FormFooter, SubjectSelect } from './shared';
import { eventSchema, type EventFormValues } from '../../lib/schemas';
import { EVENT_LABEL } from '../../lib/constants';
import { WEEKDAYS, orderedWeekdays, timesOverlap, todayStr } from '../../lib/dates';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import type { EventType, TimetableEvent } from '../../types';

function overlapping(events: TimetableEvent[], v: EventFormValues, excludeId?: string): TimetableEvent[] {
  const dayOf = (e: { repeat: string; weekday: number; date: string }) => (e.repeat === 'weekly' ? e.weekday : new Date(`${e.date}T00:00`).getDay());
  const wd = dayOf(v);
  return events.filter((e) => {
    if (e.id === excludeId || dayOf(e) !== wd) return false;
    if (v.repeat === 'once' && e.repeat === 'once' && e.date !== v.date) return false;
    return timesOverlap(v.start, v.end, e.start, e.end);
  });
}

export function EventDialog({ id, defaults, onClose }: { id?: string; defaults?: Record<string, string | number | boolean>; onClose: () => void }) {
  const { data, addEvent, updateEvent, deleteEvent } = useStore(); const { toast, confirm } = useUI();
  const existing = data.events.find((e) => e.id === id);
  const [conflicts, setConflicts] = useState<string[]>([]); const [ack, setAck] = useState(false);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: existing ? { ...existing } : { title: '', type: 'lecture', subjectId: (defaults?.subjectId as string) ?? '', location: '', repeat: 'weekly', weekday: (defaults?.weekday as number) ?? 1, date: todayStr(), start: (defaults?.start as string) ?? '09:00', end: (defaults?.end as string) ?? '10:00' },
  });
  const repeat = useWatch({ control, name: 'repeat' });
  const submit = handleSubmit(async (v) => {
    const clash = overlapping(data.events, v, existing?.id);
    if (clash.length && !ack) { setConflicts(clash.map((c) => `${c.title} (${c.start} to ${c.end})`)); setAck(true); return; }
    if (existing) { updateEvent(existing.id, v); toast('Timetable entry updated'); } else { addEvent(v); toast('Added to your timetable'); }
    onClose();
  });
  const remove = async () => { if (existing && await confirm({ title: 'Delete this entry?', body: existing.repeat === 'weekly' ? 'All weekly repeats of this entry will be removed.' : 'This entry will be removed.', confirmLabel: 'Delete entry', danger: true })) { deleteEvent(existing.id); toast('Timetable entry deleted'); onClose(); } };
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit timetable entry' : 'Add to timetable'} size="md"
      footer={<FormFooter formId="event-form" onCancel={onClose} busy={isSubmitting} submitLabel={ack ? 'Save anyway' : existing ? 'Save changes' : 'Add entry'} onDelete={existing ? remove : undefined} deleteLabel="Delete entry" />}>
      <form id="event-form" onSubmit={submit} onChange={() => { setConflicts([]); setAck(false); }} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" error={errors.title?.message} className="sm:col-span-2">{(p) => <Input {...p} autoFocus placeholder="e.g. Physics lecture" {...register('title')} />}</Field>
        <Field label="Type" error={errors.type?.message}>{(p) => <Select {...p} {...register('type')}>{(Object.keys(EVENT_LABEL) as EventType[]).map((k) => <option key={k} value={k}>{EVENT_LABEL[k]}</option>)}</Select>}</Field>
        <Field label="Subject (optional)">{(p) => <SubjectSelect optional {...p} {...register('subjectId')} />}</Field>
        <Field label="Repeats" error={errors.repeat?.message}>{(p) => <Select {...p} {...register('repeat')}><option value="weekly">Every week</option><option value="once">One time only</option></Select>}</Field>
        {repeat === 'weekly'
          ? <Field label="Day of week" error={errors.weekday?.message}>{(p) => <Select {...p} {...register('weekday', { valueAsNumber: true })}>{orderedWeekdays(data.prefs.firstDayOfWeek).map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}</Select>}</Field>
          : <Field label="Date" error={errors.date?.message}>{(p) => <Input {...p} type="date" {...register('date')} />}</Field>}
        <Field label="Start time" error={errors.start?.message}>{(p) => <Input {...p} type="time" {...register('start')} />}</Field>
        <Field label="End time" error={errors.end?.message}>{(p) => <Input {...p} type="time" {...register('end')} />}</Field>
        <Field label="Location (optional)" className="sm:col-span-2">{(p) => <Input {...p} {...register('location')} />}</Field>
      </form>
      <ConflictNotice hard={[]} soft={conflicts} />
    </Modal>
  );
}
