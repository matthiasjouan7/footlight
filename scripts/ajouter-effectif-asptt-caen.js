// Ajoute les joueurs manquants de l'effectif ASPTT Caen (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// club = "AS PTT Caen" (avec espace, pas "ASPTT Caen") : calendrier_officiel
// stocke "As Ptt Caen 1" (vérifié via diagnostic-club-asptt-caen.js), soit
// les mots {ptt, caen} une fois le mot générique "as" et le numéro final
// retirés. "ASPTT Caen" en un seul mot donnerait {asptt, caen} — "asptt"
// n'étant pas reconnu comme le mot générique "as" par clubWordsMatch
// (generer-calendriers-existants.js), le rapprochement échouerait. En
// séparant "AS" de "PTT", "as" est bien retiré comme mot générique et les
// mots restants {ptt, caen} correspondent exactement.
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2700 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'AS PTT Caen';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF ASPTT CAEN", 26/27).
const EFFECTIF = [
  { prenom: 'Lorry', nom: 'Levionnois', poste: 'gardien', naissance: '1992-08-16' },
  { prenom: 'Amadou', nom: 'Diop', poste: 'gardien', naissance: '2004-07-29' },
  { prenom: 'Léo', nom: 'Hamel', poste: 'defenseur_central', naissance: '1992-08-29' },
  { prenom: 'Maxandre', nom: 'Gosset', poste: 'defenseur_central', naissance: '2003-03-04' },
  { prenom: 'Ibrahima', nom: 'Camara', poste: 'defenseur_central', naissance: '1997-06-06' },
  { prenom: 'Nesta', nom: 'Djeagbo', poste: 'defenseur_central', naissance: '1997-03-03' },
  { prenom: 'Noah', nom: 'Chapalain', poste: 'defenseur_central', naissance: '2005-09-21' },
  { prenom: 'Paul', nom: 'Gervais', poste: 'lateral_gauche', naissance: '2002-02-07' },
  { prenom: 'Thibault', nom: 'Le Masson', poste: 'lateral_gauche', naissance: '1992-05-21' },
  { prenom: 'Kévin', nom: 'Quénéa', poste: 'lateral_droit', naissance: '2002-03-25' },
  { prenom: 'Evan', nom: 'Olivier', poste: 'milieu_central', naissance: '2001-01-07' },
  { prenom: 'Mouhamed', nom: 'Fall', poste: 'milieu_central', naissance: '2003-01-23' },
  { prenom: 'Nazim', nom: 'Hebaz', poste: 'milieu_defensif', naissance: '2006-10-21' },
  { prenom: 'Sami', nom: 'Laabiss', poste: 'milieu_offensif', naissance: '2004-09-13' },
  { prenom: 'Sofiane', nom: 'Naïli', poste: 'milieu_offensif', naissance: '1999-08-28' },
  { prenom: 'Naël', nom: 'Anouari', poste: 'ailier_gauche', naissance: '2003-02-05' },
  { prenom: 'Nicolas', nom: 'Camillo', poste: 'ailier_gauche', naissance: '1997-01-29' },
  { prenom: 'Romain', nom: 'Hopquin', poste: 'ailier_gauche', naissance: '1999-09-13' },
  { prenom: 'Antoine', nom: 'Liard', poste: 'attaquant', naissance: '1998-05-14' },
  { prenom: 'Esteban', nom: 'Hurel-Biaou', poste: 'attaquant', naissance: '2005-01-30' },
  { prenom: 'Jawed', nom: 'Masrour', poste: 'attaquant', naissance: '2005-02-09' },
  { prenom: 'Diaz', nom: 'Bokuma', poste: 'attaquant', naissance: '2002-09-07' },
  { prenom: 'Léo', nom: 'Richard', poste: 'attaquant', naissance: '2005-08-04' },
  { prenom: 'Luka', nom: 'Chichua', poste: 'attaquant', naissance: '2003-10-01' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const joueurs = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase
    .from('joueurs').select('id, prenom, nom, club').range(offset, offset + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  joueurs.push(...(data || []));
  if (!data || data.length < 1000) break;
}
console.log(`${joueurs.length} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = joueurs.find(
    (x) => normaliser(x.prenom) === normaliser(j.prenom) && normaliser(x.nom) === normaliser(j.nom)
  );
  if (existant) {
    console.log(`${j.prenom} ${j.nom} : déjà en base (id=${existant.id}, club="${existant.club || '—'}"), ignoré.`);
    ignores++;
    continue;
  }
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.manuel@scoute.footlight.fr`;
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance}).`);
  aInserer++;
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
  }
}
console.log(`\nRésumé : ${aInserer} joueur(s) à créer, ${ignores} déjà en base (ignoré(s)).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
