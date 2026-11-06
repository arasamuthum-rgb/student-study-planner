import { Check, SkipForward, Undo2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { durationMin } from '../lib/dates';
import type { StudySession } from '../types';

/** Mark a session completed, skipped or pending again. Completing records the planned length as time studied. */
export function SessionActions({ s, compact }: { s: StudySession; compact?: boolean }) {
  const { updateSession } = useStore(); const { toast } = useUI();
  if (s.status === 'pending') return (
    <div className="flex gap-1">
      <Button size="sm" variant="subtle" onClick={() => { updateSession(s.id, { status: 'completed', actualMinutes: durationMin(s.start, s.end) }); toast('Session marked complete'); }} aria-label={`Mark "${s.topic}" complete`}><Check className="h-3.5 w-3.5" />{!compact && 'Done'}</Button>
      <Button size="sm" variant="ghost" onClick={() => { updateSession(s.id, { status: 'skipped', actualMinutes: null }); toast('Session skipped', 'info'); }} aria-label={`Skip "${s.topic}"`}><SkipForward className="h-3.5 w-3.5" />{!compact && 'Skip'}</Button>
    </div>
  );
  return <Button size="sm" variant="ghost" onClick={() => updateSession(s.id, { status: 'pending', actualMinutes: null })} aria-label={`Set "${s.topic}" back to pending`}><Undo2 className="h-3.5 w-3.5" />{!compact && 'Undo'}</Button>;
}
