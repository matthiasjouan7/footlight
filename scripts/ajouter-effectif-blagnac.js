// Ajoute les joueurs manquants de l'effectif Blagnac FC (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr,
// profil non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu droit"/"Milieu gauche" (absents de l'enum poste de l'app)
// mappés sur ailier_droit/ailier_gauche, les postes larges les plus
// proches disponibles.
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base, comme le fait le formulaire manuel.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Blagnac FC';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF BLAGNAC FC", 26/27).
const EFFECTIF = [
  { prenom: 'Foued', nom: 'Baba Alla', poste: 'gardien', naissance: '1985-09-23' },
  { prenom: 'Ilam', nom: 'Djailane', poste: 'gardien', naissance: '2003-08-29' },
  { prenom: 'Noa', nom: 'Stefaniak', poste: 'gardien', naissance: '2006-05-05' },
  { prenom: 'Ibrahima', nom: 'Sow', poste: 'defenseur_central', naissance: '1983-01-21' },
  { prenom: 'Raymeric', nom: 'Sonny', poste: 'defenseur_central', naissance: '2002-01-08' },
  { prenom: 'Vincent', nom: 'Gauthier', poste: 'defenseur_central', naissance: '1999-11-13' },
  { prenom: 'Axel', nom: 'Burlet', poste: 'defenseur_central', naissance: '2006-01-04' },
  { prenom: 'Nassim', nom: 'Lamliki', poste: 'lateral_gauche', naissance: '2003-04-07' },
  { prenom: 'Rémi', nom: 'Roldan', poste: 'lateral_droit', naissance: '1998-02-26' },
  { prenom: 'Sammy', nom: 'Abbani', poste: 'lateral_droit', naissance: '1998-01-30' },
  { prenom: 'Dorian', nom: 'Santisteva', poste: 'milieu_defensif', naissance: '1992-01-30' },
  { prenom: 'Tom', nom: 'Husson', poste: 'milieu_defensif', naissance: '1999-06-15' },
  { prenom: 'Nicolas', nom: 'Bories', poste: 'milieu_defensif', naissance: '1993-11-25' },
  { prenom: 'Dany', nom: 'Florentine', poste: 'milieu_central', naissance: '2002-02-12' },
  { prenom: 'Iliesse', nom: 'Lamhaf', poste: 'milieu_central', naissance: '1991-01-14' },
  { prenom: 'Clément', nom: 'Boudjema', poste: 'milieu_central', naissance: '1996-12-26' },
  { prenom: 'Nabil', nom: 'Belkaious', poste: 'ailier_droit', naissance: '1993-06-06' },
  { prenom: 'Yannis', nom: 'Tairi', poste: 'ailier_gauche', naissance: '1995-06-19' },
  { prenom: 'Thibaut', nom: 'Métayer', poste: 'ailier_gauche', naissance: '1994-01-17' },
  { prenom: 'Yannis', nom: 'Wilibona', poste: 'milieu_offensif', naissance: '2003-12-02' },
  { prenom: 'Marouane', nom: 'Eddaraaoui', poste: 'ailier_gauche', naissance: '1994-05-27' },
  { prenom: 'Dimitri', nom: 'Quenet', poste: 'attaquant', naissance: '1989-06-27' },
  { prenom: 'Kaddour', nom: 'Zalmate', poste: 'attaquant', naissance: '1986-06-03' },
  { prenom: 'Paul', nom: 'Bonneau', poste: 'attaquant', naissance: '2001-06-06' },
  { prenom: 'Abdoulaye', nom: 'Sackho', poste: 'attaquant', naissance: '1996-03-09' },
  { prenom: 'Evan', nom: 'Noël', poste: 'attaquant', naissance: '2004-06-10' },
  { prenom: 'Jalal', nom: 'Amri', poste: 'attaquant', naissance: '2001-03-01' },
  { prenom: 'Tyron', nom: 'With', poste: 'attaquant', naissance: '2003-05-10' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = (joueurs || []).find(
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
