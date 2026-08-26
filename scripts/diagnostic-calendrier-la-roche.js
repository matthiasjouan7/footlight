// Diagnostic lecture seule : combien de lignes calendrier_officiel existent
// pour VFC La Roche-sur-Yon (Ligue 3, saison 2026-2027) ? Le rattrapage
// calendrier n'a proposé qu'1 seul match à insérer pour Kamil Bensoula
// (nouvelle inscription) — vérifie si c'est cohérent avec le nombre réel
// de matchs déjà connus en base pour ce club, ou si le calendrier officiel
// Ligue 3 est encore incomplet pour ce club à ce stade de la saison.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, saison, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', '2026-2027')
  .eq('division', 'Ligue 3')
  .or('equipe_domicile.ilike.%roche%,equipe_exterieur.ilike.%roche%')
  .order('journee', { ascending: true });
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} ligne(s) calendrier_officiel pour un club "roche" en Ligue 3, saison 2026-2027 :`);
for (const r of data) console.log(`  id=${r.id} journee=${r.journee} ${r.date_match} : ${r.equipe_domicile} vs ${r.equipe_exterieur}`);

// Vérifie aussi les matchs_joueur déjà existants pour Kamil Bensoula.
const { data: bensoula, error: errB } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .eq('nom', 'Bensoula')
  .eq('prenom', 'Kamil')
  .single();
if (errB) { console.error('Erreur Bensoula :', errB.message); process.exit(1); }
console.log(`\nKamil Bensoula : id=${bensoula.id}`);
const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('id, saison, date_match, calendrier_officiel_id, domicile, score_pour, score_contre, buts, passes_decisives, minutes_jouees')
  .eq('joueur_id', bensoula.id);
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
console.log(`${mj.length} ligne(s) matchs_joueur pour Kamil Bensoula :`);
for (const m of mj) console.log(`  ${JSON.stringify(m)}`);
