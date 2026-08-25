// Ajoute les joueurs manquants de l'effectif AS Nancy-Lorraine B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Nancy Lorraine As 2" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-nancy-b.js — l'un des clubs du
// groupe E sans effectif enregistré).
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

const CLUB = 'Nancy Lorraine As 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS NANCY-LORRAINE B", 26/27).
const EFFECTIF = [
  { prenom: 'Desthy', nom: 'Nkounkou', poste: 'gardien', naissance: '2005-03-11' },
  { prenom: 'Almami', nom: 'Touré', poste: 'gardien', naissance: '2006-08-19' },
  { prenom: 'Elfayed', nom: 'Maanrifa', poste: 'defenseur_central', naissance: '2004-05-08' },
  { prenom: 'Haïssam', nom: 'Ghares', poste: 'defenseur_central', naissance: '2005-11-07' },
  { prenom: 'Jean-Michel', nom: 'Dalberant', poste: 'defenseur_central', naissance: '2005-02-12' },
  { prenom: 'Louis', nom: 'Cissé', poste: 'defenseur_central', naissance: '2007-10-18' },
  { prenom: 'David', nom: 'Kouale', poste: 'defenseur_central', naissance: '2006-01-25' },
  { prenom: 'Arsenne', nom: 'Colas', poste: 'defenseur_central', naissance: '2007-04-29' },
  { prenom: 'Noah', nom: 'Ya', poste: 'lateral_gauche', naissance: '2007-02-26' },
  { prenom: 'Redouan', nom: 'Mahily', poste: 'lateral_droit', naissance: '2005-03-03' },
  { prenom: 'Evan', nom: 'Diamalunda', poste: 'lateral_droit', naissance: '2006-07-22' },
  { prenom: 'Ylies', nom: 'Ounissi', poste: 'milieu_defensif', naissance: '2007-08-02' },
  { prenom: 'Alessio', nom: 'Martinez', poste: 'milieu_central', naissance: '2006-06-12' },
  { prenom: 'Quentin', nom: 'Carpentier', poste: 'milieu_central', naissance: '2006-04-04' },
  { prenom: 'Lucas', nom: 'Schnepp', poste: 'milieu_offensif', naissance: '2002-02-15' },
  { prenom: 'Michael', nom: 'Mortume', poste: 'ailier_gauche', naissance: '2005-07-25' },
  { prenom: 'Billal', nom: 'Samri', poste: 'ailier_gauche', naissance: '2006-07-21' },
  { prenom: 'Lenny', nom: 'Piètre', poste: 'attaquant', naissance: '2006-02-06' },
  { prenom: 'Alvin', nom: 'Pénuisic', poste: 'attaquant', naissance: '2005-12-27' },
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
