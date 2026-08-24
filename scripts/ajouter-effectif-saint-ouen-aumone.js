// Ajoute les joueurs manquants de l'effectif AS Saint-Ouen-l'Aumône
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "St Ouen L'Aumone As" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-saint-ouen-aumone.js — l'un
// des clubs du groupe D sans effectif enregistré, identifié via
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

const CLUB = "St Ouen L'Aumone As";
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS SAINT-OUEN-L'AUMÔNE", 26/27).
const EFFECTIF = [
  { prenom: 'Ryan', nom: 'Bouallak', poste: 'gardien', naissance: '1999-08-19' },
  { prenom: 'Adrien', nom: 'Moncet', poste: 'gardien', naissance: '2004-02-22' },
  { prenom: 'Clément', nom: 'Brocherieux', poste: 'gardien', naissance: '2007-12-01' },
  { prenom: 'Gaoussou', nom: 'Ballo', poste: 'defenseur_central', naissance: '2001-07-12' },
  { prenom: '', nom: 'Bangou', poste: 'defenseur_central', naissance: '1999-02-16' },
  { prenom: 'Yanis', nom: 'Laban', poste: 'defenseur_central', naissance: '2000-10-13' },
  { prenom: 'Julian', nom: 'Loungoundji', poste: 'defenseur_central', naissance: '2007-01-28' },
  { prenom: 'Ryan', nom: 'Omolade', poste: 'defenseur_central', naissance: '2003-08-10' },
  { prenom: 'Mady', nom: 'Yatabaré', poste: 'defenseur_central', naissance: '2003-11-14' },
  { prenom: 'Aness', nom: 'Touhami', poste: 'lateral_gauche', naissance: '2002-11-23' },
  { prenom: 'Benoît', nom: 'Onambélé', poste: 'lateral_gauche', naissance: '2005-08-24' },
  { prenom: 'Clément', nom: 'Decaudin', poste: 'milieu_central', naissance: '1988-01-12' },
  { prenom: 'Eliot', nom: 'Mbengi', poste: 'milieu_defensif', naissance: '2002-05-30' },
  { prenom: 'Moussa', nom: 'Dieng', poste: 'milieu_central', naissance: '1997-11-11' },
  { prenom: 'Sydrane', nom: 'Camara', poste: 'milieu_central', naissance: '2003-06-04' },
  { prenom: 'Sambou', nom: 'Yatabaré', poste: 'milieu_central', naissance: '1989-03-02' },
  { prenom: 'Junior', nom: 'Agostinho', poste: 'milieu_central', naissance: '1999-11-03' },
  { prenom: 'Diadier', nom: 'Camara', poste: 'milieu_central', naissance: '1998-01-31' },
  { prenom: 'Nemy', nom: 'Katende', poste: 'milieu_central', naissance: '2000-01-10' },
  { prenom: 'Manuel', nom: 'Semedo', poste: 'ailier_droit', naissance: '2000-01-20' },
  { prenom: 'Mickaël', nom: 'Lautone', poste: 'attaquant', naissance: '2000-09-29' },
  { prenom: 'Rulio', nom: 'Sebaa Varela', poste: 'attaquant', naissance: '1997-12-30' },
  { prenom: 'Melwane', nom: 'Hassaim', poste: 'attaquant', naissance: '2002-08-31' },
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
  const email = `${slugifier(j.prenom) || 'x'}.${slugifier(j.nom)}.manuel@scoute.footlight.fr`;
  console.log(`${j.prenom || '—'} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || '—'}).`);
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
