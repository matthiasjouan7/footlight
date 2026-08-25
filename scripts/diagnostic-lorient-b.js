// Diagnostic lecture seule : pourquoi les joueurs de Lorient B n'ont pas de
// calendrier généré. generer-calendriers-existants.js signalait ce club en
// "Ambigu" : le club "FC Lorient B" (en base, table joueurs) correspond à
// DEUX entrées distinctes dans calendrier_officiel : "FC LORIENT 2" et
// "Lorient B". Ce diagnostic liste les occurrences précises pour trancher.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, saison, groupe')
  .or('equipe_domicile.ilike.%lorient%,equipe_exterieur.ilike.%lorient%');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

const noms = new Map();
for (const m of calendrier || []) {
  for (const equipe of [m.equipe_domicile, m.equipe_exterieur]) {
    if (!(equipe || '').toLowerCase().includes('lorient')) continue;
    const cle = `${equipe}|${m.division}|${m.saison}|${m.groupe || '-'}`;
    noms.set(cle, (noms.get(cle) || 0) + 1);
  }
}
console.log(`Entrées "lorient" dans calendrier_officiel :`);
for (const [cle, n] of noms) console.log(`  ${cle} (${n} match(s))`);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .ilike('club', '%lorient%');
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`\nJoueur(s) en base avec club contenant "lorient" : ${joueurs?.length || 0}`);
const clubsJoueurs = new Map();
for (const j of joueurs || []) clubsJoueurs.set(j.club, (clubsJoueurs.get(j.club) || 0) + 1);
for (const [club, n] of clubsJoueurs) console.log(`  club="${club}" : ${n} joueur(s)`);
