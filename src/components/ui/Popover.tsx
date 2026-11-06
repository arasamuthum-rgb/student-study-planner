import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props { label: string; button: ReactNode; buttonClass?: string; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; panelClass?: string }
export function Popover({ label, button, buttonClass, children, align = 'right', panelClass }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button ref={btn} type="button" aria-label={label} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClass}>{button}</button>
      {open && <div className={cn('absolute z-40 mt-2 min-w-56 animate-pop rounded-xl border border-line bg-surface p-1.5 shadow-pop', align === 'right' ? 'right-0' : 'left-0', panelClass)}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
export function MenuItem({ icon, children, onClick, danger }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-sunken', danger ? 'text-bad' : 'text-fg')}>
      {icon && <span className="text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span>}{children}
    </button>
  );
}
