// Diagnostic lecture seule : plusieurs joueurs (Nîmes, Bourges, Istres,
// Saumur, Canet) signalés avec "2 matchs" alors qu'un seul a été joué.
// Le diagnostic précédent (diagnostic-nimes-double-match.js) a confirmé
// qu'il n'y a bien qu'UNE SEULE ligne matchs_joueur par joueur pour la
// date déjà passée (pas de doublon de ligne) : le souci est donc sur la
// colonne agrégée joueurs.matchs_joues elle-même. Compare cette valeur au
// nombre réel de lignes matchs_joueur avec minutes_jouees renseigné.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function sansAccents(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const CLUBS_SIGNALES = ['nimes', 'bourges', 'istres', 'saumur', 'canet'];

const { data: candidats, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, saison, matchs_joues, buts, minutes_jouees')
  .eq('saison', '2026-2027')
  .not('club', 'is', null);
if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }

const joueurs = candidats.filter((j) => CLUBS_SIGNALES.some((c) => sansAccents(j.club).includes(c)));
console.log(`${joueurs.length} joueur(s) trouvé(s) pour les clubs signalés (sur ${candidats.length} joueurs 2026-2027).`);

let ecarts = 0;
for (const j of joueurs) {
  const { data: matchs, error: errM } = await supabase
    .from('matchs_joueur')
    .select('id, date_match, minutes_jouees, buts')
    .eq('joueur_id', j.id);
  if (errM) { console.error(`Erreur matchs pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
  const reel = matchs.filter((m) => m.minutes_jouees != null).length;
  const marque = j.matchs_joues || 0;
  const statut = marque === reel ? 'OK' : 'ECART';
  if (statut === 'ECART') ecarts++;
  console.log(`${statut} | ${j.prenom} ${j.nom} (${j.club}) : joueurs.matchs_joues=${marque} vs réel(minutes_jouees renseigné)=${reel} | joueurs.buts=${j.buts}`);
}
console.log(`\n${ecarts} écart(s) détecté(s) sur ${joueurs.length} joueur(s).`);
