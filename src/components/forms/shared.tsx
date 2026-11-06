import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { SUBJECT_COLORS } from '../../lib/constants';
import { useStore } from '../../store/AppStore';
import { Select } from '../ui/fields';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Subject color" className="flex flex-wrap gap-2">
      {SUBJECT_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)}
          className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition', value === c ? 'ring-2 ring-fg' : 'hover:scale-110')} style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}
export function FormFooter({ formId, onCancel, submitLabel, busy, onDelete, deleteLabel }: { formId: string; onCancel: () => void; submitLabel: string; busy?: boolean; onDelete?: () => void; deleteLabel?: string }) {
  return (
    <>
      {onDelete && <Button variant="ghost" className="mr-auto text-bad hover:bg-bad/10 hover:text-bad" onClick={onDelete}>{deleteLabel ?? 'Delete'}</Button>}
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="primary" type="submit" form={formId} loading={busy}>{submitLabel}</Button>
    </>
  );
}
export const SubjectSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { optional?: boolean }>(function SubjectSelect({ optional, ...p }, ref) {
  const { data } = useStore();
  const list = data.subjects.filter((s) => !s.archived || s.id === p.value);
  return (
    <Select ref={ref} {...p}>
      <option value="">{optional ? 'No subject' : 'Select a subject'}</option>
      {list.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
    </Select>
  );
});
export function ConflictNotice({ hard, soft }: { hard: string[]; soft: string[] }) {
  if (!hard.length && !soft.length) return null;
  return (
    <div role="alert" className={cn('mt-4 rounded-lg border p-3 text-[13px]', hard.length ? 'border-bad/40 bg-bad/10 text-bad' : 'border-warn/40 bg-warn/10 text-warn')}>
      <p className="font-medium">{hard.length ? 'This time overlaps another study session' : 'This time overlaps something in your timetable'}</p>
      <ul className="mt-1 list-disc pl-4">{[...hard, ...soft].slice(0, 4).map((c) => <li key={c}>{c}</li>)}</ul>
      {!hard.length && <p className="mt-1">Choose "Save anyway" to keep it, or change the time.</p>}
    </div>
  );
}
