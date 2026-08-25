// Ajoute les joueurs manquants de l'effectif SFC Neuilly-sur-Marne (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu droit"/"Milieu gauche" (sans autre précision) mappés sur
// milieu_central. "Avant-centre" mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-neuilly-sur-marne.js —
// dernier club du groupe E sans effectif enregistré).
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

const CLUB = 'Neuilly Marne S.F.C.';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SFC NEUILLY-SUR-MARNE", 26/27).
const EFFECTIF = [
  { prenom: 'Destiné', nom: 'Jopanguy', poste: 'gardien', naissance: '2003-01-30' },
  { prenom: 'Yves', nom: 'Etroukang', poste: 'gardien', naissance: '1999-06-13' },
  { prenom: 'Dorian', nom: 'Oum Oum', poste: 'gardien', naissance: '2007-07-17' },
  { prenom: 'Kilian', nom: 'Fernandes de Queiroz', poste: 'gardien', naissance: '2007-06-18' },
  { prenom: 'Durell', nom: 'Bilendo Duma', poste: 'defenseur_central', naissance: '1999-04-18' },
  { prenom: 'Mady-Fodiet', nom: 'Dianka', poste: 'defenseur_central', naissance: '2000-09-23' },
  { prenom: 'Lucciano', nom: 'da Silva', poste: 'defenseur_central', naissance: '2000-08-22' },
  { prenom: 'Enzo', nom: 'Ferrara', poste: 'lateral_gauche', naissance: '2000-08-27' },
  { prenom: 'Jason', nom: 'Semedo da Veiga', poste: 'lateral_droit', naissance: '2001-03-10' },
  { prenom: 'Enzo', nom: 'Fofana', poste: 'lateral_droit', naissance: '2004-07-15' },
  { prenom: 'Ibrahima', nom: 'Seck', poste: 'milieu_defensif', naissance: '1989-08-10' },
  { prenom: 'Walid', nom: 'Kholkhal', poste: 'milieu_defensif', naissance: '2004-09-10' },
  { prenom: 'Boubou', nom: 'Coulibaly', poste: 'milieu_defensif', naissance: '2001-11-20' },
  { prenom: 'Ilan', nom: 'Bacha', poste: 'milieu_central', naissance: '2005-03-05' },
  { prenom: 'Claudiu', nom: 'Savianu', poste: 'milieu_central', naissance: '2006-04-11' },
  { prenom: 'Kougnie', nom: 'Cissé', poste: 'milieu_central', naissance: '1991-04-11' },
  { prenom: 'Sidi', nom: 'Kaba', poste: 'milieu_central', naissance: '2006-07-10' },
  { prenom: 'Hiendy', nom: 'Confiac', poste: 'milieu_central', naissance: '2003-07-30' },
  { prenom: 'Mohamed', nom: 'Tbahriti', poste: 'milieu_offensif', naissance: '2003-11-26' },
  { prenom: 'Samy', nom: 'Mahour', poste: 'milieu_offensif', naissance: '2003-06-10' },
  { prenom: 'Adama', nom: 'Fade', poste: 'milieu_offensif', naissance: '2003-11-05' },
  { prenom: 'Moussa', nom: 'Karamoko', poste: 'milieu_offensif', naissance: '2006-09-25' },
  { prenom: 'Dominique', nom: 'Pandor', poste: 'ailier_droit', naissance: '1993-05-15' },
  { prenom: 'Mana', nom: 'Dembélé', poste: 'attaquant', naissance: '1988-11-29' },
  { prenom: 'Mamadou', nom: 'Oudy Baldé', poste: 'attaquant', naissance: '1988-05-27' },
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
