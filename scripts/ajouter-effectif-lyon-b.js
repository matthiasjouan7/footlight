// Ajoute les joueurs manquants de l'effectif Olympique Lyonnais B (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Avant-centre" mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-lyon-b.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt — s'ils sont détectés en base sous un autre club, ne PAS
// modifier leur club sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Olympique Lyonnais 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF OLYMPIQUE LYONNAIS B", 26/27).
const EFFECTIF = [
  { prenom: 'Lassine', nom: 'Diarra', poste: 'gardien', naissance: '2002-11-11' },
  { prenom: 'Yvann', nom: 'Konan', poste: 'gardien', naissance: '2007-01-16' },
  { prenom: 'Matthias', nom: 'da Silva', poste: 'gardien', naissance: '2007-12-01' },
  { prenom: 'Timothée', nom: 'Dutot', poste: 'lateral_gauche', naissance: '2007-07-30' },
  { prenom: 'Boubakar', nom: 'Diarra', poste: 'lateral_gauche', naissance: '2007-02-03' },
  { prenom: 'Jibril', nom: 'Rejeb', poste: 'lateral_droit', naissance: '2007-03-09' },
  { prenom: 'Joss', nom: 'Marques', poste: 'milieu_defensif', naissance: '2004-01-14' },
  { prenom: 'Pierre', nom: 'Dorival', poste: 'milieu_central', naissance: '2006-03-15' },
  { prenom: 'Fallou', nom: 'Fall', poste: 'milieu_central', naissance: '2006-03-08' },
  { prenom: 'Haktan', nom: 'Şener', poste: 'milieu_central', naissance: '2007-04-08' },
  { prenom: 'Cluver', nom: 'Sambi Mbungu', poste: 'milieu_central', naissance: '2008-11-08' },
  { prenom: 'Tiago', nom: 'Gonçalves', poste: 'milieu_offensif', naissance: '2007-10-18' },
  { prenom: 'Adil', nom: 'Hamdani', poste: 'ailier_gauche', naissance: '2009-01-21' },
  { prenom: 'Soungalo', nom: 'Coulibaly', poste: 'ailier_gauche', naissance: '2008-05-01' },
  { prenom: 'Yannis', nom: 'Lagha', poste: 'attaquant', naissance: '2004-06-21' },
  { prenom: 'Ibrahima', nom: 'Fall', poste: 'attaquant', naissance: '2004-03-17' },
  { prenom: 'Nathanaël', nom: 'Beta', poste: 'attaquant', naissance: '2006-08-07' },
  { prenom: 'Nehemie', nom: 'Lurika', poste: 'attaquant', naissance: '2007-08-26' },
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
