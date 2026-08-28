// Diagnostic lecture seule : le nettoyage des ambiguïtés calendrier N1
// (nettoyer-ambiguites-n1.js) vient de tourner et devrait avoir supprimé
// les lignes calendrier_officiel orphelines "Bayonne" et "Granville".
// L'utilisateur signale pourtant 2 joueurs nouvellement ajoutés (un de
// Bayonne, un de Granville) avec 31 matchs au lieu de 30, la journée 1
// apparaissant deux fois (une fois "Bayonne", une fois "Aviron Bayonnais
// FC"). Ce script vérifie : (1) l'état actuel de calendrier_officiel pour
// ces deux clubs (une ligne orpheline a-t-elle été recréée après le
// nettoyage ?), (2) les matchs_joueur réels des 2 joueurs concernés.
// Version allégée en nombre de requêtes (une seule requête joueurs + une
// seule requête matchs_joueur groupées) et sortie explicite du process.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const { data: calendrier, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
    .eq('division', 'N1')
    .eq('saison', SAISON);
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exitCode = 1; return; }
  console.log(`${calendrier.length} ligne(s) calendrier_officiel N1 ${SAISON}.\n`);

  for (const mot of ['bayonn', 'granville']) {
    console.log(`=== Lignes calendrier contenant "${mot}" ===`);
    const lignes = calendrier.filter((r) =>
      normaliser(r.equipe_domicile).includes(mot) || normaliser(r.equipe_exterieur).includes(mot)
    );
    for (const l of lignes) {
      console.log(`  id=${l.id} | ${l.date_match} | "${l.equipe_domicile}" vs "${l.equipe_exterieur}" | groupe=${l.groupe}`);
    }
    console.log(`  (${lignes.length} ligne(s))\n`);
  }

  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison')
    .or('club.ilike.%bayonn%,club.ilike.%granville%')
    .eq('niveau', 'N1')
    .eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }
  console.log(`=== ${joueurs.length} joueur(s) dont le club contient "bayonn" ou "granville" ===`);
  for (const j of joueurs) console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}")`);
  if (!joueurs.length) return;

  const { data: mjAll, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, date_match, adversaire, domicile, calendrier_officiel_id')
    .in('joueur_id', joueurs.map((j) => j.id))
    .eq('saison', SAISON);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }

  for (const j of joueurs) {
    const mj = mjAll.filter((m) => m.joueur_id === j.id).sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
    console.log(`\n${j.prenom} ${j.nom} (club="${j.club}") : ${mj.length} matchs_joueur.`);
    const parDate = new Map();
    for (const m of mj) {
      if (!parDate.has(m.date_match)) parDate.set(m.date_match, []);
      parDate.get(m.date_match).push(m);
    }
    for (const [date, lignes] of parDate) {
      if (lignes.length > 1) {
        console.log(`  ⚠️  Date ${date} en double (${lignes.length}) :`);
        for (const l of lignes) console.log(`      id=${l.id} adversaire="${l.adversaire}" calendrier_officiel_id=${l.calendrier_officiel_id}`);
      }
    }
  }
}

main().finally(() => process.exit(process.exitCode || 0));
