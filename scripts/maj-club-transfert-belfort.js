// Met à jour le club d'Alexandre Vincent, transféré à l'ASM Belfort
// (National 2, saison 2026-2027) — confirmé par l'utilisateur. Cible
// exclusivement par id (jamais par nom) pour éviter tout homonyme.
//
// id=f454ffa3-cdb7-404e-b4e3-eec1945f12fb, club actuel="Les Herbiers VF",
// détecté via ajouter-effectif-belfort.js (anti-doublon paginé).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID = 'f454ffa3-cdb7-404e-b4e3-eec1945f12fb';
const NOUVEAU_CLUB = 'Belfortaine Asm Fc 1';

const { data: joueur, error: errLecture } = await supabase
  .from('joueurs').select('id, prenom, nom, club').eq('id', ID).single();
if (errLecture) { console.error('Erreur lecture joueur :', errLecture.message); process.exit(1); }
console.log(`${joueur.prenom} ${joueur.nom} : club actuel "${joueur.club}" → "${NOUVEAU_CLUB}"`);

if (!dryRun) {
  const { error: errMaj } = await supabase
    .from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
  if (errMaj) { console.error('Erreur écriture :', errMaj.message); process.exit(1); }
  console.log('Mis à jour.');
} else {
  console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}
