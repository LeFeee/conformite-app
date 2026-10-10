-- Inventaire des actifs (ISO 27001 A.5.9, A.5.10, A.5.12 ; NIS2 art. 21 §2 i)

create type public.asset_category as enum ('donnees', 'application', 'service', 'materiel', 'locaux');
create type public.asset_classification as enum ('public', 'interne', 'confidentiel', 'sensible');

create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  category        public.asset_category not null,
  description     text not null default '',
  owner_name      text,
  classification  public.asset_classification not null default 'interne',
  essential       boolean not null default false,   -- l'activité s'arrête sans lui
  personal_data   boolean not null default false,
  location        text not null default '',
  supplier_id     uuid references public.suppliers(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index assets_org_idx on public.assets(org_id);

-- Un actif ne peut être rattaché qu'à un fournisseur de la même organisation.
create or replace function public.assets_check_supplier() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.supplier_id is not null and not exists (
    select 1 from suppliers s where s.id = new.supplier_id and s.org_id = new.org_id
  ) then
    raise exception 'fournisseur inconnu pour cette organisation';
  end if;
  return new;
end $$;
create trigger assets_check_supplier before insert or update on public.assets
  for each row execute function public.assets_check_supplier();

alter table public.assets enable row level security;
create policy assets_select on public.assets for select to authenticated using (is_member(org_id));
create policy assets_write  on public.assets for all    to authenticated using (can_edit(org_id)) with check (can_edit(org_id));
