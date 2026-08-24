// Ajoute une fiche distincte pour Cheick Konaté (Red Star FC B, National 2)
// — homonyme confirmé par l'utilisateur de la fiche existante
// (id=ad1bf445-2e80-4a04-b8c9-5e53b7fe7fb5, club="Voltigeurs Chateaubriant"),
// pas un prêt. Email suffixé pour éviter la collision avec le slug par
// défaut de l'homonyme (même pattern que Ismaël Camara / LOSC Lille 2).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR = {
  prenom: 'Cheick', nom: 'Konaté', poste: 'milieu_defensif', naissance: '2005-08-17',
  club: 'Red Star Fc 2', email: 'cheick.konate.redstar.manuel@scoute.footlight.fr',
};

console.log(`${JOUEUR.prenom} ${JOUEUR.nom} : à créer (${JOUEUR.poste}, ${JOUEUR.club}, né(e) ${JOUEUR.naissance}, email=${JOUEUR.email}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([{
    prenom: JOUEUR.prenom, nom: JOUEUR.nom, email: JOUEUR.email,
    poste: JOUEUR.poste,
    niveau: 'N2', club: JOUEUR.club, saison: '2026-2027',
    date_naissance: JOUEUR.naissance,
    matchs_joues: 0,
    buts: 0,
    badge: 'declaratif',
    profil_public: false,
  }]);
  if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  else console.log('  Créé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
