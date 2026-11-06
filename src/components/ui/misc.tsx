import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { Subject } from '../../types';

export function Card({ className, children, as: Tag = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article'; 'aria-label'?: string }) {
  return <Tag className={cn('min-w-0 rounded-2xl border border-line bg-surface shadow-card', className)} {...rest}>{children}</Tag>;
}
export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4">
      <div><h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>{subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'ind';
const T: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted', accent: 'bg-accent/10 text-accent', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn', bad: 'bg-bad/10 text-bad', ind: 'bg-ind/10 text-ind',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', T[tone], className)}>{children}</span>;
}
export const DemoBadge = () => <Badge tone="ind" className="px-1.5 text-[11px]">Sample</Badge>;

export function Progress({ value, color, label, className, thin }: { value: number; color?: string; label: string; className?: string; thin?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className={cn('w-full overflow-hidden rounded-full bg-sunken', thin ? 'h-1.5' : 'h-2', className)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${v}%`, backgroundColor: color }} />
    </div>
  );
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />;

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 rounded-xl bg-accent/10 p-3 text-accent [&>svg]:h-5 [&>svg]:w-5" aria-hidden>{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function SubjectChip({ subject, className }: { subject?: Pick<Subject, 'name' | 'color'> | null; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-[13px] text-muted', className)}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subject?.color ?? '#94a3b8' }} aria-hidden />
      <span className="truncate">{subject?.name ?? 'No subject'}</span>
    </span>
  );
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-0.5 text-sm text-muted">{description}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({ icon, label, value, sub, tone = 'accent' }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'ok' | 'warn' | 'ind' | 'bad' }) {
  const t = { accent: 'bg-accent/10 text-accent', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn', ind: 'bg-ind/10 text-ind', bad: 'bg-bad/10 text-bad' }[tone];
  return (
    <Card as="div" className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2 [&>svg]:h-4 [&>svg]:w-4', t)} aria-hidden>{icon}</div>
        <span className="text-[13px] text-muted">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

/** Several related numbers in one panel, separated by hairlines, instead of a row of identical cards. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <Card as="div" className={cn('grid grid-cols-2 xl:grid-cols-4 [&>*]:border-line max-xl:[&>*:nth-child(n+3)]:border-t xl:[&>*+*]:border-l max-xl:[&>*:nth-child(even)]:border-l', className)}>{children}</Card>;
}
export function StatCell({ icon, label, value, sub, tone = 'accent' }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'ok' | 'warn' | 'ind' | 'bad' }) {
  const t = { accent: 'text-accent', ok: 'text-ok', warn: 'text-warn', ind: 'text-ind', bad: 'text-bad' }[tone];
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[13px] text-muted"><span className={cn('[&>svg]:h-4 [&>svg]:w-4', t)} aria-hidden>{icon}</span><span className="truncate">{label}</span></div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
