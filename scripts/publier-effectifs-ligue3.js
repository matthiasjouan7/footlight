// Publie (profil_public: false -> true) tous les joueurs ajoutés cette
// session via les scripts ajouter-effectif-*.js (Bastia, Versailles, Caen,
// Amiens, Valenciennes, Orléans, Fleury, Villefranche, Concarneau, Paris
// 13 Atletico) : sans cette validation ils restent invisibles sur les
// pages publiques (recherche, classement, comparaison), visibles
// seulement dans footlight-admin.html.
//
// Ciblage : joueurs de ces clubs, email synthétique
// "*.manuel@scoute.footlight.fr" (signature des scripts ajouter-effectif-*),
// encore non publics.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUBS = [
  'SC Bastia',
  'FC Versailles 78',
  'SM Caen',
  'Amiens SC',
  'Valenciennes FC',
  'US Orléans',
  'FC Fleury 91',
  'FC Villefranche Beaujolais',
  'US Concarneau',
  'Paris 13 Atletico',
];

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, email, profil_public')
  .in('club', CLUBS)
  .eq('profil_public', false)
  .like('email', '%.manuel@scoute.footlight.fr');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${joueurs?.length || 0} joueur(s) à publier.\n`);
for (const j of joueurs || []) {
  console.log(`${j.prenom} ${j.nom} (${j.club})`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ profil_public: true }).eq('id', j.id);
    if (updErr) console.log(`  Erreur écriture : ${updErr.message}`);
  }
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour publier réellement.' : '\nTerminé.');
