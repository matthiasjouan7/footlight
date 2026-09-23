// Diagnostic lecture seule : signalement utilisateur — US Alençon 61 (N2
// groupe B) serait bloqué à 1 seul match joué.
//
// Historique connu (voir corrige-calendrier-alencon.js) : le nom joueur
// "US Alençon 61" et le nom officiel calendrier_officiel "Us Alenconnaise
// 61 1" ont été rapprochés via un remplacement de mot dans les scripts
// canoniques ; corrige-calendrier-alencon.js a déjà généré les lignes
// matchs_joueur "à jouer" liées au calendrier réel. Ce diagnostic vérifie
// l'état actuel : combien de matchs existent en calendrier pour ce club,
// combien de lignes matchs_joueur ont vraiment des minutes (donc comptent
// dans matchs_joues), et repère d'éventuels doublons calendrier.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const DIVISION = 'N2';
const GROUPE = 'B';
const CLUB_JOUEUR = 'US Alençon 61';

function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, date_match, journee, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', DIVISION).eq('groupe', GROUPE)
  .order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
console.log(`${(cal || []).length} ligne(s) calendrier_officiel au total pour N2 groupe B.\n`);

const matchs = (cal || []).filter((c) => normalise(c.equipe_domicile).includes('alenc') || normalise(c.equipe_exterieur).includes('alenc'));
console.log(`${matchs.length} match(s) impliquant Alençon (toutes graphies confondues) :\n`);

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
for (const m of matchs) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', m.id);
  const total = (mj || []).length;
  const avecMinutes = (mj || []).filter((x) => x.minutes_jouees != null).length;
  const statutDate = m.date_match > AUJOURD_HUI ? 'FUTUR' : 'passé';
  console.log(`  J${m.journee} ${m.date_match} (${statutDate}) — "${m.equipe_domicile}" vs "${m.equipe_exterieur}" (id=${m.id}) : ${avecMinutes}/${total} ligne(s) avec minutes`);
}

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

console.log('\n--- Effectif Alençon côté FootLight (matchs_joues par joueur) ---');
const { data: joueurs } = await supabase
  .from('joueurs').select('id, prenom, nom, club, matchs_joues')
  .eq('saison', SAISON).eq('niveau', DIVISION).eq('club', CLUB_JOUEUR);
console.log(`${(joueurs || []).length} joueur(s) trouvé(s) sous "${CLUB_JOUEUR}".`);
const parCompte = new Map();
for (const j of joueurs || []) parCompte.set(j.matchs_joues, (parCompte.get(j.matchs_joues) || 0) + 1);
for (const [compte, nb] of [...parCompte.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  matchs_joues=${compte} : ${nb} joueur(s)`);
}
