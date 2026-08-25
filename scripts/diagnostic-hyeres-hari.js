// Diagnostic lecture seule : Esteban Hari (club="Hyères 83 FC") n'a
// qu'1 seul match en base au lieu d'une saison complète. Hypothèse :
// "Hyères 83 FC" contient "83" (département) qui n'est pas en dernière
// position du nom (donc pas strippé par normalizeClub, qui ne retire que
// le suffixe numérique final), ce qui empêche clubWordsMatch de le faire
// correspondre au nom officiel complet dans calendrier_officiel — seule
// la ligne orpheline "Hyères" (1 seul match) matche encore, pas le nom
// complet officiel. Vérifie le(s) nom(s) exact(s) utilisés dans
// calendrier_officiel pour Hyères.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, saison, date_match')
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%hyer%,equipe_exterieur.ilike.%hyer%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const noms = new Map();
for (const r of calendrier) {
  for (const eq of [r.equipe_domicile, r.equipe_exterieur]) {
    if (eq && eq.toLowerCase().includes('hyer')) noms.set(eq, (noms.get(eq) || 0) + 1);
  }
}
console.log('Noms trouvés dans calendrier_officiel (N1, 2026-2027) contenant "hyer" :');
for (const [nom, count] of noms) console.log(`  "${nom}" : ${count} occurrence(s)`);

const { data: joueur, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, matchs_joues')
  .eq('id', '8cc1b685-2303-4c77-9b4b-9381d5f7bba1')
  .single();
if (errJ) console.error('Erreur joueur :', errJ.message);
else console.log(`\nEsteban Hari — club en base : "${joueur.club}"`);

const { data: mj, error: errMJ } = await supabase
  .from('matchs_joueur')
  .select('id, date_match, adversaire, calendrier_officiel_id')
  .eq('joueur_id', '8cc1b685-2303-4c77-9b4b-9381d5f7bba1');
if (errMJ) console.error('Erreur matchs_joueur :', errMJ.message);
else { console.log(`\nmatchs_joueur actuels (${mj.length}) :`); for (const m of mj) console.log(`  ${m.date_match} vs ${m.adversaire} (calendrier_officiel_id=${m.calendrier_officiel_id})`); }
