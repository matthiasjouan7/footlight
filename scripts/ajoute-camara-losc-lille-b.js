// Ajoute la fiche d'Ismaël Camara (LOSC Lille 2, National 2, saison
// 2026-2027), ignoré à tort par l'anti-doublon par nom d'ajouter-effectif-
// losc-lille-b.js : un homonyme existe déjà en base (id=5b411ff7-0542-49ca-
// 9d96-84db188c518a, club="Stade Poitevin FC") mais l'utilisateur a
// confirmé qu'il s'agit d'une personne différente (pas d'icône de prêt sur
// sa ligne dans la capture d'écran source, contrairement aux 3 autres
// joueurs prêtés de l'effectif). Reproduit le chemin "ajout manuel/scouté"
// de footlight-recherche.html.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const j = { prenom: 'Ismaël', nom: 'Camara', poste: 'ailier_gauche', naissance: '2008-07-10' };
const CLUB = 'LOSC Lille 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

// Suffixe l'email pour éviter toute collision avec l'homonyme existant
// (ismaelcamara.manuel@... est probablement déjà pris par l'autre fiche).
const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.losclille.manuel@scoute.footlight.fr`;
console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance}, email=${email}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([{
    prenom: j.prenom, nom: j.nom, email,
    poste: j.poste,
    niveau: NIVEAU, club: CLUB, saison: SAISON,
    date_naissance: j.naissance,
    matchs_joues: 0,
    buts: 0,
    badge: 'declaratif',
    profil_public: false,
  }]);
  if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  else console.log('  Créé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
