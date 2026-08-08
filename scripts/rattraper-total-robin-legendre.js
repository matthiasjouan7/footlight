// Rattrape le total de saison de Robin Legendre : sa fiche de match du
// 21/05/2027 (2 buts, 90 minutes, titulaire) a été enregistrée avant le
// correctif qui répercute automatiquement une fiche sur le total de saison
// (voir footlight-modifier-profil.html, appliquerDeltaSaison). On applique
// ici manuellement la contribution manquante de cette unique fiche remplie
// (les 33 autres sont encore vides).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);
const JOUEUR_ID = '47f7c806-70f0-44a7-bc85-de686abacca0';

const { data: j, error: jErr } = await supabase.from('joueurs').select('*').eq('id', JOUEUR_ID).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }
console.log(`Joueur : ${j.prenom} ${j.nom}`);
console.log(`Avant : matchs_joues=${j.matchs_joues} titularisations=${j.titularisations} buts=${j.buts} minutes_jouees=${j.minutes_jouees}`);

const delta = {
  matchs_joues: (j.matchs_joues || 0) + 1,
  titularisations: (j.titularisations || 0) + 1,
  buts: (j.buts || 0) + 2,
  minutes_jouees: (j.minutes_jouees || 0) + 90,
};
console.log(`Après (proposé) : matchs_joues=${delta.matchs_joues} titularisations=${delta.titularisations} buts=${delta.buts} minutes_jouees=${delta.minutes_jouees}`);

if (!dryRun) {
  const { error: updErr } = await supabase.from('joueurs').update(delta).eq('id', JOUEUR_ID);
  if (updErr) { console.error('Erreur mise à jour :', updErr.message); process.exit(1); }
  console.log('Terminé.');
} else {
  console.log('DRY RUN : rien n\'a été modifié. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
