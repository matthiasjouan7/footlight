// Diagnostic lecture seule : compare en détail les matchs_joueur liés aux
// deux lignes calendrier_officiel candidates au doublon "Lorient B vs FC
// Chauray" (id=2759, 22/08/2026) et "Lorient B vs Chauray" (id=2789,
// 21/08/2026), pour déterminer s'il s'agit bien du même match dupliqué
// (mêmes joueurs, mêmes stats) avant toute suppression/fusion.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A = 2759; // Lorient B vs FC Chauray, 22/08/2026
const ID_B = 2789; // Lorient B vs Chauray, 21/08/2026

const { data: lignesCal, error: errCal } = await supabase
  .from('calendrier_officiel').select('*').in('id', [ID_A, ID_B]);
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); process.exit(1); }
for (const l of lignesCal) console.log(`id=${l.id} | ${l.equipe_domicile} vs ${l.equipe_exterieur} | ${l.date_match} | groupe ${l.groupe} | créé ${l.created_at}`);

const { data: matchs, error } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id, buts, minutes_jouees, note, created_at')
  .in('calendrier_officiel_id', [ID_A, ID_B]);
if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }

const joueurIds = [...new Set(matchs.map((m) => m.joueur_id))];
const { data: joueurs, error: errJ } = await supabase
  .from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
const nomJoueur = new Map(joueurs.map((j) => [j.id, `${j.prenom} ${j.nom} (club="${j.club}")`]));

const parLigne = { [ID_A]: [], [ID_B]: [] };
for (const m of matchs) parLigne[m.calendrier_officiel_id].push(m);

console.log(`\n=== Ligne ${ID_A} (${parLigne[ID_A].length} joueur(s)) ===`);
for (const m of parLigne[ID_A]) console.log(`  ${nomJoueur.get(m.joueur_id) || m.joueur_id} : buts=${m.buts}, minutes=${m.minutes_jouees}, note=${m.note}`);

console.log(`\n=== Ligne ${ID_B} (${parLigne[ID_B].length} joueur(s)) ===`);
for (const m of parLigne[ID_B]) console.log(`  ${nomJoueur.get(m.joueur_id) || m.joueur_id} : buts=${m.buts}, minutes=${m.minutes_jouees}, note=${m.note}`);

const joueursA = new Set(parLigne[ID_A].map((m) => m.joueur_id));
const joueursB = new Set(parLigne[ID_B].map((m) => m.joueur_id));
const communs = [...joueursA].filter((id) => joueursB.has(id));
console.log(`\nJoueur(s) présent(s) dans les DEUX lignes : ${communs.length}`);
for (const id of communs) console.log(`  ${nomJoueur.get(id) || id}`);
console.log(`Joueur(s) uniquement dans ligne ${ID_A} : ${joueursA.size - communs.length}`);
console.log(`Joueur(s) uniquement dans ligne ${ID_B} : ${joueursB.size - communs.length}`);
