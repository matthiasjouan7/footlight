// Ajoute les joueurs manquants de l'effectif Red Star FC B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Red Star Fc 2" (orthographe attendue de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-red-star-b.js — l'un des
// clubs du groupe D sans effectif enregistré, identifié via
// diagnostic-effectifs-manquants-n2.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
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

const CLUB = 'Red Star Fc 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF RED STAR FC B", 26/27).
const EFFECTIF = [
  { prenom: 'Bocar', nom: 'Sy', poste: 'gardien', naissance: '2007-08-09' },
  { prenom: 'Yanis', nom: 'Zirmi', poste: 'gardien', naissance: '2006-07-16' },
  { prenom: 'Ciprian', nom: 'Pop', poste: 'gardien', naissance: '2005-01-21' },
  { prenom: 'Aboudramane', nom: 'Sanogo', poste: 'defenseur_central', naissance: '2001-03-18' },
  { prenom: 'Mohamed Ali', nom: 'Lakbi', poste: 'defenseur_central', naissance: '2002-02-21' },
  { prenom: 'Hélder', nom: 'Oliveira Da Silva', poste: 'lateral_gauche', naissance: '2006-07-16' },
  { prenom: 'Sékou', nom: 'Guindo', poste: 'lateral_gauche', naissance: '2004-01-10' },
  { prenom: 'Mohafidh', nom: 'Ahamada', poste: 'lateral_droit', naissance: '2004-03-16' },
  { prenom: 'Bakari', nom: 'Diawara', poste: 'lateral_droit', naissance: '2006-06-19' },
  { prenom: 'Diadé', nom: 'Camara', poste: 'milieu_defensif', naissance: '1993-10-01' },
  { prenom: 'Cheick', nom: 'Konaté', poste: 'milieu_defensif', naissance: '2005-08-17' },
  { prenom: 'Kossingou', nom: 'Balamandji', poste: 'milieu_offensif', naissance: '1989-08-09' },
  { prenom: 'Enzo', nom: 'Legrix', poste: 'ailier_gauche', naissance: '2005-06-10' },
  { prenom: 'Tomy', nom: 'Cadet', poste: 'ailier_gauche', naissance: '2006-07-01' },
  { prenom: 'Ali', nom: 'Ouarti', poste: 'ailier_droit', naissance: '1999-07-19' },
  { prenom: 'Malik', nom: 'Diawakana', poste: 'attaquant', naissance: '2002-04-23' },
  { prenom: 'Lahbib', nom: 'Ksaimi', poste: 'attaquant', naissance: '1991-10-11' },
  { prenom: 'Lucas', nom: 'Besson', poste: 'attaquant', naissance: '2004-05-24' },
  { prenom: 'Isaac', nom: 'Gnafoua', poste: 'attaquant', naissance: '2006-11-13' },
  { prenom: 'Melvyn', nom: 'Bourillon', poste: 'attaquant', naissance: '2006-01-20' },
  { prenom: 'Marley', nom: 'Milord', poste: 'attaquant', naissance: '2004-01-13' },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || '—'}).`);
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
