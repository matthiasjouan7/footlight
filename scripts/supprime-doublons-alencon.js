// Supprime les 5 doublons créés par erreur le 2026-08-24 lors de
// l'exécution d'ajouter-effectif-alencon.js : l'effectif US Alençon 61
// était déjà entièrement en base depuis le 2026-08-11 (club="US Alençon
// 61"), mais la lecture anti-doublon (SELECT sans pagination sur la table
// joueurs, >2700 lignes, au-delà de la limite par défaut de 1000 lignes
// de PostgREST) n'a pas vu la plupart des joueurs existants. 15
// insertions ont échoué sur un doublon d'email (comportement correct,
// aucune donnée créée), mais 5 ont réussi car le slug d'email généré par
// ce script (sans tiret pour les noms composés) diffère de celui des
// fiches d'origine (avec tiret, ex: "samuel-bill.kamga.manuel@..."),
// créant de vrais doublons sous club="US Alençonnaise" à côté des fiches
// d'origine sous club="US Alençon 61" (à conserver).
//
// Ciblage par id pour éviter tout risque d'erreur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS_A_SUPPRIMER = [
  'c66396bb-9bbb-4afa-bc42-a0e1fbd0b7a6', // Karim El Hamdaoui (doublon)
  '5dc28a1e-32fc-48e4-843e-d523201d2e4a', // Samuel-Bill Kamga (doublon)
  '7534a69e-1153-4819-bf18-3df23ea51639', // Shelley Bindika Ndalla (doublon)
  'f5230a66-c741-44f1-99b2-39b1183214ef', // Hakim El Hamdaoui (doublon)
  'b1604ab3-147c-4f3d-abf9-0316e4ee198c', // Loukas Lopes Marques (doublon)
];

for (const id of IDS_A_SUPPRIMER) {
  const { data: avant, error: readErr } = await supabase
    .from('joueurs').select('id, prenom, nom, club, email, created_at').eq('id', id).single();
  if (readErr || !avant) {
    console.log(`Introuvable (id=${id}), rien à faire. ${readErr?.message || ''}`);
    continue;
  }
  console.log(`À supprimer : ${avant.prenom} ${avant.nom} (id=${avant.id}, club="${avant.club}", email=${avant.email}, créé le ${avant.created_at})`);
  if (!dryRun) {
    const { error: delErr } = await supabase.from('joueurs').delete().eq('id', id);
    if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
    else console.log('  Supprimé.');
  }
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été supprimé. Relancer avec DRY_RUN=false pour supprimer réellement.');
