// Ajoute l'effectif USC Corte (N2 groupe H, saison 2026-2027, capture
// d'écran "EFFECTIF USC CORTE", 17 joueurs) + génère son calendrier.
// Club confirmé dans calendrier_officiel sous "Corte 1"
// (diagnostic-clubs-groupe-h.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Corte 1';
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
  { prenom: 'Pierre-Marie', nom: 'Gouet', poste: 'gardien', naissance: '2004-03-25', nationalite: 'France' },
  { prenom: 'Nicolas', nom: 'Biancarelli', poste: 'gardien', naissance: '2006-03-03', nationalite: 'France' },
  { prenom: 'Pierre-François', nom: 'Sodini', poste: 'defenseur_central', naissance: '1989-06-22', nationalite: 'France' },
  { prenom: 'Kévin', nom: 'Rimane', poste: 'defenseur_central', naissance: '1991-02-23', nationalite: 'France' },
  { prenom: 'Jordan', nom: 'Machado', poste: 'defenseur_central', naissance: '1995-01-28', nationalite: 'France' },
  { prenom: 'Camille', nom: 'Avines', poste: 'lateral_gauche', naissance: '1998-02-06', nationalite: 'France' },
  { prenom: 'Raphaël', nom: 'Menozzi', poste: 'lateral_droit', naissance: '2002-12-13', nationalite: 'France' },
  { prenom: 'Benjamin', nom: 'Vérité', poste: 'milieu_defensif', naissance: '1999-04-21', nationalite: 'France' },
  { prenom: 'Joseph', nom: 'Marie Agostini', poste: 'milieu_central', naissance: '1997-12-30', nationalite: 'France' },
  { prenom: 'Jean', nom: 'Daniel Baldovini', poste: 'milieu_central', naissance: '2000-07-30', nationalite: 'France' },
  { prenom: 'Charles-Marie', nom: 'Marietti', poste: 'milieu_central', naissance: '1998-11-18', nationalite: 'France' },
  { prenom: 'Dimitri', nom: 'Menozzi', poste: 'milieu_central', naissance: '1990-07-30', nationalite: 'France' },
  { prenom: 'Mehdi', nom: 'Bariki', poste: 'attaquant', naissance: '2000-03-20', nationalite: 'France' },
  { prenom: 'Bryan', nom: 'Ausu', poste: 'attaquant', naissance: '1997-11-25', nationalite: 'France' },
  { prenom: 'Ryan', nom: 'Contena', poste: 'attaquant', naissance: '2004-06-03', nationalite: 'France' },
  { prenom: 'Nicolas', nom: 'Cerdeira', poste: 'attaquant', naissance: '2004-06-30', nationalite: 'France' },
  { prenom: 'Isaac', nom: 'Villain', poste: 'attaquant', naissance: '2006-02-26', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "corte") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /corte/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.usc.manuel@scoute.footlight.fr`;
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
