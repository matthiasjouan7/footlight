// Diagnostic lecture seule : vérifie que les joueurs des équipes de
// National 1 groupe C (en particulier Union Foot de Touraine, repêchée)
// ont bien un calendrier matchs_joueur à jour après import-fff-national1-
// groupec.js (calendrier_officiel) + generer-calendriers-existants.js
// (matchs_joueur).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function selectAll(table, colonnes, filtre) {
  let tous = [];
  let debut = 0;
  const TAILLE_PAGE = 1000;
  for (;;) {
    let q = supabase.from(table).select(colonnes).range(debut, debut + TAILLE_PAGE - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    tous = tous.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    debut += TAILLE_PAGE;
  }
  return tous;
}

const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison', (q) => q.eq('niveau', 'N1').eq('saison', '2026-2027'));
const touraine = joueurs.filter((j) => /touraine/i.test(j.club || ''));
console.log(`Joueurs N1 2026-2027 avec club contenant "Touraine" : ${touraine.length}`);
for (const j of touraine) console.log(`  ${j.prenom} ${j.nom} — "${j.club}"`);

if (touraine.length) {
  const idsTouraine = touraine.map((j) => j.id);
  const matchs = await selectAll('matchs_joueur', 'id, joueur_id, date_match, adversaire, domicile, calendrier_officiel_id', (q) => q.in('joueur_id', idsTouraine).eq('saison', '2026-2027'));
  console.log(`\nLignes matchs_joueur pour ces joueurs (saison 2026-2027) : ${matchs.length}`);
  const parJoueur = new Map();
  for (const m of matchs) parJoueur.set(m.joueur_id, (parJoueur.get(m.joueur_id) || 0) + 1);
  for (const j of touraine) console.log(`  ${j.prenom} ${j.nom} : ${parJoueur.get(j.id) || 0} match(s)`);
  console.log('\nAperçu (5 premières lignes) :');
  for (const m of matchs.slice(0, 5)) console.log(`  ${m.date_match} — ${m.domicile ? 'vs' : '@'} ${m.adversaire}`);
} else {
  console.log('\nAucun joueur trouvé avec "Touraine" dans le club — vérifier joueurs.club (niveau N1, saison 2026-2027).');
}

// Vérifie aussi les autres clubs du groupe C au global (couverture).
const { data: calGroupeC } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('division', 'N1')
  .eq('groupe', 'C')
  .eq('saison', '2026-2027');
const equipesGroupeC = new Set();
for (const c of calGroupeC || []) { equipesGroupeC.add(c.equipe_domicile); equipesGroupeC.add(c.equipe_exterieur); }
console.log(`\nÉquipes du calendrier officiel groupe C (${equipesGroupeC.size}) : ${[...equipesGroupeC].sort().join(', ')}`);
