// Ajoute l'effectif complet de Montpellier HSC B (N2 groupe G, saison
// 2026-2027), demandé par l'utilisateur (capture d'écran source :
// "EFFECTIF MONTPELLIER HSC B", 25 joueurs). Club = "Montpellier Hsc 2"
// (nom officiel exact confirmé dans calendrier_officiel, même groupe que
// Olympique Marseille 2 et As St Etienne 2).
//
// N'insère PAS de stats depuis la capture (effectif simple) : fiches
// créées à zéro, stats reprises ensuite depuis lequipe.fr.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Montpellier Hsc 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

const JOUEURS = [
  { prenom: 'Antéo', nom: 'Benedetto', poste: 'gardien', naissance: '2007-06-12', nationalite: 'France' },
  { prenom: 'Ulrich', nom: 'Nya', poste: 'gardien', naissance: '2008-03-27', nationalite: 'Sénégal' },
  { prenom: 'Leny', nom: 'Lamore', poste: 'defenseur_central', naissance: '2008-07-09', nationalite: 'France' },
  { prenom: 'Angelo', nom: 'Tognarelli', poste: 'defenseur_central', naissance: '2008-03-26', nationalite: 'France' },
  { prenom: 'Tidiane', nom: 'Diallo', poste: 'defenseur_central', naissance: '2008-01-25', nationalite: 'Suisse' },
  { prenom: 'Marouan', nom: 'Lahmidini', poste: 'defenseur_central', naissance: '2006-04-28', nationalite: 'France' },
  { prenom: 'Djomoh', nom: 'Koné', poste: 'defenseur_central', naissance: '2007-01-10', nationalite: 'Côte d\'Ivoire' },
  { prenom: 'Waness', nom: 'El Ghazza', poste: 'defenseur_central', naissance: '2009-02-19', nationalite: 'France' },
  { prenom: 'Alexandre', nom: 'Ebener', poste: 'lateral_gauche', naissance: '2006-02-14', nationalite: 'France' },
  { prenom: 'Mamadou', nom: 'Bamba Sarr', poste: 'lateral_gauche', naissance: '2006-01-13', nationalite: 'Sénégal' },
  { prenom: 'Mathis', nom: 'Chambon', poste: 'lateral_droit', naissance: '2009-01-18', nationalite: 'France' },
  { prenom: 'Yvan', nom: 'Djemba Mbappé', poste: 'milieu_defensif', naissance: '2005-04-14', nationalite: 'Sénégal' },
  { prenom: 'Yassin', nom: 'El Azzouzi', poste: 'milieu_central', naissance: '2008-08-07', nationalite: 'France' },
  { prenom: 'Hichem', nom: 'Abderrebi', poste: 'milieu_central', naissance: '2008-05-06', nationalite: 'France' },
  { prenom: 'Kabissan', nom: 'Gomis', poste: 'milieu_central', naissance: '2006-07-31', nationalite: 'Sénégal' },
  { prenom: 'Lucas', nom: 'Da Silva', poste: 'milieu_central', naissance: '2006-05-28', nationalite: 'France' },
  { prenom: 'Noah', nom: 'Vidal-Cartoux', poste: 'milieu_offensif', naissance: '2008-03-27', nationalite: 'France' },
  { prenom: 'Pierre', nom: 'Épée Ngando', poste: 'milieu_offensif', naissance: '2007-01-08', nationalite: 'Portugal' },
  { prenom: 'Liamine', nom: 'Raho-Moussa', poste: 'milieu_offensif', naissance: '2008-05-28', nationalite: 'France' },
  { prenom: 'Yannick', nom: 'Sidibé', poste: 'ailier_gauche', naissance: '2006-12-19', nationalite: 'France' },
  { prenom: 'Fayssal', nom: 'El Mahboub', poste: 'ailier_droit', naissance: '2007-07-22', nationalite: 'France' },
  { prenom: 'Massaoly', nom: 'Diarra', poste: 'attaquant', naissance: '2007-09-22', nationalite: 'France' },
  { prenom: 'Lenny', nom: 'Savin', poste: 'attaquant', naissance: '2008-06-17', nationalite: 'France' },
  { prenom: 'Mathias', nom: 'Abdou', poste: 'attaquant', naissance: '2009-08-12', nationalite: 'France' },
  { prenom: 'Yanis', nom: 'Bekkouche', poste: 'attaquant', naissance: '2008-09-13', nationalite: 'France' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

console.log(`${JOUEURS.length} joueur(s) à créer pour ${CLUB} (${NIVEAU}, saison ${SAISON}).\n`);
let nbCrees = 0;
for (const j of JOUEURS) {
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.mhscb.manuel@scoute.footlight.fr`;
  console.log(`${j.prenom} ${j.nom} (${j.poste}, né(e) ${j.naissance}, ${j.nationalite})`);
  if (!dryRun) {
    const { error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste,
      niveau: NIVEAU, club: CLUB, saison: SAISON,
      date_naissance: j.naissance,
      nationalite: j.nationalite,
      matchs_joues: 0,
      buts: 0,
      badge: 'declaratif',
      profil_public: true,
    }]);
    if (insErr) { console.log(`  Erreur écriture : ${insErr.message}`); continue; }
  }
  nbCrees++;
}

console.log(`\nRésumé : ${nbCrees} joueur(s) ${dryRun ? 'à créer' : 'créé(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
