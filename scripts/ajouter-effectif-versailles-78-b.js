// Ajoute les joueurs manquants de l'effectif FC Versailles 78 B (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Versailles 78 Fc 2" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-versailles-78-b.js —
// distincte des 25 joueurs déjà en base sous "FC Versailles 78", l'équipe
// première).
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

const CLUB = 'Versailles 78 Fc 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC VERSAILLES 78 B", 26/27).
const EFFECTIF = [
  { prenom: 'Romain', nom: 'Sallard', poste: 'gardien', naissance: '2003-04-29' },
  { prenom: 'Chaïb', nom: 'Lahmer', poste: 'defenseur_central', naissance: '2003-07-07' },
  { prenom: 'Paul', nom: 'Edouard', poste: 'defenseur_central', naissance: '2003-12-28' },
  { prenom: 'Idriss', nom: 'Kamissoko', poste: 'defenseur_central', naissance: '2006-05-21' },
  { prenom: 'Issa', nom: 'Sall', poste: 'defenseur_central', naissance: '1998-09-11' },
  { prenom: 'Chris', nom: 'Aka', poste: 'lateral_gauche', naissance: '2000-06-10' },
  { prenom: 'Samuel', nom: 'Baguidy', poste: 'lateral_gauche', naissance: '2005-10-08' },
  { prenom: 'Ilan', nom: 'Mila', poste: 'lateral_gauche', naissance: '2004-12-19' },
  { prenom: 'Wilfried', nom: 'Alledji', poste: 'lateral_droit', naissance: '1990-10-23' },
  { prenom: 'Nicolas', nom: 'Lepinay', poste: 'lateral_droit', naissance: '2003-04-17' },
  { prenom: 'Nicolas', nom: 'Martins', poste: 'milieu_central', naissance: '1999-06-27' },
  { prenom: 'Nadil', nom: 'Lamiri', poste: 'milieu_defensif', naissance: '2001-10-09' },
  { prenom: 'Roan', nom: 'Gbedji', poste: 'milieu_central', naissance: '2004-02-09' },
  { prenom: 'Samy', nom: 'Benhaddou', poste: 'milieu_defensif', naissance: '2005-03-08' },
  { prenom: 'Kwouni', nom: 'Ngassa', poste: 'milieu_central', naissance: '2006-05-24' },
  { prenom: 'Mathys', nom: 'Tual', poste: 'milieu_central', naissance: '2007-12-02' },
  { prenom: 'Hugo', nom: 'Mahieu', poste: 'ailier_gauche', naissance: '2000-02-01' },
  { prenom: 'Aimé', nom: 'Gaval', poste: 'attaquant', naissance: '2005-10-25' },
  { prenom: 'Ryan', nom: 'Tchapda Tchewo', poste: 'attaquant', naissance: '2005-06-19' },
  { prenom: 'Sylvere', nom: 'Zehi', poste: 'attaquant', naissance: '2005-10-14' },
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
