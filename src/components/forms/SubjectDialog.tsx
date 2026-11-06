import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/fields';
import { ColorPicker, FormFooter } from './shared';
import { subjectSchema, type SubjectForm } from '../../lib/schemas';
import { SUBJECT_COLORS, TERMS } from '../../lib/constants';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';

export function SubjectDialog({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, addSubject, updateSubject } = useStore(); const { toast } = useUI();
  const existing = data.subjects.find((s) => s.id === id);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: existing ? { ...existing } : { name: '', code: '', instructor: '', term: data.profile.term, targetHoursPerWeek: 4, color: SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length], difficulty: 3, totalTopics: 10, completedTopics: 0, notes: '', resources: '' },
  });
  const termOptions = Array.from(new Set([data.profile.term, existing?.term ?? '', ...TERMS].filter(Boolean)));
  const submit = handleSubmit(async (raw) => {
    const v = { ...raw, difficulty: raw.difficulty as 1 | 2 | 3 | 4 | 5 };
    if (existing) { updateSubject(existing.id, v); toast(`Saved changes to ${v.name}`); }
    else { addSubject({ ...v, archived: false }); toast(`Added ${v.name}`); }
    onClose();
  });
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit subject' : 'Add subject'} size="lg"
      footer={<FormFooter formId="subject-form" onCancel={onClose} busy={isSubmitting} submitLabel={existing ? 'Save changes' : 'Add subject'} />}>
      <form id="subject-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subject name" error={errors.name?.message} className="sm:col-span-2">{(p) => <Input {...p} autoFocus placeholder="e.g. Linear Algebra" {...register('name')} />}</Field>
        <Field label="Subject code" error={errors.code?.message}>{(p) => <Input {...p} placeholder="e.g. MATH210" {...register('code')} />}</Field>
        <Field label="Instructor (optional)" error={errors.instructor?.message}>{(p) => <Input {...p} {...register('instructor')} />}</Field>
        <Field label="Semester or term" error={errors.term?.message}>{(p) => <Select {...p} {...register('term')}>{termOptions.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
        <Field label="Target study hours per week" error={errors.targetHoursPerWeek?.message}>{(p) => <Input {...p} type="number" step="0.5" min={0} {...register('targetHoursPerWeek', { valueAsNumber: true })} />}</Field>
        <Field label="Total chapters or topics" error={errors.totalTopics?.message}>{(p) => <Input {...p} type="number" min={0} {...register('totalTopics', { valueAsNumber: true })} />}</Field>
        <Field label="Completed topics" error={errors.completedTopics?.message}>{(p) => <Input {...p} type="number" min={0} {...register('completedTopics', { valueAsNumber: true })} />}</Field>
        <Field label="Difficulty" hint="Used by the planner to give harder subjects more time." error={errors.difficulty?.message}>
          {(p) => <Select {...p} {...register('difficulty', { valueAsNumber: true })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} of 5{n === 1 ? ' (easy)' : n === 5 ? ' (hardest)' : ''}</option>)}</Select>}
        </Field>
        <div><span className="mb-1 block text-[13px] font-medium">Color</span><Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} /></div>
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">{(p) => <Textarea {...p} {...register('notes')} />}</Field>
        <Field label="Resources" hint="One per line. Links starting with http become clickable." error={errors.resources?.message} className="sm:col-span-2">{(p) => <Textarea {...p} {...register('resources')} />}</Field>
      </form>
    </Modal>
  );
}
