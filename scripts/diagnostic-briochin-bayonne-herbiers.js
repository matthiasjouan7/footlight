// Diagnostic lecture seule : l'utilisateur signale des joueurs de
// Saint-Brieuc, Bayonne et Les Herbiers sans stats affichées. Hypothèse :
// même problème d'ambiguïté que Lorient B — le club des joueurs (table
// joueurs) correspond à DEUX noms différents dans calendrier_officiel pour
// la même équipe, ce qui bloque generer-calendriers-existants.js.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const MOTS_CLES = ['brieuc', 'briochin', 'bayonn', 'herbiers'];

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .or(MOTS_CLES.map((m) => `club.ilike.%${m}%`).join(','))
  .order('club', { ascending: true });
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`Joueur(s) correspondant : ${joueurs?.length || 0}`);
const parClub = new Map();
for (const j of joueurs || []) {
  const cle = `${j.club}|${j.niveau}|${j.saison}`;
  parClub.set(cle, (parClub.get(cle) || 0) + 1);
}
for (const [cle, n] of parClub) console.log(`  ${cle} : ${n} joueur(s)`);

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, saison, groupe')
  .eq('saison', '2026-2027');
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); process.exit(1); }
const equipesVues = new Map();
for (const m of cal || []) {
  for (const eq of [m.equipe_domicile, m.equipe_exterieur]) {
    const bas = (eq || '').toLowerCase();
    if (!MOTS_CLES.some((mc) => bas.includes(mc))) continue;
    const cle = `${eq}|${m.division}|groupe ${m.groupe || '-'}`;
    equipesVues.set(cle, (equipesVues.get(cle) || 0) + 1);
  }
}
console.log(`\nÉquipe(s) correspondante(s) dans calendrier_officiel (saison 2026-2027) :`);
for (const [cle, n] of equipesVues) console.log(`  ${cle} : ${n} match(s)`);
