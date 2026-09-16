// Diagnostic lecture seule : Hyères est signalé à 3 matchs joués alors
// qu'il devrait être à 4. La première version de ce script utilisait une
// requête calendrier_officiel non scopée (saison seule, toutes divisions/
// groupes confondus) qui s'est révélée tronquée par la limite par défaut
// de Supabase (~1000 lignes) — même piège que pour Balagne (diagnostic-
// nom-club-balagne.js) : le match id=2810 (HYERES F.C. vs ISTRES FC,
// journée 3) n'apparaissait tout simplement pas dans le résultat. Scope
// directement sur division=N1 + groupe=C pour éviter toute troncature.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

const { data: calGroupeC, error } = await supabase
  .from('calendrier_officiel')
  .select('id, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N1').eq('groupe', 'C')
  .order('date_match');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${(calGroupeC || []).length} ligne(s) calendrier_officiel au total pour N1 groupe C (${SAISON}).\n`);

const matchs = (calGroupeC || []).filter((c) => normalise(c.equipe_domicile).includes('hyer') || normalise(c.equipe_exterieur).includes('hyer'));
console.log(`${matchs.length} match(s) impliquant Hyères (toutes graphies confondues) :\n`);

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
for (const m of matchs) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', m.id);
  const total = (mj || []).length;
  const avecMinutes = (mj || []).filter((x) => x.minutes_jouees != null).length;
  const statutDate = m.date_match > AUJOURD_HUI ? 'FUTUR' : 'passé';
  console.log(`  ${m.date_match} (${statutDate}) — "${m.equipe_domicile}" vs "${m.equipe_exterieur}" (id=${m.id}) : ${avecMinutes}/${total} ligne(s) avec minutes`);
}

// Repère les paires de dates très proches (à 1 jour d'écart) impliquant
// Hyères ou une équipe au nom proche : signe probable d'un doublon
// calendrier (même match réel inséré deux fois sous des graphies
// différentes), comme déjà observé et corrigé en N2.
console.log('\n--- Vérification doublon éventuel (dates proches, mêmes équipes) ---');
for (let i = 0; i < matchs.length; i++) {
  for (let j = i + 1; j < matchs.length; j++) {
    const a = matchs[i], b = matchs[j];
    const ecartJours = Math.abs((new Date(a.date_match) - new Date(b.date_match)) / 86400000);
    if (ecartJours <= 2) {
      console.log(`  Possible doublon : id=${a.id} (${a.date_match}, "${a.equipe_domicile}" vs "${a.equipe_exterieur}") <-> id=${b.id} (${b.date_match}, "${b.equipe_domicile}" vs "${b.equipe_exterieur}")`);
    }
  }
}

console.log('\n--- Effectif Hyères côté FootLight (matchs_joues par joueur) ---');
// ilike ne fait pas de comparaison insensible aux accents en Postgres : une
// recherche "%hyeres%" (sans accent) ne trouve pas "Hyères" (avec accent),
// piège déjà rencontré sur "Tiécoro" — on récupère donc tout le niveau N1
// de la saison et on filtre en JS après avoir retiré les accents.
const { data: joueursN1 } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau, matchs_joues')
  .eq('saison', SAISON).eq('niveau', 'N1');
const joueurs = (joueursN1 || []).filter((j) => normalise(j.club).includes('hyer'));
console.log(`${(joueurs || []).length} joueur(s) trouvé(s) (sur ${(joueursN1 || []).length} joueurs N1 scannés).`);
const club = [...new Set(joueurs.map((j) => j.club))].join(', ');
console.log(`Club exact observé côté joueurs : ${club}`);
const parCompte = new Map();
for (const j of joueurs) parCompte.set(j.matchs_joues, (parCompte.get(j.matchs_joues) || 0) + 1);
for (const [compte, nb] of [...parCompte.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  matchs_joues=${compte} : ${nb} joueur(s)`);
}
