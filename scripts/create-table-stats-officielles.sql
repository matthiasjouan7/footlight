-- Stats de saison "officielles" (source externe : flashscore.fr), séparées
-- des stats saisies à la main par le joueur (joueurs / stats_saisons /
-- matchs_joueur). Affichées en complément sur le profil, jamais fusionnées
-- avec les données du joueur.
create table if not exists stats_officielles (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references joueurs(id) on delete cascade,
  saison text not null,
  source text not null default 'flashscore',
  club text,
  matchs_joues integer,
  minutes integer,
  buts integer,
  passes_decisives integer,
  cartons_jaunes integer,
  cartons_rouges integer,
  lien_source text,
  updated_at timestamptz not null default now(),
  unique (joueur_id, saison, source)
);

alter table stats_officielles enable row level security;

-- Lecture publique (comme les autres tables de stats affichées sur les
-- profils) ; écriture réservée au rôle service (scripts de synchro).
create policy "stats_officielles lecture publique" on stats_officielles
  for select using (true);
