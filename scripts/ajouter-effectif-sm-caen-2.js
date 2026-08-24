// Ajoute les joueurs manquants de l'effectif SM Caen 2 (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt,
// partielle — 3 joueurs seulement, effectif visiblement incomplet à ce
// jour sur la source). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "SM Caen 2" (orthographe exacte de calendrier_officiel, division
// N2, groupe C : "Sm Caen 2" — même convention que Rodez AF 2, Le Mans
// FC 2, etc. — dernier club du groupe C sans effectif enregistré,
// identifié via diagnostic-effectifs-manquants-n2.js). Équipe réserve du
// SM Caen (Ligue 3), à ne pas confondre avec la fiche de Diabé Kanouté
// (club="SM Caen", niveau Ligue 3, ajoutée précédemment).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2800 lignes, au-delà
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

const CLUB = 'SM Caen 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran (effectif partiel, 3 joueurs).
const EFFECTIF = [
  { prenom: 'Noha', nom: 'Lapisse', poste: 'lateral_gauche', naissance: '2006-09-21' },
  { prenom: 'Tristan', nom: 'Rozier', poste: 'lateral_gauche', naissance: '2006-08-03' },
  { prenom: 'Daouda', nom: 'Koné', poste: 'milieu_central', naissance: '2003-01-07' },
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
