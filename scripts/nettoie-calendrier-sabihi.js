// Correctif ciblé pour Nassim Sabihi, confirmé par l'utilisateur : son
// calendrier contient des matchs de son ANCIEN club (30 lignes aux ids
// 242-473, absentes des 35 lignes réelles "villefranche" identifiées par
// diagnostic-doublons-villefranche.js — confirmé par diagnostic-ids-
// suspects-sabihi.js resté bloqué en file d'attente Actions, mais
// l'utilisateur a confirmé directement l'hypothèse). Supprime ces lignes
// obsolètes puis complète avec les vraies lignes Villefranche manquantes
// (même mécanisme que le rattrapage calendrier standard).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SABIHI_ID = 'e50df0c5-f81f-4e76-9f4c-efea8d94002d';
const SAISON = '2026-2027';
// Ids calendrier_officiel confirmés réels pour "villefranche" (issus de
// diagnostic-doublons-villefranche.js, saison 2026-2027, toutes divisions).
const IDS_VILLEFRANCHE_REELS = [1939,1954,1955,3040,1972,1979,1990,1998,2008,2010,2026,2032,2044,2051,2062,2071,2072,2089,2093,2107,2111,2125,2131,2143,2144,2161,2170,2179,2187,2197,2206,2214,2224,2232,2242];

const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, domicile, calendrier_officiel_id').eq('joueur_id', SABIHI_ID);
if (errE) { console.error('Erreur lecture matchs_joueur :', errE.message); process.exit(1); }
console.log(`${existants.length} matchs_joueur existant(s) pour Sabihi.`);

const aSupprimer = existants.filter((m) => !IDS_VILLEFRANCHE_REELS.includes(m.calendrier_officiel_id));
console.log(`\n=== Lignes à supprimer (club différent, non-Villefranche) : ${aSupprimer.length} ===`);
for (const m of aSupprimer) console.log(`  id=${m.id} — ${m.date_match} — vs ${m.adversaire} (${m.domicile ? 'domicile' : 'exterieur'}) — calendrier_officiel_id=${m.calendrier_officiel_id}`);

if (!dryRun && aSupprimer.length) {
  const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer.map((m) => m.id));
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log(`  ${aSupprimer.length} ligne(s) supprimée(s).`);
}

// Complète avec les vraies lignes Villefranche manquantes.
console.log('\n=== Complément calendrier Villefranche réel ===');
const { data: officiel, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').in('id', IDS_VILLEFRANCHE_REELS);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }

const { data: restants, error: errR } = await supabase.from('matchs_joueur').select('calendrier_officiel_id').eq('joueur_id', SABIHI_ID);
if (errR) { console.error('Erreur relecture :', errR.message); process.exit(1); }
const idsRestants = new Set((dryRun ? existants.filter((m) => IDS_VILLEFRANCHE_REELS.includes(m.calendrier_officiel_id)) : restants).map((m) => m.calendrier_officiel_id));

const aInserer = officiel.filter((row) => !idsRestants.has(row.id)).map((row) => {
  const domicile = /villefranche/i.test(row.equipe_domicile);
  return {
    joueur_id: SABIHI_ID, saison: SAISON, date_match: row.date_match,
    adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
    competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
  };
});
console.log(`${aInserer.length} ligne(s) Villefranche manquante(s) à insérer.`);
for (const m of aInserer) console.log(`  ${m.date_match} — vs ${m.adversaire} (${m.domicile ? 'domicile' : 'exterieur'}) — calendrier_officiel_id=${m.calendrier_officiel_id}`);

if (!dryRun && aInserer.length) {
  const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log(`  ${aInserer.length} ligne(s) insérée(s).`);
}

console.log(`\nRésumé : ${aSupprimer.length} ligne(s) obsolète(s) ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${aInserer.length} ligne(s) manquante(s) ${dryRun ? 'à insérer' : 'insérée(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
