// Ajoute l'effectif ES Fosséenne (N2, saison 2026-2027, capture d'écran
// "EFFECTIF ES FOSSÉENNE", 29 joueurs) + génère son calendrier. Club
// visible dans le PDF "N2 / Fff Poule G" fourni par l'utilisateur sous
// "Et.S. Fosseenne 1" — club calé sur ce nom officiel du calendrier pour
// garantir la correspondance automatique (même convention que OM B / As
// St Etienne 2 / Montpellier Hsc 2 / Es Cannet Roche 1).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Et.S. Fosseenne 1';
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
  { prenom: 'Martial', nom: 'Caserta', poste: 'gardien', naissance: '1999-06-17', nationalite: 'France' },
  { prenom: 'Lucas', nom: 'Maffey', poste: 'gardien', naissance: null, nationalite: 'France' },
  { prenom: 'Michaël', nom: 'Bosqui', poste: 'defenseur_central', naissance: '1990-02-02', nationalite: 'France' },
  { prenom: 'Bilel', nom: 'Agueni', poste: 'defenseur_central', naissance: '1995-01-04', nationalite: 'France' },
  { prenom: 'William', nom: 'Kwasnik', poste: 'defenseur_central', naissance: '1996-11-06', nationalite: 'France' },
  { prenom: 'Terry', nom: 'Elana', poste: 'defenseur_central', naissance: '2002-01-10', nationalite: 'France' },
  { prenom: 'Akram', nom: 'Rbaiti', poste: 'defenseur_central', naissance: '2000-12-02', nationalite: 'France' },
  { prenom: 'Joris', nom: 'Mendy', poste: 'lateral_droit', naissance: '1997-05-13', nationalite: 'France' },
  { prenom: 'Jordan', nom: 'Douhet', poste: 'lateral_droit', naissance: '1994-08-06', nationalite: 'France' },
  { prenom: 'Dragan', nom: 'Haro', poste: 'lateral_droit', naissance: '2003-09-08', nationalite: 'France' },
  { prenom: 'Brice', nom: 'Dja Djédjé', poste: 'milieu_defensif', naissance: '1990-12-23', nationalite: 'France' },
  { prenom: 'Mahamadou', nom: 'Dramé', poste: 'milieu_defensif', naissance: '1998-08-26', nationalite: 'France' },
  { prenom: 'Esosa', nom: 'Ugiagbe', poste: 'milieu_defensif', naissance: '2003-08-13', nationalite: 'France' },
  { prenom: 'Ilan', nom: 'Kucab', poste: 'milieu_central', naissance: '2003-08-27', nationalite: 'France' },
  { prenom: 'Paolo', nom: 'Sciortino', poste: 'milieu_central', naissance: '2003-11-05', nationalite: 'France' },
  { prenom: 'Naïm', nom: 'Chadhuli', poste: 'milieu_central', naissance: '2003-07-15', nationalite: 'France' },
  { prenom: 'Kalil', nom: 'Rekaoui', poste: 'milieu_central', naissance: '2006-05-07', nationalite: 'France' },
  { prenom: 'Yanis', nom: 'Akeb Daoud', poste: 'milieu_offensif', naissance: '1996-04-24', nationalite: 'France' },
  { prenom: 'Sofiane', nom: 'Djahafi', poste: 'milieu_offensif', naissance: '2001-05-06', nationalite: 'France' },
  { prenom: 'Jordan', nom: 'De Santi', poste: 'milieu_offensif', naissance: '2003-04-19', nationalite: 'France' },
  { prenom: 'Bilal', nom: 'Marhdaoui', poste: 'ailier_gauche', naissance: '2000-12-10', nationalite: 'France' },
  { prenom: 'Thibault', nom: 'Vialla', poste: 'ailier_droit', naissance: '1996-01-07', nationalite: 'France' },
  { prenom: 'Dazzeule-Castelejack', nom: 'Belleau', poste: 'ailier_droit', naissance: '2005-02-22', nationalite: 'France' },
  { prenom: 'Nassur', nom: 'Hassani', poste: 'ailier_droit', naissance: '2006-12-18', nationalite: 'France' },
  { prenom: 'Sonny', nom: 'Degert', poste: 'attaquant', naissance: '2000-12-21', nationalite: 'France' },
  { prenom: 'Abdalaye', nom: 'Diakhité', poste: 'attaquant', naissance: '2000-07-24', nationalite: 'France' },
  { prenom: 'Daniel', nom: 'Nana', poste: 'attaquant', naissance: '1997-07-16', nationalite: 'France' },
  { prenom: 'Evan', nom: 'Paulet', poste: 'attaquant', naissance: '2004-01-18', nationalite: 'France' },
  { prenom: 'Jibril', nom: 'El Aouad', poste: 'attaquant', naissance: '2005-12-28', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "fossé"/"fosseenne") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /foss[ée]/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.esf.manuel@scoute.footlight.fr`;
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
