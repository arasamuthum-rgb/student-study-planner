import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; variant?: 'center' | 'right' | 'left'; size?: 'sm' | 'md' | 'lg' | 'xl'; hideHeader?: boolean }
const W = { sm: 'sm:w-[420px]', md: 'sm:w-[560px]', lg: 'sm:w-[720px]', xl: 'sm:w-[960px]' };

/** Accessible modal built on the native <dialog>: focus trap, Esc to close and inert background come from the browser. */
export function Modal({ open, onClose, title, description, children, footer, variant = 'center', size = 'md', hideHeader }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const style = variant === 'right' ? { margin: '0 0 0 auto', height: '100dvh' } : variant === 'left' ? { margin: '0 auto 0 0', height: '100dvh' } : undefined;
  return (
    <dialog ref={ref} className="modal" style={style} aria-labelledby="modal-title" onClose={onClose}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <div className={cn('flex flex-col border border-line bg-surface text-fg shadow-pop',
          variant === 'center' ? cn('mx-auto max-h-[92dvh] w-[calc(100vw-1.5rem)] rounded-2xl animate-pop', W[size]) : cn('h-full w-[min(92vw,420px)]', variant === 'right' ? 'animate-slideR rounded-l-2xl' : 'animate-slideL rounded-r-2xl'))}>
          <header className={cn('flex items-start justify-between gap-4 px-5 pt-4', hideHeader && 'sr-only')}>
            <div>
              <h2 id="modal-title" className="text-base font-semibold tracking-tight">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-muted hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
