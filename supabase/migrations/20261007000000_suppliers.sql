-- Registre des fournisseurs (ISO 27001 A.5.19 à A.5.22, NIS2 art. 21 §2 d)

create type public.supplier_criticality as enum ('critique', 'importante', 'standard');
create type public.supplier_data_access as enum ('aucune', 'internes', 'personnelles', 'sensibles');

create table public.suppliers (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations(id) on delete cascade,
  name                   text not null,
  service                text not null default '',
  contact                text not null default '',
  criticality            public.supplier_criticality not null default 'importante',
  data_access            public.supplier_data_access not null default 'internes',
  has_security_clauses   boolean not null default false,
  has_dpa                boolean not null default false,
  certifications         text not null default '',
  questionnaire_sent_at  timestamptz,
  answers                jsonb not null default '{}'::jsonb,  -- {question_id: 'oui'|'partiel'|'non'}
  answered_at            timestamptz,
  last_review_at         timestamptz,
  notes                  text not null default '',
  created_at             timestamptz not null default now()
);
create index suppliers_org_idx on public.suppliers(org_id);

alter table public.suppliers enable row level security;
create policy suppliers_select on public.suppliers for select to authenticated using (is_member(org_id));
create policy suppliers_write  on public.suppliers for all    to authenticated using (can_edit(org_id)) with check (can_edit(org_id));
