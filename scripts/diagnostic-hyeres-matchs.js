// Diagnostic lecture seule : Hyères est signalé à 3 matchs joués alors
// qu'il devrait être à 4. Liste tous les matchs calendrier_officiel N2
// impliquant Hyères, avec le nombre de lignes matchs_joueur avec/sans
// minutes pour chacun, pour identifier précisément quel match manque.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

const { data: cal, error } = await supabase
  .from('calendrier_officiel')
  .select('id, division, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const matchs = (cal || []).filter((c) => normalise(c.equipe_domicile).includes('hyeres') || normalise(c.equipe_exterieur).includes('hyeres'));
matchs.sort((a, b) => new Date(a.date_match) - new Date(b.date_match));

console.log(`${matchs.length} match(s) calendrier_officiel trouvé(s) pour un club "hyeres" (${SAISON}).\n`);

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
for (const m of matchs) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', m.id);
  const total = (mj || []).length;
  const avecMinutes = (mj || []).filter((x) => x.minutes_jouees != null).length;
  const statutDate = m.date_match > AUJOURD_HUI ? 'FUTUR' : 'passé';
  console.log(`${m.date_match} (${statutDate}) ${m.division} groupe ${m.groupe} — ${m.equipe_domicile} vs ${m.equipe_exterieur} (id=${m.id}) : ${avecMinutes}/${total} ligne(s) avec minutes`);
}

console.log('\n--- Effectif Hyères côté FootLight (matchs_joues par joueur) ---');
const { data: joueurs } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau, matchs_joues')
  .eq('saison', SAISON).ilike('club', '%hyeres%');
console.log(`${(joueurs || []).length} joueur(s) trouvé(s).`);
const parNiveau = new Map();
for (const j of joueurs || []) {
  if (!parNiveau.has(j.niveau)) parNiveau.set(j.niveau, []);
  parNiveau.get(j.niveau).push(j);
}
for (const [niveau, liste] of parNiveau) {
  console.log(`\nNiveau ${niveau} (${liste.length} joueur(s)) — club exact observé : ${[...new Set(liste.map((j) => j.club))].join(', ')}`);
  const parCompte = new Map();
  for (const j of liste) parCompte.set(j.matchs_joues, (parCompte.get(j.matchs_joues) || 0) + 1);
  for (const [compte, nb] of [...parCompte.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  matchs_joues=${compte} : ${nb} joueur(s)`);
  }
}
