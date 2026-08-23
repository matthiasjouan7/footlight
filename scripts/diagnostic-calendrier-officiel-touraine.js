// Diagnostic lecture seule : l'utilisateur signale que le calendrier des
// joueurs Union Foot de Touraine (N1 groupe C, 2026-2027) est INCOMPLET
// (seulement 7 matchs trouvés dans matchs_joueur pour Popineau et Lopez,
// alors qu'avec 17 équipes on attend ~32 matchs par équipe sur la saison).
// Vérifie directement la table calendrier_officiel : combien de lignes
// concernent Touraine, et pourquoi generer-calendriers-existants.js n'en
// a-t-il rapproché que 7 (bug de dédoublonnage par date_match seule dans
// ce script, ou données manquantes en base ?).
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

const toutGroupeC = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match, journee', (q) => q.eq('division', 'N1').eq('groupe', 'C').eq('saison', '2026-2027'));
console.log(`Lignes calendrier_officiel N1 groupe C 2026-2027 (toutes équipes) : ${toutGroupeC.length}`);

const touraine = toutGroupeC.filter((r) => /touraine/i.test(r.equipe_domicile) || /touraine/i.test(r.equipe_exterieur));
console.log(`\nLignes impliquant Touraine : ${touraine.length}`);
touraine.sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
for (const r of touraine) {
  console.log(`  id=${r.id} — J${r.journee} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
}

const datesDistinctes = new Set(touraine.map((r) => r.date_match));
console.log(`\nDates distinctes : ${datesDistinctes.size}`);

const journeesDistinctes = new Set(touraine.map((r) => r.journee));
console.log(`Journées distinctes : ${journeesDistinctes.size} -> ${[...journeesDistinctes].sort((a,b)=>a-b).join(', ')}`);

// Vérifie les noms d'équipes distincts contenant "touraine" pour détecter
// un souci de casse/format qui ferait échouer le rapprochement club dans
// generer-calendriers-existants.js (clubWordsMatch).
const nomsEquipes = new Set();
for (const r of touraine) {
  if (/touraine/i.test(r.equipe_domicile)) nomsEquipes.add(r.equipe_domicile);
  if (/touraine/i.test(r.equipe_exterieur)) nomsEquipes.add(r.equipe_exterieur);
}
console.log(`\nOrthographes distinctes du nom d'équipe Touraine dans le calendrier : ${[...nomsEquipes].join(' | ')}`);
