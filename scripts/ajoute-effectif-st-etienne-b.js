// Ajoute l'effectif complet d'AS Saint-Étienne B (N2 groupe G, saison
// 2026-2027), demandé par l'utilisateur (capture d'écran source :
// "EFFECTIF AS SAINT-ÉTIENNE B", 16 joueurs). Club = "As St Etienne 2"
// (nom officiel exact confirmé dans calendrier_officiel via
// diagnostic-om-b-n2.js, même groupe que Olympique Marseille 2).
//
// N'insère PAS de stats depuis la capture (effectif simple, pas de stats
// affichées) : fiches créées à zéro, stats reprises ensuite depuis
// lequipe.fr.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'As St Etienne 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

const JOUEURS = [
  { prenom: 'Matéo', nom: 'Houngbo Civier', poste: 'gardien', naissance: '2007-02-06', nationalite: 'France' },
  { prenom: 'Joseph', nom: 'Derache', poste: 'gardien', naissance: '2007-08-30', nationalite: 'France' },
  { prenom: 'Jediaél', nom: 'Mbambi', poste: 'defenseur_central', naissance: '2009-06-26', nationalite: 'Belgique' },
  { prenom: 'Oussama', nom: 'Benkou', poste: 'defenseur_central', naissance: '2007-02-17', nationalite: 'France' },
  { prenom: 'Modibo', nom: 'Sissoko', poste: 'milieu_central', naissance: '2006-12-17', nationalite: 'Mali' },
  { prenom: 'Valentin', nom: 'Depalle', poste: 'milieu_central', naissance: '2007-03-09', nationalite: 'France' },
  { prenom: 'Paul', nom: 'Eymard', poste: 'milieu_central', naissance: '2008-01-05', nationalite: 'France' },
  { prenom: 'Medhy', nom: 'Lutin Zidee', poste: 'ailier_droit', naissance: '2008-04-01', nationalite: 'France' },
  { prenom: 'Noah', nom: 'Moulin', poste: 'milieu_offensif', naissance: '2008-05-13', nationalite: 'France' },
  { prenom: 'Meïvyn', nom: 'Agesilas', poste: 'attaquant', naissance: '2006-06-29', nationalite: 'France' },
  { prenom: 'Helmi', nom: 'Ben Tiba', poste: 'attaquant', naissance: '2007-01-10', nationalite: 'France' },
  { prenom: 'Issam', nom: 'Cheikh', poste: 'attaquant', naissance: '2006-11-14', nationalite: 'France' },
  { prenom: 'Lamine', nom: 'Sonko', poste: 'attaquant', naissance: '2004-01-17', nationalite: 'Mali' },
  { prenom: 'Mamadou', nom: 'Konté', poste: 'attaquant', naissance: '2007-03-26', nationalite: 'France' },
  { prenom: 'André', nom: 'Zibi', poste: 'attaquant', naissance: '2008-04-06', nationalite: 'Portugal' },
  { prenom: 'Lucas', nom: 'Reynaud', poste: 'attaquant', naissance: '2008-10-08', nationalite: 'France' },
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.asseb.manuel@scoute.footlight.fr`;
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
