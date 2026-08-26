-- Schéma de la partie, à exécuter UNE FOIS dans Supabase.
--
-- Où : supabase.com > ton projet > SQL Editor > New query > coller > Run.
--
-- Deux tables seulement :
--   etat    : les réglages et listes du jeu, une ligne par bloc
--   joueurs : une ligne par joueur, pour que deux appareils qui modifient
--             deux joueurs différents ne se gênent pas

create table if not exists etat (
  cle text primary key,
  valeur jsonb not null,
  modifie_le timestamptz not null default now()
);

create table if not exists joueurs (
  id text primary key,
  donnees jsonb not null,
  -- Incrémentée à chaque écriture : c'est elle qui permet de détecter que
  -- quelqu'un d'autre a modifié le joueur entre notre lecture et notre
  -- écriture, et de rejouer la modification sur la valeur à jour.
  version bigint not null default 0,
  modifie_le timestamptz not null default now()
);

-- Diffusion en direct des changements vers les appareils connectés
alter publication supabase_realtime add table etat;
alter publication supabase_realtime add table joueurs;

-- Accès. Pendant l'événement, les appareils utilisent la clé publique
-- (anon) : on ouvre donc lecture et écriture à tous ceux qui ont l'URL,
-- exactement comme le mode test de Firebase.
--
-- ATTENTION : n'importe qui connaissant l'URL et la clé peut lire les
-- soldes et les codes des joueurs, et les modifier. C'est acceptable pour
-- une soirée entre amis ; ça ne le serait pas pour autre chose. Après
-- l'événement, supprime le projet ou remplace ces règles.
alter table etat enable row level security;
alter table joueurs enable row level security;

drop policy if exists "partie ouverte" on etat;
drop policy if exists "partie ouverte" on joueurs;

create policy "partie ouverte" on etat
  for all using (true) with check (true);
create policy "partie ouverte" on joueurs
  for all using (true) with check (true);
