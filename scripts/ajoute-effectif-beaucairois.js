// Ajoute l'effectif complet de Stade Beaucairois 30 (N2, saison
// 2026-2027), demandé par l'utilisateur (capture d'écran source :
// "EFFECTIF STADE BEAUCAIROIS 30", 24 joueurs). Club absent de
// calendrier_officiel pour l'instant (diagnostic-beaucairois-groupe.js :
// aucune ligne "beaucair" dans aucune division/groupe) — L'Équipe n'a pas
// encore publié son calendrier. Utilise le nom d'usage "Stade Beaucairois
// 30" tel qu'affiché ; le calendrier se générera automatiquement une fois
// la synchro quotidienne lequipe.fr -> calendrier_officiel l'aura repéré.
//
// N'insère PAS de stats depuis la capture (effectif simple) : fiches
// créées à zéro.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Stade Beaucairois 30';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

const JOUEURS = [
  { prenom: 'Naby-Moussa', nom: 'Yattara', poste: 'gardien', naissance: '1984-01-12', nationalite: 'Mali' },
  { prenom: 'Loan', nom: 'Hernandez', poste: 'gardien', naissance: '2004-09-01', nationalite: 'France' },
  { prenom: 'Idrissa', nom: 'Souaré', poste: 'defenseur_central', naissance: '2004-11-03', nationalite: 'France' },
  { prenom: 'Mohamed', nom: 'Kalil Traoré', poste: 'defenseur_central', naissance: '2000-07-09', nationalite: 'Mali' },
  { prenom: 'Max', nom: 'Bonalair', poste: 'defenseur_central', naissance: '2004-07-26', nationalite: 'France' },
  { prenom: 'Marcandi', nom: 'Matondo', poste: 'defenseur_central', naissance: '2005-10-02', nationalite: 'France' },
  { prenom: 'Thibault', nom: 'Tamas', poste: 'lateral_gauche', naissance: '2001-02-20', nationalite: 'France' },
  { prenom: 'Toni', nom: 'Convertini', poste: 'lateral_gauche', naissance: '2007-07-06', nationalite: 'France' },
  { prenom: 'Matéo', nom: 'Baury', poste: 'lateral_droit', naissance: '2002-01-03', nationalite: 'France' },
  { prenom: 'Khalid', nom: 'El Gourari', poste: 'lateral_droit', naissance: '2007-11-10', nationalite: 'France' },
  { prenom: 'Wilfried', nom: 'Kouakou', poste: 'milieu_defensif', naissance: '2000-05-08', nationalite: 'France' },
  { prenom: 'Ayoub', nom: 'Khadraoui', poste: 'milieu_central', naissance: '2001-03-28', nationalite: 'France' },
  { prenom: 'Ryad', nom: 'Haidar Bacar', poste: 'milieu_defensif', naissance: '2004-01-23', nationalite: 'France' },
  { prenom: 'Cheikh', nom: 'Sadibou Dia', poste: 'milieu_defensif', naissance: '1999-12-27', nationalite: 'Sénégal' },
  { prenom: 'Alpha', nom: 'Diallo', poste: 'ailier_gauche', naissance: '2001-02-10', nationalite: 'Sénégal' },
  { prenom: 'Slimane', nom: 'Alaoui', poste: 'milieu_offensif', naissance: '2004-04-19', nationalite: 'France' },
  { prenom: 'Aboubaker', nom: 'Boughazi', poste: 'ailier_droit', naissance: '2001-06-25', nationalite: 'France' },
  { prenom: 'Elhadj', nom: 'Bah', poste: 'attaquant', naissance: '2001-08-22', nationalite: 'Mali' },
  { prenom: 'Redouane', nom: 'Zerdoum', poste: 'attaquant', naissance: '1999-01-01', nationalite: 'Algérie' },
  { prenom: 'Kamel', nom: 'Ferraz', poste: 'attaquant', naissance: '1994-09-06', nationalite: 'Algérie' },
  { prenom: 'Ahmedine', nom: 'Daoudi', poste: 'attaquant', naissance: '2001-01-08', nationalite: 'France' },
  { prenom: 'Noa', nom: 'Tshiakayembe', poste: 'attaquant', naissance: '2006-06-22', nationalite: 'France' },
  { prenom: 'Matisse', nom: 'Kapitza', poste: 'attaquant', naissance: '2006-10-07', nationalite: 'France' },
  { prenom: 'Madior', nom: 'Tall', poste: 'attaquant', naissance: '2000-03-12', nationalite: 'Sénégal' },
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.sb30.manuel@scoute.footlight.fr`;
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
