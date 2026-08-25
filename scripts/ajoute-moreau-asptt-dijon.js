// Ajoute la fiche d'Alexis Moreau (ASPTT Dijon), confirmé homonyme distinct
// du joueur déjà en base sous club="Cestas SAG" (id=015511b8-ac78-472c-
// -b25e-10d57ab58361) — aucune icône de prêt sur la capture, confirmé par
// l'utilisateur.
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
  prenom: 'Alexis',
  nom: 'Moreau',
  email: 'alexis.moreau.asptt-dijon.manuel@scoute.footlight.fr',
  poste: 'defenseur_central',
  niveau: 'N2',
  club: 'Asptt Dijon 1',
  saison: '2026-2027',
  date_naissance: '2001-12-29',
  matchs_joues: 0,
  buts: 0,
  badge: 'declaratif',
  profil_public: false,
};

console.log(`${JOUEUR.prenom} ${JOUEUR.nom} : à créer (${JOUEUR.poste}, ${JOUEUR.club}, né(e) ${JOUEUR.date_naissance}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([JOUEUR]);
  if (insErr) { console.log(`Erreur écriture : ${insErr.message}`); process.exit(1); }
  console.log('Créé.');
} else {
  console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}
