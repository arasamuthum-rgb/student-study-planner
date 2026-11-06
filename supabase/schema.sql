-- Student Study Planner: PostgreSQL schema for Supabase.
-- Run in the Supabase SQL editor. Every personal row belongs to auth.uid() and is protected by Row Level Security.
-- NOTE: the app in this repository currently persists to localStorage. This schema is ready for a Supabase storage adapter.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles & preferences ----------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  email text not null default '' check (char_length(email) <= 254),
  school text not null default '' check (char_length(school) <= 80),
  term text not null default '' check (char_length(term) <= 40),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark','system')),
  accent text not null default 'sky' check (accent in ('sky','indigo','emerald','violet','rose')),
  first_day_of_week smallint not null default 1 check (first_day_of_week in (0,1,6)),
  compact_sidebar boolean not null default false,
  focus_minutes smallint not null default 25 check (focus_minutes between 1 and 180),
  short_break_minutes smallint not null default 5 check (short_break_minutes between 1 and 60),
  long_break_minutes smallint not null default 15 check (long_break_minutes between 1 and 120),
  long_break_every smallint not null default 4 check (long_break_every between 2 and 12),
  weekly_goal_hours numeric(5,1) not null default 15 check (weekly_goal_hours between 1 and 100),
  study_day_start time not null default '08:00', study_day_end time not null default '21:00',
  notify_deadlines boolean not null default true, notify_overdue boolean not null default true,
  notify_exams boolean not null default true, browser_notifications boolean not null default false,
  updated_at timestamptz not null default now(),
  check (study_day_end >= study_day_start + interval '1 hour')
);

-- ---------- academic data ----------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null default '' check (char_length(code) <= 20),
  instructor text not null default '' check (char_length(instructor) <= 80),
  term text not null check (char_length(term) between 1 and 40),
  target_hours_per_week numeric(4,1) not null default 4 check (target_hours_per_week between 0 and 80),
  color text not null default '#0ea5e9' check (color ~ '^#[0-9a-fA-F]{6}$'),
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  total_topics integer not null default 0 check (total_topics between 0 and 500),
  completed_topics integer not null default 0 check (completed_topics >= 0),
  notes text not null default '' check (char_length(notes) <= 5000),
  resources text not null default '' check (char_length(resources) <= 3000),
  archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (completed_topics <= total_topics),
  unique (id, user_id)
);
create index subjects_user_idx on public.subjects (user_id, archived);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  due_date date not null, due_time time not null default '23:59',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  estimated_minutes integer not null default 60 check (estimated_minutes between 5 and 2400),
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array'),
  notes text not null default '' check (char_length(notes) <= 3000),
  completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);
create index tasks_user_due_idx on public.tasks (user_id, due_date) where status <> 'completed';
create index tasks_subject_idx on public.tasks (subject_id);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  session_date date not null, start_time time not null, end_time time not null,
  topic text not null check (char_length(topic) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','completed','skipped')),
  actual_minutes integer check (actual_minutes between 1 and 720),
  recurrence_group_id uuid,
  source text not null default 'manual' check (source in ('manual','recommended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_time > start_time),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);
create index sessions_user_date_idx on public.study_sessions (user_id, session_date);

-- Server-side overlap guard (the app also checks on the client).
create or replace function public.prevent_session_overlap() returns trigger language plpgsql as $$
begin
  if new.status <> 'skipped' and exists (
    select 1 from public.study_sessions s
    where s.user_id = new.user_id and s.session_date = new.session_date and s.id <> new.id and s.status <> 'skipped'
      and s.start_time < new.end_time and new.start_time < s.end_time
  ) then raise exception 'Study session overlaps an existing session' using errcode = '23P01'; end if;
  return new;
end $$;
create trigger study_sessions_no_overlap before insert or update on public.study_sessions
  for each row execute function public.prevent_session_overlap();

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  title text not null check (char_length(title) between 1 and 100),
  exam_date date not null, exam_time time not null default '09:00',
  exam_type text not null default 'midterm' check (exam_type in ('midterm','final','quiz','practical','other')),
  location text not null default '' check (char_length(location) <= 80),
  target_completion_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (target_completion_date is null or target_completion_date <= exam_date),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  unique (id, user_id)
);
create index exams_user_date_idx on public.exams (user_id, exam_date);

create table public.exam_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exam_id uuid not null,
  chapter text not null default '' check (char_length(chapter) <= 80),
  title text not null check (char_length(title) between 1 and 120),
  done boolean not null default false,
  confidence smallint not null default 3 check (confidence between 1 and 5),
  target_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);
create index exam_topics_exam_idx on public.exam_topics (exam_id);

create table public.timetable_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(title) between 1 and 80),
  event_type text not null default 'lecture' check (event_type in ('lecture','lab','self_study','break','other')),
  location text not null default '' check (char_length(location) <= 80),
  repeat text not null default 'weekly' check (repeat in ('weekly','once')),
  weekday smallint check (weekday between 0 and 6), event_date date,
  start_time time not null, end_time time not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check ((repeat = 'weekly' and weekday is not null) or (repeat = 'once' and event_date is not null)),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);
create index timetable_user_idx on public.timetable_events (user_id, weekday);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid, task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null, minutes smallint not null check (minutes between 1 and 240),
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);
create index focus_user_started_idx on public.focus_sessions (user_id, started_at desc);

-- ---------- updated_at triggers ----------
do $$ declare t text; begin
  foreach t in array array['profiles','user_preferences','subjects','tasks','study_sessions','exams','exam_topics','timetable_events'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$ declare t text; begin
  foreach t in array array['profiles','user_preferences','subjects','tasks','study_sessions','exams','exam_topics','timetable_events','focus_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end $$;

-- Create a profile and default preferences when a user signs up.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email) values (new.id, coalesce(new.email, ''));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
