// Ajoute l'effectif Berre Sporting Club (N2, saison 2026-2027, capture
// d'écran "EFFECTIF BERRE SPORTING CLUB", 17 joueurs) + génère son
// calendrier. Club visible dans le PDF "N2 / Fff Poule G" fourni par
// l'utilisateur sous "Berre Sp.C. 1" — club calé sur ce nom officiel du
// calendrier pour garantir la correspondance automatique (même convention
// que les autres clubs N2 groupe G ajoutés cette session).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Berre Sp.C. 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'G';

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
  { prenom: 'Mike', nom: 'Linon', poste: 'gardien', naissance: '2001-03-11', nationalite: 'France' },
  { prenom: 'Yann', nom: 'Van Minden', poste: 'gardien', naissance: '1997-06-08', nationalite: 'France' },
  { prenom: 'Liassine', nom: 'Cadamuro', poste: 'defenseur_central', naissance: '1988-03-05', nationalite: 'France' },
  { prenom: 'Adnan', nom: 'Fadlan', poste: 'defenseur_central', naissance: '2006-01-28', nationalite: 'France' },
  { prenom: 'Darik', nom: 'Ghilas', poste: 'lateral_droit', naissance: '2001-12-30', nationalite: 'France' },
  { prenom: 'Brice', nom: 'Volget', poste: 'lateral_droit', naissance: '2003-01-03', nationalite: 'France' },
  { prenom: 'Didane', nom: 'Azamoum', poste: 'milieu_central', naissance: '2002-01-27', nationalite: 'France' },
  { prenom: 'Yanis', nom: 'Gasmi', poste: 'milieu_central', naissance: '2002-01-15', nationalite: 'France' },
  { prenom: 'Hicham', nom: 'Hnini', poste: 'milieu_central', naissance: '2005-08-19', nationalite: 'France' },
  { prenom: 'Elias', nom: 'Taguelmint', poste: 'milieu_offensif', naissance: '1989-04-08', nationalite: 'France' },
  { prenom: 'Sofien', nom: 'Abdderrahmane', poste: 'milieu_offensif', naissance: '1990-07-27', nationalite: 'France' },
  { prenom: 'Rayan', nom: 'Bichari', poste: 'milieu_offensif', naissance: '2002-05-11', nationalite: 'France' },
  { prenom: 'Ryad', nom: 'Boudiaf', poste: 'milieu_offensif', naissance: '2000-07-04', nationalite: 'France' },
  { prenom: 'Nabil', nom: 'Ghilas', poste: 'attaquant', naissance: '1990-04-20', nationalite: 'France' },
  { prenom: 'Mehdi', nom: 'Nagui', poste: 'attaquant', naissance: '1996-03-21', nationalite: 'France' },
  { prenom: 'Ismaëla', nom: 'Bayo', poste: 'attaquant', naissance: '1997-12-01', nationalite: 'France' },
  { prenom: 'Anil', nom: 'Madi Rama', poste: 'attaquant', naissance: '2001-08-02', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "berre") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /berre/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.bsc.manuel@scoute.footlight.fr`;
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

console.log(`\n=== Calendrier ${CLUB} ===`);
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
