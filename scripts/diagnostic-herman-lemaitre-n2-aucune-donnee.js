// Diagnostic lecture seule : l'utilisateur signale qu'en National 2, le
// joueur Herman Lemaitre n'a aucune donnée (0 match, 0 stat) alors qu'il
// joue et marque réellement. Recherche le joueur (recherche large sur le
// nom, au cas où l'orthographe exacte diffère), vérifie son club, ses
// lignes matchs_joueur, et repère les lignes calendrier_officiel de son
// club en N2 pour voir si le calendrier existe et si des stats y sont
// déjà rattachées (pour d'autres joueurs) — afin de savoir si le blocage
// vient du calendrier, du rapprochement joueur, ou d'une absence totale
// de synchronisation pour ce club/groupe.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

console.log('=== Recherche "Lemaitre" / "Lemaître" (tous niveaux, au cas où) ===\n');
const { data: candidats, error: errC } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues, buts')
  .or('nom.ilike.%lemaitre%,nom.ilike.%lema%tre%,prenom.ilike.%herman%');
if (errC) { console.error('Erreur recherche joueurs :', errC.message); process.exit(1); }
for (const j of candidats) {
  console.log(`id=${j.id} ${j.prenom} ${j.nom} — club="${j.club}" niveau=${j.niveau} saison=${j.saison} matchs_joues=${j.matchs_joues} buts=${j.buts}`);
}

const cible = candidats.find((j) => j.saison === SAISON && j.niveau === 'N2') || candidats.find((j) => j.saison === SAISON) || candidats[0];
if (!cible) {
  console.log('\nAucun joueur trouvé avec ce nom. Vérifier l\'orthographe exacte ou le club.');
  process.exit(0);
}
console.log(`\n=== Joueur ciblé : id=${cible.id} ${cible.prenom} ${cible.nom} (club="${cible.club}", niveau=${cible.niveau}) ===\n`);

const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, buts, calendrier_officiel_id')
  .eq('joueur_id', cible.id).eq('saison', SAISON).order('date_match');
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
console.log(`${mj.length} ligne(s) matchs_joueur pour ce joueur :`);
mj.forEach((m) => console.log(`  date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} buts=${m.buts} calendrier_officiel_id=${m.calendrier_officiel_id}`));

console.log(`\n=== Lignes calendrier_officiel N2 pour le club "${cible.club}" ===`);
const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N2');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }

function normaliserClub(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
const motsClub = normaliserClub(cible.club).split(' ').filter((w) => w.length > 2);
const lignesClub = cal.filter((r) => {
  const dom = normaliserClub(r.equipe_domicile), ext = normaliserClub(r.equipe_exterieur);
  return motsClub.some((w) => dom.includes(w)) || motsClub.some((w) => ext.includes(w));
});
console.log(`${lignesClub.length} ligne(s) trouvée(s) (recherche approximative sur les mots du club) :`);
for (const r of lignesClub.slice(0, 40)) console.log(`  id=${r.id} groupe=${r.groupe} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);

if (lignesClub.length) {
  const idsCal = lignesClub.map((r) => r.id);
  const { data: mjClub, error: errMjClub } = await supabase
    .from('matchs_joueur')
    .select('calendrier_officiel_id, minutes_jouees')
    .in('calendrier_officiel_id', idsCal);
  if (errMjClub) { console.error('Erreur matchs_joueur club :', errMjClub.message); process.exit(1); }
  const parLigne = new Map();
  for (const m of mjClub) {
    const k = m.calendrier_officiel_id;
    if (!parLigne.has(k)) parLigne.set(k, { total: 0, avecMinutes: 0 });
    const s = parLigne.get(k);
    s.total++;
    if (m.minutes_jouees != null) s.avecMinutes++;
  }
  console.log('\nÉtat de synchronisation des matchs de ce club (tous joueurs confondus) :');
  for (const r of lignesClub.slice(0, 40)) {
    const s = parLigne.get(r.id) || { total: 0, avecMinutes: 0 };
    console.log(`  id=${r.id} (${r.date_match}) "${r.equipe_domicile}" vs "${r.equipe_exterieur}" : ${s.avecMinutes}/${s.total} avec minutes_jouees`);
  }
}
