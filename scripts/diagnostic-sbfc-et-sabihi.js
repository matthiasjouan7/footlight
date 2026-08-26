// Diagnostic lecture seule combiné :
// 1) Cherche "sbfc" dans calendrier_officiel (nom d'usage confirmé par le
//    PDF FFF "N2 / Fff Poule G" fourni par l'utilisateur pour Stade
//    Beaucairois 30) afin de savoir si le calendrier existe déjà sous ce
//    nom (jamais testé jusqu'ici, seul "beaucair" avait été cherché).
// 2) Vérifie l'existant pour Nassim Sabihi (signalé par l'utilisateur en
//    N1 alors qu'il devrait être en Ligue 3, club "FC Villefranch...").
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Recherche "sbfc" dans calendrier_officiel (saison 2026-2027) ===');
const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, groupe')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%sbfc%,equipe_exterieur.ilike.%sbfc%');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const vus = new Set();
for (const r of officiel) {
  const nom = [r.equipe_domicile, r.equipe_exterieur].find((n) => /sbfc/i.test(n));
  const cle = `${nom}|${r.division}|${r.groupe}`;
  if (vus.has(cle)) continue;
  vus.add(cle);
  console.log(`  "${nom}" — division=${r.division} groupe=${r.groupe}`);
}
console.log(`  Total lignes trouvées : ${officiel.length}`);
if (!officiel.length) console.log('  Aucune ligne "sbfc" trouvée dans calendrier_officiel.');

console.log('\n=== Recherche Nassim Sabihi ===');
const { data: sabihi, error: errS } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('nom', '%sabihi%');
if (errS) { console.error('Erreur joueurs :', errS.message); process.exit(1); }
for (const j of sabihi) {
  console.log(`  ${j.prenom} ${j.nom} — id=${j.id} club="${j.club}" niveau="${j.niveau}" saison="${j.saison}" matchs=${j.matchs_joues}`);
}
if (!sabihi.length) console.log('  Aucun Sabihi trouvé.');

console.log('\n=== Clubs "Villefranche" présents dans calendrier_officiel (Ligue 3, saison 2026-2027) ===');
const { data: villefranche, error: errV } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, groupe')
  .eq('saison', '2026-2027')
  .eq('division', 'Ligue 3')
  .or('equipe_domicile.ilike.%villefranche%,equipe_exterieur.ilike.%villefranche%');
if (errV) { console.error('Erreur clubs Villefranche :', errV.message); process.exit(1); }
const vusV = new Set();
for (const r of villefranche) {
  const nom = [r.equipe_domicile, r.equipe_exterieur].find((n) => /villefranche/i.test(n));
  if (vusV.has(nom)) continue;
  vusV.add(nom);
  console.log(`  "${nom}"`);
}
if (!villefranche.length) console.log('  Aucun club "Villefranche" en Ligue 3.');
