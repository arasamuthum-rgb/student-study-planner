import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Field, Input, Select } from '../ui/fields';
import { FormFooter, SubjectSelect } from './shared';
import { examSchema, type ExamFormValues } from '../../lib/schemas';
import { EXAM_LABEL } from '../../lib/constants';
import { toDateStr } from '../../lib/dates';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import type { ExamType } from '../../types';

export function ExamDialog({ id, defaults, onClose }: { id?: string; defaults?: Record<string, string | number | boolean>; onClose: () => void }) {
  const { data, addExam, updateExam, deleteExam } = useStore(); const { toast, confirm } = useUI();
  const existing = data.exams.find((e) => e.id === id);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: existing ? { ...existing } : { subjectId: (defaults?.subjectId as string) ?? '', title: '', date: toDateStr(addDays(new Date(), 21)), time: '09:00', type: 'midterm', location: '', targetCompletionDate: '' },
  });
  const submit = handleSubmit(async (v) => {
    if (existing) { updateExam(existing.id, v); toast('Exam updated'); } else { addExam(v); toast('Exam added. Add syllabus topics to start tracking preparation.'); }
    onClose();
  });
  const remove = async () => { if (existing && await confirm({ title: 'Delete this exam?', body: 'The exam and all of its syllabus topics will be removed.', confirmLabel: 'Delete exam', danger: true })) { deleteExam(existing.id); toast('Exam deleted'); onClose(); } };
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit exam' : 'Add exam'} size="md"
      footer={<FormFooter formId="exam-form" onCancel={onClose} busy={isSubmitting} submitLabel={existing ? 'Save changes' : 'Add exam'} onDelete={existing ? remove : undefined} deleteLabel="Delete exam" />}>
      <form id="exam-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Exam title" error={errors.title?.message} className="sm:col-span-2">{(p) => <Input {...p} autoFocus placeholder="e.g. Physics midterm" {...register('title')} />}</Field>
        <Field label="Subject" error={errors.subjectId?.message}>{(p) => <SubjectSelect {...p} {...register('subjectId')} />}</Field>
        <Field label="Exam type" error={errors.type?.message}>{(p) => <Select {...p} {...register('type')}>{(Object.keys(EXAM_LABEL) as ExamType[]).map((k) => <option key={k} value={k}>{EXAM_LABEL[k]}</option>)}</Select>}</Field>
        <Field label="Date" error={errors.date?.message}>{(p) => <Input {...p} type="date" {...register('date')} />}</Field>
        <Field label="Start time" error={errors.time?.message}>{(p) => <Input {...p} type="time" {...register('time')} />}</Field>
        <Field label="Location (optional)" error={errors.location?.message}>{(p) => <Input {...p} {...register('location')} />}</Field>
        <Field label="Finish syllabus by (optional)" hint="Your own target, before the exam date." error={errors.targetCompletionDate?.message}>{(p) => <Input {...p} type="date" {...register('targetCompletionDate')} />}</Field>
      </form>
    </Modal>
  );
}
