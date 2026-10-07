-- Colonnes nécessaires à la synchronisation avec l'application
-- (noms affichés et identifiants générés côté navigateur).

alter table public.evidences
  add column file_name     text,
  add column added_by_name text;

alter table public.activity_log
  add column client_id  uuid unique,       -- identifiant créé par l'application : rend l'envoi idempotent
  add column actor_name text,
  add column message    text;

-- Retrouver rapidement les organisations d'un utilisateur à la connexion.
create or replace view public.my_organizations with (security_invoker = true) as
  select o.id, o.name, m.role, o.created_at
  from public.organizations o
  join public.memberships m on m.org_id = o.id
  where m.user_id = auth.uid();
