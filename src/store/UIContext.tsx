import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { cn, uid } from '../lib/cn';
import type { PlanOptions } from '../lib/scheduler';

export type FormType = 'subject' | 'task' | 'exam' | 'session' | 'event';
export interface FormState { type: FormType; id?: string; defaults?: Record<string, string | number | boolean> }
type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: string; kind: ToastKind; message: string }
interface ConfirmOpts { title: string; body?: string; confirmLabel?: string; danger?: boolean }

interface UI {
  toast(message: string, kind?: ToastKind): void;
  confirm(o: ConfirmOpts): Promise<boolean>;
  form: FormState | null; openForm(type: FormType, o?: { id?: string; defaults?: FormState['defaults'] }): void; closeForm(): void;
  focusOpen: boolean; setFocusOpen(v: boolean): void; navOpen: boolean; setNavOpen(v: boolean): void;
  plan: PlanOptions | null; openPlan(o?: PlanOptions): void; closePlan(): void;
}
const Ctx = createContext<UI | null>(null);
export const useUI = (): UI => { const c = useContext(Ctx); if (!c) throw new Error('useUI outside provider'); return c; };

const ICON = { success: <CheckCircle2 className="h-4 w-4 text-ok" />, error: <XCircle className="h-4 w-4 text-bad" />, info: <Info className="h-4 w-4 text-accent" /> };

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [plan, setPlan] = useState<PlanOptions | null>(null);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const dlgRef = useRef(dlg); dlgRef.current = dlg;

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = uid('t'); setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3800);
  }, []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const answer = (v: boolean) => { dlgRef.current?.resolve(v); setDlg(null); };
  useEffect(() => { /* resolve pending confirm as cancelled if provider unmounts */ return () => dlgRef.current?.resolve(false); }, []);

  const value = useMemo<UI>(() => ({
    toast, confirm, form, openForm: (type, o) => setForm({ type, id: o?.id, defaults: o?.defaults }), closeForm: () => setForm(null),
    focusOpen, setFocusOpen, navOpen, setNavOpen, plan, openPlan: (o) => setPlan(o ?? {}), closePlan: () => setPlan(null),
  }), [toast, confirm, form, focusOpen, navOpen, plan]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-3 lg:bottom-6 lg:items-end lg:px-6">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={cn('pointer-events-auto flex max-w-md animate-pop items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-pop')}>
            {ICON[t.kind]}<span>{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="-mr-1 rounded p-1 text-muted hover:text-fg"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => answer(false)} title={dlg?.title ?? ''} size="sm"
        footer={<><Button onClick={() => answer(false)}>Cancel</Button><Button variant={dlg?.danger ? 'danger' : 'primary'} onClick={() => answer(true)} autoFocus>{dlg?.confirmLabel ?? 'Confirm'}</Button></>}>
        <div className="flex gap-3">
          {dlg?.danger && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden />}
          <p className="text-sm text-muted">{dlg?.body}</p>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}
