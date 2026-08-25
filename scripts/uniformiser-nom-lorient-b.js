// Uniformise le nom de club "Lorient B" vers l'orthographe utilisée par le
// calendrier complet N1 2026-2027 groupe B : "FC LORIENT 2" (30 matchs).
// Résout l'ambiguïté qui empêche generer-calendriers-existants.js de
// générer le calendrier des 19 joueurs au club "FC Lorient B" (leur club
// en base, table joueurs, INCHANGÉ par ce script).
//
// Ne touche QUE calendrier_officiel.equipe_domicile / equipe_exterieur.
// Avant de renommer, vérifie pour chaque ligne "Lorient B" restante s'il
// existe déjà une ligne "FC LORIENT 2" au même match (même date, même
// adversaire) — auquel cas le renommage créerait un nouveau doublon : la
// ligne concernée est alors listée pour revue manuelle plutôt que renommée
// aveuglément.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ANCIEN_NOM = 'Lorient B';
const NOUVEAU_NOM = 'FC LORIENT 2';

const { data: lignesLorientB, error } = await supabase
  .from('calendrier_officiel')
  .select('*')
  .or(`equipe_domicile.eq.${ANCIEN_NOM},equipe_exterieur.eq.${ANCIEN_NOM}`);
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }
console.log(`Ligne(s) "${ANCIEN_NOM}" (exact) : ${lignesLorientB.length}`);

const { data: toutesLignes, error: errTous } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
  .or(`equipe_domicile.eq.${NOUVEAU_NOM},equipe_exterieur.eq.${NOUVEAU_NOM}`);
if (errTous) { console.error('Erreur lecture calendrier_officiel :', errTous.message); process.exit(1); }

let renommees = 0, ignorees = 0;
for (const ligne of lignesLorientB) {
  const adversaire = ligne.equipe_domicile === ANCIEN_NOM ? ligne.equipe_exterieur : ligne.equipe_domicile;
  const conflitPotentiel = toutesLignes.find((l) =>
    l.id !== ligne.id &&
    l.date_match === ligne.date_match &&
    l.division === ligne.division &&
    l.saison === ligne.saison &&
    (l.equipe_domicile === adversaire || l.equipe_exterieur === adversaire)
  );
  if (conflitPotentiel) {
    console.log(`Ignoré (conflit potentiel avec id=${conflitPotentiel.id} même date/adversaire) : id=${ligne.id} "${ligne.equipe_domicile}" vs "${ligne.equipe_exterieur}" (${ligne.date_match})`);
    ignorees++;
    continue;
  }
  const patch = {};
  if (ligne.equipe_domicile === ANCIEN_NOM) patch.equipe_domicile = NOUVEAU_NOM;
  if (ligne.equipe_exterieur === ANCIEN_NOM) patch.equipe_exterieur = NOUVEAU_NOM;
  console.log(`${dryRun ? 'À renommer' : 'Renommage'} : id=${ligne.id} "${ligne.equipe_domicile}" vs "${ligne.equipe_exterieur}" (${ligne.date_match}, ${ligne.saison}) → ${JSON.stringify(patch)}`);
  renommees++;
  if (!dryRun) {
    const { error: updErr } = await supabase.from('calendrier_officiel').update(patch).eq('id', ligne.id);
    if (updErr) console.log(`  Erreur renommage : ${updErr.message}`);
  }
}

console.log(`\nRésumé : ${renommees} ligne(s) ${dryRun ? 'à renommer' : 'renommée(s)'}, ${ignorees} ignorée(s) (conflit potentiel, revue manuelle).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
