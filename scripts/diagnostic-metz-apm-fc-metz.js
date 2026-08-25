// Diagnostic lecture seule : avant de corriger l'ambiguïté "Metz Apm Fc 1"
// ⟷ "Fc Metz 2" (N2, 2026-2027, 26/26 matchs chacun), on vérifie s'il
// s'agit bien d'un doublon (même club, lignes orphelines à fusionner) ou
// de deux clubs réels distincts dont les noms se ressemblent trop pour
// l'algorithme clubWordsMatch (comme le cas confirmé "Dijon Fco 2" /
// "Asptt Dijon 1"). On compare les adversaires et les dates des deux
// séries de matchs : des adversaires très différents indiqueraient deux
// clubs distincts ; des adversaires identiques/quasi identiques
// indiqueraient un doublon.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOMS = ['Metz Apm Fc 1', 'Fc Metz 2'];

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, division, saison, created_at')
  .eq('division', 'N2')
  .eq('saison', '2026-2027')
  .or(NOMS.map((n) => `equipe_domicile.eq.${n},equipe_exterieur.eq.${n}`).join(','));
if (error) { console.error('Erreur :', error.message); process.exit(1); }

for (const nom of NOMS) {
  const lignes = calendrier
    .filter((r) => r.equipe_domicile === nom || r.equipe_exterieur === nom)
    .sort((a, b) => new Date(a.date_match) - new Date(b.date_match));
  console.log(`\n=== "${nom}" : ${lignes.length} match(s) ===`);
  for (const l of lignes) {
    const adversaire = l.equipe_domicile === nom ? l.equipe_exterieur : l.equipe_domicile;
    const lieu = l.equipe_domicile === nom ? '(D)' : '(E)';
    console.log(`  id=${l.id} | ${l.date_match} | vs ${adversaire} ${lieu} | créé ${l.created_at}`);
  }
}

// Vérifie aussi les joueurs actuellement rattachés à chaque nom de club en base
const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .in('club', NOMS)
  .eq('saison', '2026-2027');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
for (const nom of NOMS) {
  const liste = joueurs.filter((j) => j.club === nom);
  console.log(`\n"${nom}" : ${liste.length} joueur(s) en base.`);
  for (const j of liste.slice(0, 5)) console.log(`  ${j.prenom} ${j.nom} (niveau=${j.niveau})`);
}
