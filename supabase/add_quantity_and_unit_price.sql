-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Ajoute quantité et prix unitaire aux colis déjà enregistrés.

alter table public.colis
  add column if not exists quantite numeric(12,2) not null default 1,
  add column if not exists prix_unitaire numeric(12,2) not null default 0;

-- Les anciens colis correspondent à une unité : leur ancien prix d'achat
-- devient donc leur prix unitaire.
update public.colis
set prix_unitaire = prix_achat / nullif(quantite, 0)
where prix_unitaire = 0 and prix_achat <> 0;
