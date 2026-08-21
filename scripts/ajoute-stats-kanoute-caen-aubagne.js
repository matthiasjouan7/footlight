// Ajoute la ligne matchs_joueur du match Caen vs Aubagne Air Bel (20 août
// 2026, 1-0) pour Diabé Kanouté, et met à jour ses stats de saison en
// conséquence : entré à la 90+3' (score encore 0-0 à ce moment), passe
// décisive à la 90+4' pour le seul but du match (F. El Khoumisti),
// victoire 1-0 — vérifié via diagnostic-foot-direct-changements.js sur
// https://www.foot-direct.com/live/3659361091034555280-caen-vs-aubagne-air-bel.
// Impact banc : à égalité à l'entrée + victoire = 3 pts (barème validé).
//
// Kanouté vient d'être créé manuellement (ajoute-diabe-kanoute.js), sans
// calendrier généré : cette ligne matchs_joueur est donc créée
// directement plutôt que via generer-calendriers-existants.js (qui
// génère tout le calendrier à venir, hors sujet ici — un seul match déjà
// joué à rattraper).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueur, error: jErr } = await supabase.from('joueurs').select('*').eq('prenom', 'Diabé').eq('nom', 'Kanouté').single();
if (jErr || !joueur) { console.error(`Erreur lecture joueur : ${jErr?.message || 'introuvable'}`); process.exit(1); }
console.log(`Joueur : ${joueur.prenom} ${joueur.nom} (id ${joueur.id}), club "${joueur.club}", saison ${joueur.saison}.`);

const { data: calRow, error: calErr } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', 'Ligue 3')
  .ilike('equipe_domicile', '%Caen%')
  .ilike('equipe_exterieur', '%Aubagne%')
  .eq('date_match', '2026-08-20')
  .maybeSingle();
if (calErr) { console.error('Erreur lecture calendrier_officiel :', calErr.message); process.exit(1); }
if (!calRow) { console.error('Match Caen vs Aubagne Air Bel du 20/08/2026 introuvable dans calendrier_officiel.'); process.exit(1); }
console.log(`Match : ${calRow.equipe_domicile} vs ${calRow.equipe_exterieur} (${calRow.date_match}), calendrier_officiel id ${calRow.id}.`);

const { count: existant } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', joueur.id).eq('calendrier_officiel_id', calRow.id);
if (existant) { console.log('Ligne matchs_joueur déjà présente pour ce match, rien à faire.'); process.exit(0); }

const LIGNE = {
  joueur_id: joueur.id,
  saison: joueur.saison || '2026-2027',
  date_match: calRow.date_match,
  adversaire: 'AUBAGNE AIR BEL',
  domicile: true,
  score_pour: 1,
  score_contre: 0,
  titulaire: false,
  minutes_jouees: 2,
  buts: 0,
  passes_decisives: 1,
  calendrier_officiel_id: calRow.id,
  competition: 'championnat',
  verifie: true,
};
console.log(`\nLigne matchs_joueur à créer : ${JSON.stringify(LIGNE)}`);

const NOUVEAU = {
  matchs_joues: (joueur.matchs_joues || 0) + 1,
  passes_decisives: (joueur.passes_decisives || 0) + 1,
  minutes_jouees: (joueur.minutes_jouees || 0) + 2,
};
console.log(`Stats saison mises à jour : ${JSON.stringify(NOUVEAU)}`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('matchs_joueur').insert([LIGNE]);
  if (insErr) { console.log(`  Erreur insertion matchs_joueur : ${insErr.message}`); process.exit(1); }
  const { error: updErr } = await supabase.from('joueurs').update(NOUVEAU).eq('id', joueur.id);
  if (updErr) console.log(`  Erreur mise à jour joueur : ${updErr.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
