// Diagnostic lecture seule : l'utilisateur signale des joueurs d'Amiens et
// de La Roche affichés en National 1 (niveau N1) alors qu'ils devraient
// être en Ligue 3 (Amiens SC et La Roche VF évoluent en Ligue 3, pas N1).
// Liste les joueurs concernés (table joueurs, champ niveau) et vérifie ce
// que dit calendrier_officiel pour ces clubs.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .or('club.ilike.%amiens%,club.ilike.%roche%')
  .order('club', { ascending: true });
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`Joueur(s) "amiens"/"roche" dans joueurs : ${joueurs?.length || 0}`);
const parClubNiveau = new Map();
for (const j of joueurs || []) {
  const cle = `${j.club}|${j.niveau}|${j.saison}`;
  parClubNiveau.set(cle, (parClubNiveau.get(cle) || 0) + 1);
}
for (const [cle, n] of parClubNiveau) console.log(`  ${cle} : ${n} joueur(s)`);

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, saison, groupe')
  .or('equipe_domicile.ilike.%amiens%,equipe_exterieur.ilike.%amiens%,equipe_domicile.ilike.%roche%,equipe_exterieur.ilike.%roche%');
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); process.exit(1); }
const equipesVues = new Map();
for (const m of cal || []) {
  for (const [eq, div] of [[m.equipe_domicile, m.division], [m.equipe_exterieur, m.division]]) {
    if (!(eq || '').toLowerCase().match(/amiens|roche/)) continue;
    const cle = `${eq}|${div}|${m.saison}|groupe ${m.groupe || '-'}`;
    equipesVues.set(cle, (equipesVues.get(cle) || 0) + 1);
  }
}
console.log(`\nÉquipe(s) "amiens"/"roche" dans calendrier_officiel :`);
for (const [cle, n] of equipesVues) console.log(`  ${cle} : ${n} match(s)`);
