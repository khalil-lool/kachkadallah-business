-- =========================================================
-- Kachkadallah Business — schéma Supabase
-- À exécuter dans : Supabase > SQL Editor > New query > Run
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. PROFILS (lie chaque compte de connexion à un rôle)
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_affiche text not null,
  role text not null check (role in ('operateur', 'consultant')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Tout utilisateur connecté peut voir les profils"
  on profiles for select
  to authenticated
  using (true);

-- Fonction utilitaire : l'utilisateur connecté est-il l'opérateur (admin) ?
create or replace function is_operateur()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'operateur'
  );
$$;

-- ---------------------------------------------------------
-- 2. COLIS (achat -> transport/frais -> vente -> bénéfice)
-- ---------------------------------------------------------
create table if not exists colis (
  id uuid primary key default gen_random_uuid(),
  produit text not null,
  quantite numeric(12,2) not null default 1 check (quantite > 0),
  prix_unitaire numeric(12,2) not null default 0 check (prix_unitaire >= 0),
  prix_achat numeric(12,2) not null default 0,
  transport numeric(12,2) not null default 0,
  autres_frais numeric(12,2) not null default 0,
  frais_commentaire text,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'vendu')),
  montant_vente numeric(12,2),
  date_achat date not null default current_date,
  date_vente date,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table colis enable row level security;

create policy "Lecture colis pour tout utilisateur connecté"
  on colis for select
  to authenticated
  using (true);

create policy "Ecriture colis reservee a l'operateur"
  on colis for insert
  to authenticated
  with check (is_operateur());

create policy "Modification colis reservee a l'operateur"
  on colis for update
  to authenticated
  using (is_operateur())
  with check (is_operateur());

create policy "Suppression colis reservee a l'operateur"
  on colis for delete
  to authenticated
  using (is_operateur());

-- Autorisations SQL requises en complément des politiques RLS ci-dessus.
-- Les politiques continuent de limiter les écritures au seul opérateur.
grant usage on schema public to authenticated;
grant select on profiles to authenticated;
grant select, insert, update, delete on colis to authenticated;

-- ---------------------------------------------------------
-- 3. DEPENSES IMPREVUES (toujours avec commentaire)
-- ---------------------------------------------------------
create table if not exists depenses (
  id uuid primary key default gen_random_uuid(),
  montant numeric(12,2) not null,
  commentaire text not null,
  date date not null default current_date,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table depenses enable row level security;

create policy "Lecture depenses pour tout utilisateur connecte"
  on depenses for select
  to authenticated
  using (true);

create policy "Ecriture depenses reservee a l'operateur"
  on depenses for insert
  to authenticated
  with check (is_operateur());

create policy "Modification depenses reservee a l'operateur"
  on depenses for update
  to authenticated
  using (is_operateur())
  with check (is_operateur());

create policy "Suppression depenses reservee a l'operateur"
  on depenses for delete
  to authenticated
  using (is_operateur());

grant select, insert, update, delete on depenses to authenticated;
grant execute on function is_operateur() to authenticated;

-- ---------------------------------------------------------
-- 4. Après avoir créé les 2 comptes dans
--    Authentication > Users (voir README), lie-les à un rôle :
-- ---------------------------------------------------------
-- insert into profiles (id, nom_affiche, role) values
--   ('UUID_DU_COMPTE_OPERATEUR', 'Toi (Opérateur)', 'operateur'),
--   ('UUID_DU_COMPTE_PATRON', 'Le Patron', 'consultant');
