-- Sensibilisation des équipes (ISO 27001 §7.3 et A.6.3, NIS2 art. 20 §2 et art. 21 §2 g)

create type public.training_audience as enum ('salarie', 'dirigeant');
create type public.training_method as enum ('quiz', 'session', 'externe');

create table public.trainings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  person       text not null check (length(trim(person)) > 0),
  audience     public.training_audience not null default 'salarie',
  method       public.training_method not null,
  date         date not null default current_date,
  score        smallint check (score between 0 and 10),
  valid_until  date not null,
  notes        text not null default '',
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint trainings_quiz_has_score check (method <> 'quiz' or score is not null),
  constraint trainings_validity check (valid_until >= date)
);
create index trainings_org_idx on public.trainings(org_id);
create index trainings_person_idx on public.trainings(org_id, lower(person), date desc);

alter table public.trainings enable row level security;
create policy trainings_select on public.trainings for select to authenticated using (is_member(org_id));
create policy trainings_write  on public.trainings for all    to authenticated using (can_edit(org_id)) with check (can_edit(org_id));
