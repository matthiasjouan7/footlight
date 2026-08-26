// Diagnostic lecture seule avant l'ajout de l'effectif Olympique de
// Marseille B (N2 groupe G, saison 2026-2027) demandé par l'utilisateur :
// 1. Cherche le nom officiel exact du club réserve dans calendrier_officiel
//    (probablement "OM 2" ou similaire, comme "FC LORIENT 2" pour les
//    équipes réserve — suffixe numérique, pas "B").
// 2. Vérifie les homonymes pour chacun des 32 noms de famille de l'effectif
//    avant toute création.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, groupe')
  .eq('saison', '2026-2027')
  .eq('division', 'N2')
  .eq('groupe', 'G');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const clubs = [...new Set(officiel.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]))].sort();
console.log(`Clubs N2 groupe G (saison 2026-2027) :\n${clubs.map((c) => `  ${c}`).join('\n')}`);

const NOMS = ['Gomis', 'Vermot', 'Van Neck', 'Badaoui', 'Diarra', 'Hamzaoui Slimani', 'N\'Zinga Pambani', 'Trigano', 'Ouro Bang Na', 'Camara', 'Lung', 'Baradji', 'Koum', 'Bienck', 'Doubal', 'Clément', 'Bezahaf', 'Traoré', 'Kamissoko', 'Sellami', 'Issanga', 'Corbon', 'El Boughlamy', 'Joseph', 'Magaud', 'Leccese', 'Malanda', 'Lago', 'Kadmiri', 'Sidi Ali', 'Telusson', 'Valero'];

console.log('\nHomonymes existants :');
for (const nom of NOMS) {
  const motsRecherche = nom.split(' ')[0]; // premier mot du nom de famille, suffisant pour ilike
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${motsRecherche}%`);
  if (error) { console.log(`  ${nom} : erreur ${error.message}`); continue; }
  if (data.length) {
    console.log(`  ${nom} :`);
    for (const j of data) console.log(`    ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
  }
}
