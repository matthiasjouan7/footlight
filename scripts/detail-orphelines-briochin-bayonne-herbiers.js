// Diagnostic lecture seule : détaille les lignes calendrier_officiel aux
// noms raccourcis "Saint-Brieuc", "Bayonne", "Les Herbiers" (N1,
// 2026-2027) qui créent l'ambiguïté avec les noms complets officiels
// ("Stade Briochin", "Aviron Bayonnais FC", "LES HERBIERS VF"). Pour
// chacune, vérifie s'il existe déjà une ligne au nom complet à une date
// proche (± 2 jours) contre un adversaire similaire — auquel cas un
// renommage créerait un doublon (comme observé avec Lorient B / Chauray).
// Vérifie aussi les matchs_joueur déjà liés à ces lignes orphelines.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const PAIRES = [
  { orpheline: 'Saint-Brieuc', complet: 'Stade Briochin' },
  { orpheline: 'Bayonne', complet: 'Aviron Bayonnais FC' },
  { orpheline: 'Les Herbiers', complet: 'LES HERBIERS VF' },
];

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('id, date_match, equipe_domicile, equipe_exterieur, division, groupe, saison, created_at')
  .eq('saison', '2026-2027')
  .eq('division', 'N1');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

function joursEcart(d1, d2) {
  return Math.abs((new Date(d1) - new Date(d2)) / 86400000);
}

for (const { orpheline, complet } of PAIRES) {
  console.log(`\n=== ${orpheline} → ${complet} ===`);
  const lignesOrph = calendrier.filter((r) => r.equipe_domicile === orpheline || r.equipe_exterieur === orpheline);
  const lignesComplet = calendrier.filter((r) => r.equipe_domicile === complet || r.equipe_exterieur === complet);
  console.log(`  Ligne(s) "${orpheline}" (exact) : ${lignesOrph.length}`);
  console.log(`  Ligne(s) "${complet}" (exact) : ${lignesComplet.length}`);

  for (const lo of lignesOrph) {
    const adversaire = lo.equipe_domicile === orpheline ? lo.equipe_exterieur : lo.equipe_domicile;
    const conflit = lignesComplet.find((lc) => joursEcart(lc.date_match, lo.date_match) <= 2);
    console.log(`  id=${lo.id} | ${lo.equipe_domicile} vs ${lo.equipe_exterieur} | ${lo.date_match} | créé ${lo.created_at}${conflit ? ` — CONFLIT POTENTIEL avec id=${conflit.id} (${conflit.equipe_domicile} vs ${conflit.equipe_exterieur}, ${conflit.date_match})` : ' — pas de conflit détecté (±2j)'}`);
  }

  const idsOrph = lignesOrph.map((l) => l.id);
  if (idsOrph.length) {
    const { data: liens, error: errLiens } = await supabase
      .from('matchs_joueur')
      .select('id, calendrier_officiel_id')
      .in('calendrier_officiel_id', idsOrph);
    if (errLiens) { console.error('Erreur lecture matchs_joueur :', errLiens.message); process.exit(1); }
    console.log(`  matchs_joueur lié(s) aux lignes orphelines : ${liens?.length || 0}`);
  }
}
