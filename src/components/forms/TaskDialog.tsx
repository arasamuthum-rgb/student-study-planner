import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { addDays } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/fields';
import { FormFooter, SubjectSelect } from './shared';
import { taskSchema, type TaskForm } from '../../lib/schemas';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../lib/constants';
import { toDateStr } from '../../lib/dates';
import { uid } from '../../lib/cn';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import type { ChecklistItem, Priority, TaskStatus } from '../../types';

export function TaskDialog({ id, defaults, onClose }: { id?: string; defaults?: Record<string, string | number | boolean>; onClose: () => void }) {
  const { data, addTask, updateTask, deleteTask } = useStore(); const { toast, confirm } = useUI();
  const existing = data.tasks.find((t) => t.id === id);
  const [list, setList] = useState<ChecklistItem[]>(existing?.checklist ?? []);
  const [newItem, setNewItem] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: existing ? { ...existing } : {
      title: '', description: '', subjectId: (defaults?.subjectId as string) ?? '', dueDate: (defaults?.dueDate as string) ?? toDateStr(addDays(new Date(), 2)), dueTime: '23:59',
      priority: 'medium', status: 'not_started', estimatedMinutes: 60, notes: '',
    },
  });
  const addItem = () => { const t = newItem.trim(); if (!t) return; setList((l) => [...l, { id: uid('chk'), text: t, done: false }]); setNewItem(''); };
  const submit = handleSubmit(async (v) => {
    const pending = newItem.trim(); const checklist = pending ? [...list, { id: uid('chk'), text: pending, done: false }] : list;
    if (existing) { updateTask(existing.id, { ...v, checklist }); toast('Task updated'); } else { addTask({ ...v, checklist, completedAt: v.status === 'completed' ? new Date().toISOString() : null }); toast('Task added'); }
    onClose();
  });
  const remove = async () => { if (existing && await confirm({ title: 'Delete this task?', body: `"${existing.title}" will be removed permanently.`, confirmLabel: 'Delete task', danger: true })) { deleteTask(existing.id); toast('Task deleted'); onClose(); } };
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit task' : 'Add task'} size="lg"
      footer={<FormFooter formId="task-form" onCancel={onClose} busy={isSubmitting} submitLabel={existing ? 'Save changes' : 'Add task'} onDelete={existing ? remove : undefined} deleteLabel="Delete task" />}>
      <form id="task-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" error={errors.title?.message} className="sm:col-span-2">{(p) => <Input {...p} autoFocus placeholder="e.g. Problem set 4" {...register('title')} />}</Field>
        <Field label="Subject" error={errors.subjectId?.message}>{(p) => <SubjectSelect {...p} {...register('subjectId')} />}</Field>
        <Field label="Estimated time (minutes)" error={errors.estimatedMinutes?.message}>{(p) => <Input {...p} type="number" min={5} step={5} {...register('estimatedMinutes', { valueAsNumber: true })} />}</Field>
        <Field label="Due date" error={errors.dueDate?.message}>{(p) => <Input {...p} type="date" {...register('dueDate')} />}</Field>
        <Field label="Due time" error={errors.dueTime?.message}>{(p) => <Input {...p} type="time" {...register('dueTime')} />}</Field>
        <Field label="Priority" error={errors.priority?.message}>{(p) => <Select {...p} {...register('priority')}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABEL[k]}</option>)}</Select>}</Field>
        <Field label="Status" error={errors.status?.message}>{(p) => <Select {...p} {...register('status')}>{(Object.keys(STATUS_LABEL) as TaskStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</Select>}</Field>
        <Field label="Description" error={errors.description?.message} className="sm:col-span-2">{(p) => <Textarea {...p} {...register('description')} />}</Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-[13px] font-medium">Checklist</span>
          <ul className="space-y-1.5">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.done} aria-label={`Mark "${c.text}" done`} onChange={() => setList((l) => l.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                <span className={c.done ? 'flex-1 text-sm text-muted line-through' : 'flex-1 text-sm'}>{c.text}</span>
                <Button variant="ghost" size="iconSm" aria-label={`Remove "${c.text}"`} onClick={() => setList((l) => l.filter((x) => x.id !== c.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Input value={newItem} aria-label="New checklist item" placeholder="Add a step" onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
            <Button onClick={addItem} aria-label="Add checklist item"><Plus className="h-4 w-4" />Add</Button>
          </div>
        </div>
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">{(p) => <Textarea {...p} {...register('notes')} />}</Field>
      </form>
    </Modal>
  );
}
