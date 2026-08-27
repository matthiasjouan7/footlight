// Ajoute l'effectif GFC Ajaccio (N2 groupe H, saison 2026-2027, capture
// d'écran "EFFECTIF GFC AJACCIO", 25 joueurs) + génère son calendrier.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Gfc Ajaccio';
const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'H';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubWordsMatch(a, b) {
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}
function slugifier(str) { return normalizeName(str).replace(/[^a-z0-9]+/g, ''); }

const JOUEURS = [
  { prenom: 'Cyril', nom: 'Fogacci', poste: 'gardien', naissance: '1996-10-01', nationalite: 'France' },
  { prenom: 'Alane', nom: 'Bedfian', poste: 'gardien', naissance: '2005-06-25', nationalite: 'France' },
  { prenom: 'Luca', nom: 'Serra', poste: 'gardien', naissance: '2007-08-14', nationalite: 'France' },
  { prenom: 'Corentin', nom: 'Cal', poste: 'defenseur_central', naissance: '1999-04-18', nationalite: 'France' },
  { prenom: 'Lucas', nom: 'Alves', poste: 'defenseur_central', naissance: '2005-03-23', nationalite: 'France' },
  { prenom: 'Diougou', nom: 'Traoré', poste: 'defenseur_central', naissance: '2007-11-12', nationalite: 'Mauritanie' },
  { prenom: 'Laurent', nom: 'Makali Nzazi', poste: 'defenseur_central', naissance: '2007-04-09', nationalite: 'France' },
  { prenom: 'Valentin', nom: 'Michau', poste: 'lateral_gauche', naissance: '2003-01-14', nationalite: 'France' },
  { prenom: 'Hassein', nom: 'Mersni', poste: 'lateral_droit', naissance: '2006-02-17', nationalite: 'France' },
  { prenom: 'Mathis', nom: 'Fiori', poste: 'lateral_droit', naissance: '2005-04-27', nationalite: 'France' },
  { prenom: 'Baah', nom: 'Owusu', poste: 'lateral_droit', naissance: '2007-03-12', nationalite: 'France' },
  { prenom: 'Jason', nom: 'Buaillon', poste: 'milieu_defensif', naissance: '1991-10-05', nationalite: 'France' },
  { prenom: 'Paul-Antoine', nom: 'Finidori', poste: 'milieu_defensif', naissance: '1998-05-14', nationalite: 'France' },
  { prenom: 'Laurent', nom: 'Fogacci', poste: 'milieu_defensif', naissance: '2005-02-07', nationalite: 'France' },
  { prenom: 'Tom', nom: 'Fragassi', poste: 'milieu_central', naissance: '2005-06-16', nationalite: 'France' },
  { prenom: 'Francescu', nom: 'Colonna', poste: 'milieu_central', naissance: '2007-02-14', nationalite: 'France' },
  { prenom: 'Kaïs', nom: 'Djellal', poste: 'milieu_offensif', naissance: '2002-01-14', nationalite: 'France' },
  { prenom: 'Isaiah', nom: 'Osei-Prempeh', poste: 'milieu_offensif', naissance: '2006-12-31', nationalite: 'France' },
  { prenom: 'Amir', nom: 'Bouzazi', poste: 'ailier_gauche', naissance: '2002-04-15', nationalite: 'France' },
  { prenom: 'Krys', nom: 'Foleu Téné', poste: 'ailier_gauche', naissance: '2007-01-22', nationalite: 'France' },
  { prenom: 'Nolan', nom: 'Dangoumau', poste: 'ailier_gauche', naissance: '2004-09-13', nationalite: 'France' },
  { prenom: 'Kévin', nom: 'Schur', poste: 'attaquant', naissance: '1990-11-19', nationalite: 'France' },
  { prenom: 'Vassancy', nom: 'Diomandé', poste: 'attaquant', naissance: '2003-02-11', nationalite: 'France' },
  { prenom: 'Rakine', nom: 'Bouhadjar', poste: 'attaquant', naissance: '2006-07-09', nationalite: 'France' },
  { prenom: 'Jules', nom: 'Vitoux', poste: 'attaquant', naissance: '2005-10-07', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "ajaccio") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /ajaccio/i.test(d.club || ''));
  if (auClub.length) {
    console.log(`  CONFLIT POSSIBLE pour ${j.prenom} ${j.nom} :`);
    for (const d of auClub) console.log(`    ${d.prenom} ${d.nom} — club="${d.club}" niveau="${d.niveau}" saison="${d.saison}"`);
    nbConflits++;
  }
}
console.log(`  ${nbConflits} conflit(s) potentiel(s) détecté(s).`);

console.log(`\n=== Ajout de l'effectif (${JOUEURS.length} joueurs) ===`);
let nbCrees = 0;
const idsCrees = [];
for (const j of JOUEURS) {
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.gfca.manuel@scoute.footlight.fr`;
  console.log(`  ${j.prenom} ${j.nom} (${j.poste}, né(e) ${j.naissance || 'inconnu'}, ${j.nationalite})`);
  if (!dryRun) {
    const { data: inserted, error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste, niveau: NIVEAU, club: CLUB, saison: SAISON,
      date_naissance: j.naissance, nationalite: j.nationalite,
      matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: true,
    }]).select('id, prenom, nom');
    if (insErr) { console.log(`    Erreur écriture : ${insErr.message}`); continue; }
    idsCrees.push(inserted[0]);
  }
  nbCrees++;
}
console.log(`  Résumé : ${nbCrees} joueur(s) ${dryRun ? 'à créer' : 'créé(s)'}.`);

console.log(`\n=== Calendrier ${CLUB} (groupe ${GROUPE}) ===`);
if (dryRun) {
  console.log('  (DRY RUN) Calendrier généré uniquement après écriture réelle des joueurs (les id sont nécessaires).');
} else {
  const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
  console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s) pour ${CLUB}.`);
  let total = 0;
  for (const j of idsCrees) {
    const aInserer = matchsClub.map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, CLUB);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    total += aInserer.length;
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`  Erreur insertion ${j.prenom} ${j.nom} : ${insErr.message}`);
  }
  console.log(`  Total : ${total} match(s) inséré(s).`);
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
