// Diagnostic lecture seule : résout les 2 cas ignorés par sécurité dans
// corrige-et-genere-calendrier-lot-niveau-toutes-divisions.js.
// - "Ben Soilihi Aboubacar" (US Chauvigny) : 0 correspondance exacte
//   prenom="Ben Soilihi" nom="Aboubacar" -> vérifie comment son nom est
//   réellement découpé en base.
// - "Stany Epagna" (Vendée Fontenay Foot) : 2 correspondances exactes ->
//   vérifie s'il s'agit d'un doublon ou de deux personnes distinctes
//   (clubs/niveaux différents).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Recherche "Aboubacar" (US Chauvigny) ===');
const { data: aboubacar, error: errA } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('saison', '2026-2027').ilike('nom', '%aboubacar%');
if (errA) { console.error('Erreur :', errA.message); process.exit(1); }
for (const j of aboubacar) console.log(`  id=${j.id} — "${j.prenom}" / "${j.nom}" — club="${j.club}" niveau="${j.niveau}"`);
if (!aboubacar.length) {
  console.log('  Aucun résultat sur "aboubacar" — recherche élargie sur "soilihi" :');
  const { data: soilihi, error: errS } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('saison', '2026-2027').ilike('prenom', '%soilihi%');
  if (errS) { console.error('Erreur :', errS.message); process.exit(1); }
  for (const j of soilihi) console.log(`  id=${j.id} — "${j.prenom}" / "${j.nom}" — club="${j.club}" niveau="${j.niveau}"`);
}

console.log('\n=== Recherche "Stany Epagna" ===');
const { data: epagna, error: errE } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison, date_naissance, matchs_joues').eq('saison', '2026-2027').eq('prenom', 'Stany').eq('nom', 'Epagna');
if (errE) { console.error('Erreur :', errE.message); process.exit(1); }
for (const j of epagna) console.log(`  id=${j.id} — club="${j.club}" niveau="${j.niveau}" naissance="${j.date_naissance}" matchs_joues=${j.matchs_joues}`);
