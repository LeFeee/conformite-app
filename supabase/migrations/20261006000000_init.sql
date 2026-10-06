-- =============================================================================
-- Conformité ISO 27001 + NIS2 — schéma initial
-- Multi-organisations, sécurisé par RLS (chaque membre ne voit que son orga).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Catalogue (commun à toutes les organisations, lecture seule pour les users)
-- ----------------------------------------------------------------------------
create table public.frameworks (
  id          text primary key,              -- 'iso27001' | 'nis2'
  name        text not null,
  short_name  text not null,
  version     text not null,
  description text not null
);

create table public.requirements (
  id           text primary key,             -- 'iso27001:A.5.1', 'nis2:21.2.a'
  framework_id text not null references public.frameworks(id),
  ref          text not null,
  title        text not null,
  sort         int  not null default 0
);

create type public.control_theme as enum
  ('gouvernance', 'organisationnel', 'humain', 'physique', 'technologique');
create type public.control_priority as enum ('socle', 'standard');

create table public.controls (
  id                  text primary key,      -- 'A.5.1', 'SMSI.6.1', 'NIS2.23'
  title               text not null,
  en_clair            text not null,
  theme               public.control_theme not null,
  priority            public.control_priority not null default 'standard',
  applicability_tags  text[] not null default '{}',
  evidence_examples   text[] not null default '{}',
  review_days         int  not null default 365,
  sort                int  not null default 0
);

create table public.control_requirements (
  control_id     text not null references public.controls(id) on delete cascade,
  requirement_id text not null references public.requirements(id) on delete cascade,
  primary key (control_id, requirement_id)
);

-- ----------------------------------------------------------------------------
-- Organisations et membres
-- ----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'contributor', 'auditor');
create type public.nis2_status as enum ('essentielle', 'importante', 'cascade', 'hors_champ');

create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  activity        text,
  scoping         jsonb not null default '{}'::jsonb,   -- réponses du questionnaire
  nis2_status     public.nis2_status,
  target_iso27001 boolean not null default true,
  target_nis2     boolean not null default true,
  plan            text not null default 'essentiel',      -- essentiel | croissance | accompagne
  created_at      timestamptz not null default now()
);

create table public.memberships (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.member_role not null default 'contributor',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Fonctions d'aide RLS (security definer pour éviter la récursion sur memberships)
create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.can_edit(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'contributor')
  );
$$;

create or replace function public.is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- État des contrôles par organisation
-- ----------------------------------------------------------------------------
create type public.control_status as enum ('a_faire', 'en_cours', 'conforme', 'non_applicable');

create table public.org_controls (
  org_id            uuid not null references public.organizations(id) on delete cascade,
  control_id        text not null references public.controls(id),
  status            public.control_status not null default 'a_faire',
  applicable        boolean not null default true,
  exclusion_reason  text,
  owner_id          uuid references auth.users(id) on delete set null,
  owner_name        text,
  due_date          date,
  notes             text not null default '',
  last_reviewed_at  timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (org_id, control_id),
  constraint exclusion_justified check (applicable or exclusion_reason is not null)
);

-- ----------------------------------------------------------------------------
-- Preuves (fichiers dans le bucket privé "evidences", chemin = org_id/…)
-- ----------------------------------------------------------------------------
create type public.evidence_kind as enum ('document', 'photo', 'capture', 'registre', 'lien', 'autre');

create table public.evidences (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  control_id   text not null references public.controls(id),
  title        text not null,
  kind         public.evidence_kind not null default 'document',
  storage_path text,
  external_url text,
  valid_until  date,
  added_by     uuid references auth.users(id) on delete set null,
  added_at     timestamptz not null default now()
);
create index evidences_org_control_idx on public.evidences(org_id, control_id);
create index evidences_valid_until_idx on public.evidences(valid_until) where valid_until is not null;

-- ----------------------------------------------------------------------------
-- Registre des risques (ISO 27001 §6.1 / NIS2 art. 21 §2 a)
-- ----------------------------------------------------------------------------
create type public.risk_treatment as enum ('reduire', 'accepter', 'transferer', 'eviter');

create table public.risks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  asset       text not null,
  threat      text not null,
  likelihood  smallint not null check (likelihood between 1 and 4),
  impact      smallint not null check (impact between 1 and 4),
  treatment   public.risk_treatment not null default 'reduire',
  owner_name  text,
  control_ids text[] not null default '{}',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Incidents (NIS2 art. 23 : alerte 24 h, notification 72 h, rapport 1 mois)
-- ----------------------------------------------------------------------------
create type public.incident_status as enum ('ouvert', 'en_traitement', 'clos');

create table public.incidents (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  title               text not null,
  description         text not null default '',
  detected_at         timestamptz not null,
  significant         boolean not null default false,       -- incident "important" au sens NIS2
  early_warning_at    timestamptz,                          -- alerte précoce (≤ 24 h)
  notification_at     timestamptz,                          -- notification (≤ 72 h)
  final_report_at     timestamptz,                          -- rapport final (≤ 1 mois)
  status              public.incident_status not null default 'ouvert',
  lessons_learned     text,
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Journal d'activité (piste d'audit)
-- ----------------------------------------------------------------------------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  payload    jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create index activity_log_org_idx on public.activity_log(org_id, at desc);

-- ----------------------------------------------------------------------------
-- Création d'une organisation : RPC transactionnelle
-- (crée l'orga, le membre owner et l'état initial des contrôles)
-- ----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_activity text,
  p_scoping jsonb,
  p_nis2_status public.nis2_status,
  p_target_iso boolean,
  p_target_nis2 boolean,
  p_controls jsonb   -- [{control_id, applicable, exclusion_reason}]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'non authentifié'; end if;

  insert into organizations (name, activity, scoping, nis2_status, target_iso27001, target_nis2)
  values (p_name, p_activity, p_scoping, p_nis2_status, p_target_iso, p_target_nis2)
  returning id into v_org;

  insert into memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');

  insert into org_controls (org_id, control_id, applicable, exclusion_reason, status)
  select v_org,
         c->>'control_id',
         (c->>'applicable')::boolean,
         nullif(c->>'exclusion_reason', ''),
         case when (c->>'applicable')::boolean then 'a_faire' else 'non_applicable' end::control_status
  from jsonb_array_elements(p_controls) c;

  insert into activity_log (org_id, actor_id, action, entity, entity_id)
  values (v_org, auth.uid(), 'create', 'organization', v_org::text);

  return v_org;
end $$;

-- ----------------------------------------------------------------------------
-- Vue des alertes calculées côté base (utilisée par l'envoi d'emails planifié)
-- ----------------------------------------------------------------------------
create or replace view public.org_alerts with (security_invoker = true) as
  select e.org_id, 'preuve_expiree'::text as kind, 'critique'::text as severity,
         e.control_id, e.id::text as ref_id, e.title, e.valid_until as due
  from evidences e where e.valid_until < current_date
union all
  select e.org_id, 'preuve_bientot', 'attention', e.control_id, e.id::text, e.title, e.valid_until
  from evidences e where e.valid_until between current_date and current_date + 30
union all
  select oc.org_id, 'echeance_depassee', 'critique', oc.control_id, oc.control_id, c.title, oc.due_date
  from org_controls oc join controls c on c.id = oc.control_id
  where oc.applicable and oc.status in ('a_faire', 'en_cours') and oc.due_date < current_date;

-- ----------------------------------------------------------------------------
-- updated_at automatique
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger org_controls_touch before update on public.org_controls
  for each row execute function public.touch_updated_at();
create trigger risks_touch before update on public.risks
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.frameworks           enable row level security;
alter table public.requirements         enable row level security;
alter table public.controls             enable row level security;
alter table public.control_requirements enable row level security;
alter table public.organizations        enable row level security;
alter table public.memberships          enable row level security;
alter table public.org_controls         enable row level security;
alter table public.evidences            enable row level security;
alter table public.risks                enable row level security;
alter table public.incidents            enable row level security;
alter table public.activity_log         enable row level security;

-- Catalogue : lecture pour tout utilisateur connecté
create policy catalog_read on public.frameworks           for select to authenticated using (true);
create policy catalog_read on public.requirements         for select to authenticated using (true);
create policy catalog_read on public.controls             for select to authenticated using (true);
create policy catalog_read on public.control_requirements for select to authenticated using (true);

-- Organisations
create policy org_select on public.organizations for select to authenticated using (is_member(id));
create policy org_update on public.organizations for update to authenticated using (is_admin(id)) with check (is_admin(id));
-- (création uniquement via create_organization)

-- Membres
create policy members_select on public.memberships for select to authenticated using (is_member(org_id));
create policy members_admin  on public.memberships for all    to authenticated using (is_admin(org_id)) with check (is_admin(org_id));

-- Données métier : lecture pour les membres (y compris auditeurs), écriture pour les éditeurs
create policy oc_select on public.org_controls for select to authenticated using (is_member(org_id));
create policy oc_write  on public.org_controls for update to authenticated using (can_edit(org_id)) with check (can_edit(org_id));

create policy ev_select on public.evidences for select to authenticated using (is_member(org_id));
create policy ev_insert on public.evidences for insert to authenticated with check (can_edit(org_id));
create policy ev_update on public.evidences for update to authenticated using (can_edit(org_id)) with check (can_edit(org_id));
create policy ev_delete on public.evidences for delete to authenticated using (can_edit(org_id));

create policy risks_select on public.risks for select to authenticated using (is_member(org_id));
create policy risks_write  on public.risks for all    to authenticated using (can_edit(org_id)) with check (can_edit(org_id));

create policy inc_select on public.incidents for select to authenticated using (is_member(org_id));
create policy inc_write  on public.incidents for all    to authenticated using (can_edit(org_id)) with check (can_edit(org_id));

create policy log_select on public.activity_log for select to authenticated using (is_member(org_id));
create policy log_insert on public.activity_log for insert to authenticated with check (can_edit(org_id) and actor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Stockage des preuves : bucket privé, premier dossier = org_id
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidences', 'evidences', false)
on conflict (id) do nothing;

create policy evidences_read on storage.objects for select to authenticated
  using (bucket_id = 'evidences' and is_member(((storage.foldername(name))[1])::uuid));
create policy evidences_write on storage.objects for insert to authenticated
  with check (bucket_id = 'evidences' and can_edit(((storage.foldername(name))[1])::uuid));
create policy evidences_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidences' and can_edit(((storage.foldername(name))[1])::uuid));
