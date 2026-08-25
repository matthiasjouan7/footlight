// Ajoute les joueurs manquants de l'effectif RC Strasbourg Alsace B
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu droit" (sans mapping dédié) traité comme générique et mappé sur
// milieu_central. "Avant-centre" mappé sur attaquant.
//
// club = "Strasbourg Alsace Rc" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-strasbourg-b.js — l'un des
// clubs du groupe E sans effectif enregistré).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt (Artur Smiechowski, Fahim Boubguira, Stanley Ogbonna, Yassine
// Aïche, Kingsley Olufadé, Erwan Traoré) — s'ils sont détectés en base sous
// un autre club, ne PAS modifier leur club sans confirmation explicite de
// l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Strasbourg Alsace Rc';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF RC STRASBOURG ALSACE B", 26/27).
const EFFECTIF = [
  { prenom: 'Artur', nom: 'Smiechowski', poste: 'gardien', naissance: '2007-09-15' },
  { prenom: 'Gabriel', nom: 'Kerckaert', poste: 'gardien', naissance: '2007-10-21' },
  { prenom: 'Abdoulaye', nom: 'Ousmane', poste: 'defenseur_central', naissance: '2000-02-22' },
  { prenom: 'Erwan', nom: 'Adonis', poste: 'defenseur_central', naissance: '2006-01-09' },
  { prenom: 'François', nom: 'Mendy', poste: 'defenseur_central', naissance: '2007-04-22' },
  { prenom: 'Yvan', nom: 'Mbianga', poste: 'defenseur_central', naissance: '2007-11-25' },
  { prenom: 'Amizade', nom: 'Gabriel-Indi', poste: 'lateral_gauche', naissance: '2008-02-03' },
  { prenom: 'Timéo', nom: 'Delecolle', poste: 'lateral_droit', naissance: '2007-11-10' },
  { prenom: 'Idrissa', nom: 'Sabaly', poste: 'milieu_defensif', naissance: '2007-11-23' },
  { prenom: 'Latufe', nom: 'Assoumani', poste: 'milieu_defensif', naissance: '2006-03-11' },
  { prenom: 'Max', nom: 'Maréchal', poste: 'milieu_defensif', naissance: '2007-05-11' },
  { prenom: 'Fouad', nom: 'Halil', poste: 'milieu_defensif', naissance: '2007-03-24' },
  { prenom: 'Tyrese', nom: 'Noubissie', poste: 'milieu_central', naissance: '2009-05-13' },
  { prenom: 'Fahim', nom: 'Boubguira', poste: 'milieu_central', naissance: '2008-11-06' },
  { prenom: 'Hugo', nom: 'Colella', poste: 'milieu_central', naissance: '1999-09-16' },
  { prenom: 'Adrien', nom: 'Gandolphe', poste: 'milieu_offensif', naissance: '2006-03-18' },
  { prenom: 'Yaya', nom: 'Diémé', poste: 'ailier_droit', naissance: '2007-10-16' },
  { prenom: 'Stanley', nom: 'Ogbonna', poste: 'ailier_droit', naissance: '2007-07-06' },
  { prenom: 'Ghianny', nom: 'Kodia', poste: 'ailier_droit', naissance: '2007-09-03' },
  { prenom: 'Yassine', nom: 'Aïche', poste: 'ailier_droit', naissance: '2008-06-07' },
  { prenom: 'Isaac', nom: 'Karamoko', poste: 'attaquant', naissance: '2002-05-26' },
  { prenom: 'David', nom: 'Aguy', poste: 'attaquant', naissance: '2007-06-14' },
  { prenom: 'Kingsley', nom: 'Olufadé', poste: 'attaquant', naissance: '2008-01-28' },
  { prenom: 'Erwan', nom: 'Traoré', poste: 'attaquant', naissance: '2008-05-21' },
  { prenom: 'Jean-Baptiste', nom: 'Bosey', poste: 'attaquant', naissance: '2008-02-15' },
  { prenom: 'Victor Divine', nom: 'Emmanuel', poste: 'attaquant', naissance: '2007-01-01' },
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
