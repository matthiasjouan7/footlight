// Ajoute Diabé Kanouté (milieu central, SM Caen, Ligue 3, saison
// 2026-2027) — signalé décisif hier par l'utilisateur, absent de la
// base (vérifié via check-joueur.js). Fiche fournie par capture d'écran
// (profil "SM Caen B", National 2 Grp C) : ajouté directement au niveau
// Ligue 3 puisque c'est là qu'il a été décisif.
//
// Même chemin que les scripts d'ajout d'effectif précédents (Bastia,
// Versailles, Caen, Amiens, etc.) : email synthétique
// @scoute.footlight.fr, profil non public, badge déclaratif.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR = { prenom: 'Diabé', nom: 'Kanouté', poste: 'milieu_central', naissance: '2007-12-24' };
const CLUB = 'SM Caen';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

// Pagination manuelle : au-delà de 1000 lignes, PostgREST tronque
// silencieusement la réponse par défaut.
const joueurs = [];
for (let page = 0; ; page++) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').range(page * 1000, page * 1000 + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  joueurs.push(...(data || []));
  if (!data || data.length < 1000) break;
}
console.log(`${joueurs.length} joueur(s) en base.\n`);

const existant = joueurs.find(
  (x) => normaliser(x.prenom) === normaliser(JOUEUR.prenom) && normaliser(x.nom) === normaliser(JOUEUR.nom)
);
if (existant) {
  console.log(`${JOUEUR.prenom} ${JOUEUR.nom} : déjà en base (id=${existant.id}, club="${existant.club || '—'}"), rien à faire.`);
  process.exit(0);
}

const email = `${slugifier(JOUEUR.prenom)}.${slugifier(JOUEUR.nom)}.manuel@scoute.footlight.fr`;
console.log(`${JOUEUR.prenom} ${JOUEUR.nom} : à créer (${JOUEUR.poste}, ${CLUB}, ${NIVEAU}, né(e) ${JOUEUR.naissance}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([{
    prenom: JOUEUR.prenom, nom: JOUEUR.nom, email,
    poste: JOUEUR.poste,
    niveau: NIVEAU, club: CLUB, saison: SAISON,
    date_naissance: JOUEUR.naissance,
    nationalite: 'France',
    matchs_joues: 0,
    buts: 0,
    badge: 'declaratif',
    profil_public: false,
  }]);
  if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
