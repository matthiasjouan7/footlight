// Diagnostic lecture seule : l'utilisateur signale que le profil du joueur
// "Haribou" (FC Chauray) affiche 2 fois "Chauray" et que les stats ne sont
// pas à jour. Recherche le joueur, liste ses matchs_joueur, et vérifie s'il
// existe deux lignes calendrier_officiel distinctes contre Lorient/FC
// LORIENT 2 (le renommage Lorient B → FC LORIENT 2 a pu recréer un doublon
// si "FC LORIENT 2" avait déjà sa propre ligne contre Chauray dans son
// calendrier complet à 30 matchs).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .or('prenom.ilike.%haribou%,nom.ilike.%haribou%');
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`Joueur(s) correspondant à "haribou" : ${joueurs?.length || 0}`);
for (const j of joueurs || []) console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}", niveau=${j.niveau}, saison=${j.saison})`);

for (const j of joueurs || []) {
  const { data: matchs, error } = await supabase
    .from('matchs_joueur')
    .select('id, calendrier_officiel_id, saison, date_match, adversaire, domicile, verifie')
    .eq('joueur_id', j.id)
    .order('date_match', { ascending: true });
  if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
  console.log(`\n=== Matchs de ${j.prenom} ${j.nom} (${matchs.length}) ===`);
  for (const m of matchs) console.log(`  cal_id=${m.calendrier_officiel_id} | ${m.date_match} | vs ${m.adversaire} | domicile=${m.domicile} | saison=${m.saison}`);
}

const { data: calLorientVsChauray, error: errCal2 } = await supabase
  .from('calendrier_officiel')
  .select('*')
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .eq('groupe', 'B');
if (errCal2) { console.error('Erreur lecture calendrier_officiel :', errCal2.message); process.exit(1); }
const lignesConcernees = (calLorientVsChauray || []).filter((l) =>
  (l.equipe_domicile || '').toLowerCase().includes('chauray') || (l.equipe_exterieur || '').toLowerCase().includes('chauray')
).filter((l) =>
  (l.equipe_domicile || '').toLowerCase().includes('lorient') || (l.equipe_exterieur || '').toLowerCase().includes('lorient')
);
console.log(`\nLigne(s) calendrier_officiel "Lorient" vs "Chauray" (N1, groupe B, 2026-2027) : ${lignesConcernees.length}`);
for (const l of lignesConcernees) console.log(`  id=${l.id} | ${l.equipe_domicile} vs ${l.equipe_exterieur} | ${l.date_match} | créé ${l.created_at}`);
