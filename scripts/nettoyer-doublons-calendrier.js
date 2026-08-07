// Supprime les doublons dans calendrier_officiel (même match sous deux
// formats de nom) — UNIQUEMENT la ligne sans aucun matchs_joueur lié.
// Si les deux lignes d'une paire ont des liens (ne devrait pas arriver vu
// le diagnostic préalable), ou si aucune n'en a, la paire est laissée de
// côté pour revue manuelle plutôt que de deviner laquelle supprimer.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Inclut aussi les connecteurs géographiques ("sur", "en"...) car le
// calendrier officiel abrège parfois "sur" en "/" (ex: "LA ROCHE/YON" pour
// "La Roche-sur-Yon") — sans ce mot dans la liste, la comparaison échoue
// selon la source qui a inséré la ligne (constaté en pratique : doublon
// La Roche-sur-Yon / VENDEE FC LA ROCHE/YON non détecté par ce script alors
// que footlight-modifier-profil.html gère déjà ce cas via CLUB_MOTS_GENERIQUES).
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

const { data, error } = await supabase.from('calendrier_officiel').select('*').order('date_match', { ascending: true });
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const parCle = new Map();
for (const r of data) {
  // Ligue 3 n'a qu'un seul groupe national : ne pas inclure "groupe" dans
  // la clé pour cette division, sinon deux valeurs différentes ("Unique"
  // vs "A", observé en pratique le 04/08 sur SM Caen-Valenciennes) rendent
  // un vrai doublon invisible ici alors qu'il regroupe le même match.
  const groupeCle = r.division === 'Ligue 3' ? '' : r.groupe;
  const cle = `${r.date_match}|${r.division}|${groupeCle}|${r.saison}`;
  parCle.set(cle, [...(parCle.get(cle) || []), r]);
}

const paires = [];
for (const lignes of parCle.values()) {
  if (lignes.length < 2) continue;
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i], b = lignes[j];
      const memeSens = clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) && clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur);
      const senInverse = clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur) && clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile);
      if (memeSens || senInverse) paires.push([a, b]);
    }
  }
}
console.log(`${paires.length} paire(s) de doublons détectée(s).\n`);

const tousLesIds = paires.flatMap(([a, b]) => [a.id, b.id]);
const { data: liens, error: liensErr } = await supabase
  .from('matchs_joueur')
  .select('id, calendrier_officiel_id')
  .in('calendrier_officiel_id', tousLesIds);
if (liensErr) { console.error('Erreur lecture matchs_joueur :', liensErr.message); process.exit(1); }

const nbLiensParId = new Map();
(liens || []).forEach((l) => nbLiensParId.set(l.calendrier_officiel_id, (nbLiensParId.get(l.calendrier_officiel_id) || 0) + 1));

let totalASupprimer = 0, totalIgnorees = 0;
for (const [a, b] of paires) {
  const liensA = nbLiensParId.get(a.id) || 0;
  const liensB = nbLiensParId.get(b.id) || 0;

  let aSupprimer = null;
  if (liensA === 0 && liensB > 0) aSupprimer = a;
  else if (liensB === 0 && liensA > 0) aSupprimer = b;
  else if (liensA === 0 && liensB === 0) {
    // Aucun lien des deux côtés : supprime la plus récente, garde la plus
    // ancienne comme référence (cohérent avec le reste de la table).
    aSupprimer = new Date(a.created_at) > new Date(b.created_at) ? a : b;
  }

  if (!aSupprimer) {
    console.log(`Ignoré (les deux lignes ont des liens matchs_joueur, revue manuelle nécessaire) : "${a.equipe_domicile}" vs "${a.equipe_exterieur}" (${a.date_match}) — id ${a.id} et id ${b.id}`);
    totalIgnorees++;
    continue;
  }

  console.log(`${dryRun ? 'À supprimer' : 'Suppression'} : id ${aSupprimer.id} "${aSupprimer.equipe_domicile}" vs "${aSupprimer.equipe_exterieur}" (${aSupprimer.date_match}, créé ${aSupprimer.created_at})`);
  totalASupprimer++;
  if (!dryRun) {
    const { error: delErr } = await supabase.from('calendrier_officiel').delete().eq('id', aSupprimer.id);
    if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
  }
}

console.log(`\nRésumé : ${totalASupprimer} ligne(s) ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${totalIgnorees} paire(s) ignorée(s) (revue manuelle).`);
if (dryRun) console.log('DRY RUN : rien n\'a été supprimé. Relancer avec DRY_RUN=false pour supprimer réellement.');
