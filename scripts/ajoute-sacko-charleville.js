// Ajoute la fiche de Mamadou Sacko (Olympique Charleville Prix Ardenne
// Mét., National 2, saison 2026-2027) — homonyme confirmé par l'utilisateur
// d'un joueur déjà en base sous un autre club (id=f4686a4c-2a28-4e5e-8546-
// 5b43db0afeb8, club="Les Herbiers VF"). Email suffixé pour éviter toute
// collision avec l'anti-doublon des autres scripts (recherche par nom).
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
  prenom: 'Mamadou', nom: 'Sacko',
  email: 'mamadou.sacko.charleville.manuel@scoute.footlight.fr',
  poste: 'defenseur_central',
  niveau: 'N2', club: 'Charleville Prix Oam 1', saison: '2026-2027',
  date_naissance: '1996-07-21',
  matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: false,
};

console.log(`${JOUEUR.prenom} ${JOUEUR.nom} : à créer (${JOUEUR.poste}, ${JOUEUR.club}, né(e) ${JOUEUR.date_naissance}).`);
if (!dryRun) {
  const { error } = await supabase.from('joueurs').insert([JOUEUR]);
  if (error) { console.error('Erreur écriture :', error.message); process.exit(1); }
  console.log('Créé.');
} else {
  console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}
