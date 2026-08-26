// Ajoute l'effectif complet d'Olympique Marseille 2 (N2 groupe G, saison
// 2026-2027), demandé par l'utilisateur (capture d'écran source :
// "EFFECTIF OLYMPIQUE DE MARSEILLE B", 32 joueurs). Club = "Olympique
// Marseille 2" (nom officiel exact confirmé dans calendrier_officiel via
// diagnostic-om-b-n2.js, pas "OM B") pour un rapprochement calendrier
// immédiat, comme pour Kamil Bensoula et Ruben Rosa.
//
// Vérification homonyme (diagnostic-om-b-n2.js) : aucun des 32 noms de
// famille ne correspond à un joueur existant au club "Olympique Marseille
// 2" — les correspondances substring trouvées sont toutes des clubs
// différents, aucun homonyme réel.
//
// N'insère PAS de stats depuis la capture (aucune stat visible d'ailleurs,
// simple effectif) : fiches créées à zéro, stats reprises ensuite depuis
// lequipe.fr comme pour les autres joueurs.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Olympique Marseille 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

const JOUEURS = [
  { prenom: 'Ibrahim', nom: 'Gomis', poste: 'gardien', naissance: '2005-03-20', nationalite: 'France' },
  { prenom: 'Théo', nom: 'Vermot', poste: 'gardien', naissance: '1997-01-27', nationalite: 'France' },
  { prenom: 'Jelle', nom: 'Van Neck', poste: 'gardien', naissance: '2004-03-07', nationalite: 'Belgique' },
  { prenom: 'Yassine', nom: 'Badaoui', poste: 'gardien', naissance: '2008-02-24', nationalite: 'France' },
  { prenom: 'Cheick', nom: 'Diarra', poste: 'gardien', naissance: '2007-07-15', nationalite: 'France' },
  { prenom: 'Hilan', nom: 'Hamzaoui Slimani', poste: 'defenseur_central', naissance: '2006-02-15', nationalite: 'France' },
  { prenom: 'Pladi', nom: 'N\'Zinga Pambani', poste: 'defenseur_central', naissance: '2007-03-17', nationalite: 'France' },
  { prenom: 'Paolo', nom: 'Trigano', poste: 'defenseur_central', naissance: '2006-01-04', nationalite: 'France' },
  { prenom: 'Rayan', nom: 'Ouro Bang Na', poste: 'defenseur_central', naissance: '2007-03-18', nationalite: 'France' },
  { prenom: 'Fodé', nom: 'Camara', poste: 'defenseur_central', naissance: '2007-06-16', nationalite: 'France' },
  { prenom: 'Sacha', nom: 'Lung', poste: 'defenseur_central', naissance: '2008-05-10', nationalite: 'France' },
  { prenom: 'Mohamed', nom: 'Baradji', poste: 'defenseur_central', naissance: '2008-05-13', nationalite: 'France' },
  { prenom: 'Alexi', nom: 'Koum', poste: 'lateral_gauche', naissance: '2006-02-05', nationalite: 'France' },
  { prenom: 'Felix', nom: 'Bienck', poste: 'lateral_gauche', naissance: '2007-05-26', nationalite: 'France' },
  { prenom: 'Anis', nom: 'Doubal', poste: 'lateral_gauche', naissance: '2006-10-29', nationalite: 'France' },
  { prenom: 'Mathis', nom: 'Clément', poste: 'lateral_droit', naissance: '2006-01-23', nationalite: 'France' },
  { prenom: 'Kelyann', nom: 'Bezahaf', poste: 'lateral_droit', naissance: '2006-05-16', nationalite: 'France' },
  { prenom: 'Soumaïla', nom: 'Traoré', poste: 'milieu_defensif', naissance: '2004-07-29', nationalite: 'Mali' },
  { prenom: 'Nouhoum', nom: 'Kamissoko', poste: 'milieu_defensif', naissance: '2004-12-27', nationalite: 'Mali' },
  { prenom: 'Yanis', nom: 'Sellami', poste: 'milieu_defensif', naissance: '2007-01-04', nationalite: 'France' },
  { prenom: 'Alexandre', nom: 'Issanga', poste: 'milieu_central', naissance: '2007-01-25', nationalite: 'France' },
  { prenom: 'Max', nom: 'Corbon', poste: 'milieu_central', naissance: '2007-02-13', nationalite: 'France' },
  { prenom: 'Adam', nom: 'El Boughlamy', poste: 'milieu_central', naissance: '2008-01-30', nationalite: 'France' },
  { prenom: 'Victor', nom: 'Joseph', poste: 'milieu_offensif', naissance: '2006-04-10', nationalite: 'France' },
  { prenom: 'Kyle', nom: 'Magaud', poste: 'milieu_offensif', naissance: '2007-02-10', nationalite: 'France' },
  { prenom: 'Milan', nom: 'Leccese', poste: 'milieu_offensif', naissance: '2008-11-30', nationalite: 'France' },
  { prenom: 'Jephthe', nom: 'Malanda', poste: 'milieu_offensif', naissance: '2008-05-08', nationalite: 'France' },
  { prenom: 'Ange', nom: 'Lago', poste: 'attaquant', naissance: '2004-12-27', nationalite: 'Côte d\'Ivoire' },
  { prenom: 'Ugo', nom: 'Kadmiri', poste: 'attaquant', naissance: '2007-06-25', nationalite: 'Maroc' },
  { prenom: 'Sofiane', nom: 'Sidi Ali', poste: 'attaquant', naissance: '1995-07-14', nationalite: 'France' },
  { prenom: 'Jah-Mason', nom: 'Telusson', poste: 'attaquant', naissance: '2008-05-20', nationalite: 'France' },
  { prenom: 'Antoine', nom: 'Valero', poste: 'attaquant', naissance: '2008-07-08', nationalite: 'France' },
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.omb.manuel@scoute.footlight.fr`;
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
