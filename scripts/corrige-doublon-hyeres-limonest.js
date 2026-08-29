// Corrige spécifiquement le doublon "HYERES F.C." (32 matchs, référence
// d'origine) ⟷ "Hyères" (10 matchs, orpheline) en National 1 groupe C —
// nettoyer-ambiguites-n1.js l'a volontairement ignoré (garde-fou : compte
// de l'orpheline trop proche de la référence, comme pour un cas à 2 clubs
// réels distincts), mais ici il s'agit bien du même club : les 10 lignes
// "Hyères" ont été créées par erreur par le rattrapage calendrier de
// Limonest (rattrapage-lequipe-to-calendrier.js), qui n'a pas reconnu
// "HYERES F.C." comme déjà présent pour certaines journées (probablement
// un date_match légèrement différent de la ligne de référence d'origine).
//
// Pour chaque ligne orpheline "Hyères", trouve la ligne de référence
// "HYERES F.C." dont la date est la plus proche (±3 jours), migre les
// matchs_joueur (déplace si le joueur n'a pas déjà un matchs_joueur sur la
// référence, sinon supprime le doublon), puis supprime la ligne orpheline
// devenue vide.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N1';
const GROUPE = 'C';
const SAISON = '2026-2027';

function joursEcart(d1, d2) { return Math.abs((new Date(d1) - new Date(d2)) / 86400000); }

const { data: calendrier, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }

const lignesParId = new Map(calendrier.map((r) => [Number(r.id), r]));
const refIds = calendrier.filter((r) => r.equipe_domicile === 'HYERES F.C.' || r.equipe_exterieur === 'HYERES F.C.').map((r) => Number(r.id));
const orphIds = calendrier.filter((r) => r.equipe_domicile === 'Hyères' || r.equipe_exterieur === 'Hyères').map((r) => Number(r.id));
console.log(`${refIds.length} ligne(s) référence "HYERES F.C.", ${orphIds.length} ligne(s) orpheline "Hyères".\n`);

const correspondance = new Map();
for (const idOrph of orphIds) {
  const ligneOrph = lignesParId.get(idOrph);
  let meilleure = null, meilleurEcart = Infinity;
  for (const idRef of refIds) {
    const ecart = joursEcart(ligneOrph.date_match, lignesParId.get(idRef).date_match);
    if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleure = idRef; }
  }
  if (meilleure !== null && meilleurEcart <= 3) correspondance.set(idOrph, meilleure);
  else console.log(`  Ligne id=${idOrph} (${ligneOrph.date_match}) : aucune référence proche (±3j) trouvée — ignorée par sécurité.`);
}

const refIdsUtiles = [...new Set(correspondance.values())];
const idsUtiles = [...orphIds, ...refIdsUtiles];
const { data: matchs, error: errMj } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id').in('calendrier_officiel_id', idsUtiles);
if (errMj) { console.error('Erreur lecture matchs_joueur :', errMj.message); process.exit(1); }

const joueursParRef = new Map(refIdsUtiles.map((id) => [id, new Set(matchs.filter((m) => m.calendrier_officiel_id === id).map((m) => m.joueur_id))]));

let totalRattaches = 0, totalSupprimes = 0, totalLignesCal = 0;
for (const idOrph of orphIds) {
  const idRef = correspondance.get(idOrph);
  if (idRef === undefined) continue;
  const matchsOrph = matchs.filter((m) => m.calendrier_officiel_id === idOrph);
  const joueursRef = joueursParRef.get(idRef);
  console.log(`Ligne id=${idOrph} (${matchsOrph.length} matchs_joueur) → référence id=${idRef} (${joueursRef.size} joueur(s) déjà présents)`);
  for (const m of matchsOrph) {
    if (joueursRef.has(m.joueur_id)) {
      console.log(`  ${dryRun ? 'À supprimer' : 'Suppression'} : matchs_joueur id=${m.id} (doublon)`);
      totalSupprimes++;
      if (!dryRun) { const { error } = await supabase.from('matchs_joueur').delete().eq('id', m.id); if (error) console.log(`    Erreur : ${error.message}`); }
    } else {
      joueursRef.add(m.joueur_id);
      console.log(`  ${dryRun ? 'À rattacher' : 'Rattachement'} : matchs_joueur id=${m.id} → calendrier_officiel_id=${idRef}`);
      totalRattaches++;
      if (!dryRun) { const { error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idRef }).eq('id', m.id); if (error) console.log(`    Erreur : ${error.message}`); }
    }
  }
  console.log(`  ${dryRun ? 'À supprimer' : 'Suppression'} : ligne calendrier_officiel id=${idOrph} (devenue vide).`);
  totalLignesCal++;
  if (!dryRun) { const { error } = await supabase.from('calendrier_officiel').delete().eq('id', idOrph); if (error) console.log(`    Erreur : ${error.message}`); }
}

console.log(`\nRésumé : ${totalRattaches} rattachement(s), ${totalSupprimes} suppression(s) matchs_joueur, ${totalLignesCal} ligne(s) calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
