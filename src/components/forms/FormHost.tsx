import { useUI } from '../../store/UIContext';
import { SubjectDialog } from './SubjectDialog';
import { TaskDialog } from './TaskDialog';
import { SessionDialog } from './SessionDialog';
import { ExamDialog } from './ExamDialog';
import { EventDialog } from './EventDialog';

/** Mounts whichever create/edit dialog is requested via useUI().openForm(), from anywhere in the app. */
export function FormHost() {
  const { form, closeForm } = useUI();
  if (!form) return null;
  const key = `${form.type}-${form.id ?? 'new'}`;
  switch (form.type) {
    case 'subject': return <SubjectDialog key={key} id={form.id} onClose={closeForm} />;
    case 'task': return <TaskDialog key={key} id={form.id} defaults={form.defaults} onClose={closeForm} />;
    case 'session': return <SessionDialog key={key} id={form.id} defaults={form.defaults} onClose={closeForm} />;
    case 'exam': return <ExamDialog key={key} id={form.id} defaults={form.defaults} onClose={closeForm} />;
    case 'event': return <EventDialog key={key} id={form.id} defaults={form.defaults} onClose={closeForm} />;
  }
}
