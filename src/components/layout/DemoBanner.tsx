import { FlaskConical } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';

export function DemoBanner() {
  const { removeDemo } = useStore(); const { confirm, toast } = useUI();
  const clear = async () => {
    if (await confirm({ title: 'Remove all sample data?', body: 'Sample subjects, tasks, sessions, exams and timetable entries will be deleted. Anything you created yourself is kept.', confirmLabel: 'Remove sample data', danger: true })) { removeDemo(); toast('Sample data removed'); }
  };
  return (
    <div role="note" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dashed border-ind/40 px-3.5 py-2 text-[13px]">
      <FlaskConical className="h-4 w-4 shrink-0 text-ind" aria-hidden />
      <p className="min-w-[14rem] flex-1 text-fg"><span className="font-medium">Sample data.</span> These numbers are made up. Add your own subjects any time.</p>
      <Button size="sm" variant="ghost" onClick={clear}>Remove sample data</Button>
    </div>
  );
}
