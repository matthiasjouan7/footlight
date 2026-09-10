// Nettoyage ciblé : sync-lequipe-to-calendrier.js (cron quotidien, écriture
// réelle) a créé 32 lignes calendrier_officiel N2 dupliquées avec un nom de
// club abrégé façon lequipe.fr (ex: "Caen B" dupliquant "Sm Caen 2"),
// faute d'un rapprochement suffisamment tolérant — corrigé dans ce même
// commit (clubsCorrespondent() : mots génériques élargis + tolérance de
// préfixe, voir sync-lequipe-to-calendrier.js). Ce nettoyage traite les 32
// lignes DÉJÀ créées (id 3100-3465), confirmées par
// diagnostic-n2-matchs-joues-3-sur-2-journees.js : contrairement au type de
// doublon déjà traité par corrige-doublons-calendrier-toutes-divisions.js
// (lignes "legacy" entièrement en MAJUSCULES), ces doublons ont un nom en
// casse normale et n'ont jamais reçu de matchs_joueur avec stats (0/0) —
// leur seul effet de bord constaté est de faire compter un match une 3e
// fois dans "équipes à N matchs" si un autre calcul se base sur le nombre
// de lignes calendrier_officiel par club plutôt que sur matchs_joueur.
//
// Repère, pour chaque groupe N2, les paires de lignes calendrier_officiel
// à la même date (±3 jours) et mêmes 2 clubs (rapprochement approximatif),
// vérifie qu'AUCUNE des deux lignes de la paire n'a de matchs_joueur avec
// minutes_jouees renseigné côté doublon (cas attendu et le seul traité
// automatiquement ici — un doublon qui aurait malgré tout des stats est
// laissé de côté par sécurité, à traiter manuellement), rattache si besoin
// les lignes matchs_joueur vides du doublon à l'original avant de le
// supprimer (au cas où un joueur aurait été lié par erreur au doublon),
// puis supprime la ligne calendrier_officiel du doublon.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

function normaliserMot(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'ta', 'ea', 'oc', 'af', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', '2', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des', 'saint', 'st', 'sainte', 'ste']);
function motsClub(s) {
  const mots = normaliserMot(s).split(' ').filter((w) => w.length > 1 && !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliserMot(s).split(' ').filter(Boolean);
}
function clubsProchesOuIdentiques(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return small.every((w) => big.some((w2) => w2 === w || (w.length >= 4 && w2.length >= 4 && (w2.startsWith(w) || w.startsWith(w2)))));
}

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N2').order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }

const parGroupe = new Map();
for (const r of cal) {
  if (!parGroupe.has(r.groupe)) parGroupe.set(r.groupe, []);
  parGroupe.get(r.groupe).push(r);
}

const TOLERANCE_JOURS = 3;
function joursEcart(a, b) { return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000); }

const paires = [];
for (const [groupe, lignes] of parGroupe) {
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i], b = lignes[j];
      if (joursEcart(a.date_match, b.date_match) > TOLERANCE_JOURS) continue;
      if (clubsProchesOuIdentiques(a.equipe_domicile, b.equipe_domicile) && clubsProchesOuIdentiques(a.equipe_exterieur, b.equipe_exterieur)) {
        paires.push({ groupe, a, b });
      }
    }
  }
}
console.log(`${paires.length} paire(s) de lignes calendrier_officiel N2 probablement dupliquées.\n`);

let totalDoublonsSupprimes = 0, totalIgnorees = 0, totalMjRattachees = 0;
for (const { groupe, a, b } of paires) {
  const { data: mjA } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', a.id);
  const { data: mjB } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', b.id);
  const avecMinutesA = (mjA || []).filter((m) => m.minutes_jouees != null).length;
  const avecMinutesB = (mjB || []).filter((m) => m.minutes_jouees != null).length;

  // Le doublon (créé par sync-lequipe-to-calendrier.js par simple insertion,
  // jamais rattaché à aucun joueur) est celui des deux SANS aucune minute
  // renseignée. Si les DEUX en sont dépourvus (journée pas encore
  // synchronisée par les autres pipelines — cas constaté sur 10 des 32
  // paires : l'original a alors plusieurs dizaines de lignes matchs_joueur
  // pré-générées mais aucune minute, pas encore l'original étant vide de
  // minutes), on retombe sur le nombre TOTAL de lignes matchs_joueur : le
  // doublon n'en a jamais aucune (aucun script de génération de calendrier
  // n'a jamais tourné dessus), l'original en a toujours plusieurs dizaines
  // (une par joueur des deux clubs, pré-générée dès l'ajout à l'effectif).
  // Ne reste ambigu par sécurité que si les deux ont des minutes, ou si les
  // deux ont 0 minute ET 0 ligne au total (aucun signal pour départager).
  let original, doublon;
  if (avecMinutesA > 0 && avecMinutesB === 0) { original = a; doublon = b; }
  else if (avecMinutesB > 0 && avecMinutesA === 0) { original = b; doublon = a; }
  else if (avecMinutesA === 0 && avecMinutesB === 0 && (mjA || []).length > 0 && (mjB || []).length === 0) { original = a; doublon = b; }
  else if (avecMinutesA === 0 && avecMinutesB === 0 && (mjB || []).length > 0 && (mjA || []).length === 0) { original = b; doublon = a; }
  else {
    console.log(`Groupe ${groupe} — id=${a.id} (${avecMinutesA}/${(mjA || []).length}) <-> id=${b.id} (${avecMinutesB}/${(mjB || []).length}) : ambigu, ignoré par sécurité.`);
    totalIgnorees++;
    continue;
  }
  const mjDoublon = doublon === a ? mjA : mjB;

  console.log(`Groupe ${groupe} — original id=${original.id} "${original.equipe_domicile}" vs "${original.equipe_exterieur}" (${original.date_match}) <-> doublon id=${doublon.id} "${doublon.equipe_domicile}" vs "${doublon.equipe_exterieur}" (${doublon.date_match}, ${(mjDoublon || []).length} ligne(s) matchs_joueur vide(s))`);

  // Rattache d'abord toute ligne matchs_joueur du doublon (normalement
  // aucune, mais un joueur ajouté après coup pourrait avoir généré son
  // calendrier sur le doublon) vers l'original, sans écraser une ligne déjà
  // existante pour ce joueur côté original.
  for (const m of mjDoublon || []) {
    const dejaCotéOriginal = (original === a ? mjA : mjB).some((mo) => mo.joueur_id === m.joueur_id);
    if (dejaCotéOriginal) {
      console.log(`  joueur_id=${m.joueur_id} : déjà une ligne côté original, ${DRY_RUN ? 'à supprimer' : 'suppression'} du doublon matchs_joueur id=${m.id}`);
      if (!DRY_RUN) {
        const { error } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
        if (error) console.log(`    Erreur : ${error.message}`);
      }
    } else {
      console.log(`  joueur_id=${m.joueur_id} : ${DRY_RUN ? 'à rattacher' : 'rattachement'} vers calendrier_officiel_id=${original.id}`);
      totalMjRattachees++;
      if (!DRY_RUN) {
        const { error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: original.id }).eq('id', m.id);
        if (error) console.log(`    Erreur : ${error.message}`);
      }
    }
  }

  console.log(`  ${DRY_RUN ? 'À supprimer' : 'Suppression'} : calendrier_officiel id=${doublon.id}`);
  totalDoublonsSupprimes++;
  if (!DRY_RUN) {
    const { data, error } = await supabase.from('calendrier_officiel').delete().eq('id', doublon.id).select('id');
    if (error) console.log(`    Erreur : ${error.message}`);
    else if (!data || !data.length) console.log(`    ATTENTION : suppression sans effet pour id=${doublon.id}`);
  }
  console.log('');
}

console.log(`\n========== Résumé ==========`);
console.log(`${totalDoublonsSupprimes} ligne(s) calendrier_officiel doublon ${DRY_RUN ? 'à supprimer' : 'supprimée(s)'}, ${totalMjRattachees} ligne(s) matchs_joueur ${DRY_RUN ? 'à rattacher' : 'rattachée(s)'}, ${totalIgnorees} paire(s) ambiguë(s) ignorée(s) par sécurité.`);
if (DRY_RUN) console.log('DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
