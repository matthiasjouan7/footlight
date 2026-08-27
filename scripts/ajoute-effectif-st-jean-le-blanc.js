// Ajoute l'effectif FC Saint-Jean-le-Blanc (N2 groupe H, saison
// 2026-2027, capture d'écran "EFFECTIF FC SAINT-JEAN-LE-BLANC", 29
// joueurs) + génère son calendrier. Club confirmé dans calendrier_officiel
// sous "Fc St Jean Le Blanc 1" (diagnostic-clubs-groupe-h.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Fc St Jean Le Blanc 1';
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
  { prenom: 'Aymeric', nom: 'Sautereau', poste: 'gardien', naissance: '1993-08-09', nationalite: 'France' },
  { prenom: 'Soura', nom: 'Camara', poste: 'gardien', naissance: '2002-09-23', nationalite: 'France' },
  { prenom: 'Ael', nom: 'Gérard', poste: 'defenseur_central', naissance: '2003-12-01', nationalite: 'France' },
  { prenom: 'Adrien', nom: 'Desprez', poste: 'defenseur_central', naissance: '1995-06-11', nationalite: 'France' },
  { prenom: 'Dorian', nom: 'Levis', poste: 'defenseur_central', naissance: '1997-06-14', nationalite: 'France' },
  { prenom: 'Moussa', nom: 'Sissoko', poste: 'defenseur_central', naissance: '1995-04-15', nationalite: 'Mali' },
  { prenom: 'Djelhal', nom: 'Soadrine', poste: 'defenseur_central', naissance: '2003-03-12', nationalite: 'France' },
  { prenom: 'Christ', nom: 'Mulatu', poste: 'defenseur_central', naissance: '2000-05-10', nationalite: 'France' },
  { prenom: 'Alexis', nom: 'Rigot', poste: 'defenseur_central', naissance: '2002-05-12', nationalite: 'France' },
  { prenom: 'Sofiane', nom: 'Bounajma', poste: 'lateral_gauche', naissance: '1999-10-04', nationalite: 'France' },
  { prenom: 'Hamza', nom: 'Bennar-Leserre', poste: 'lateral_gauche', naissance: '2004-08-21', nationalite: 'France' },
  { prenom: 'Ouail', nom: 'Amhine', poste: 'lateral_droit', naissance: '1998-01-04', nationalite: 'Maroc' },
  { prenom: 'Jean-François', nom: 'Opa', poste: 'milieu_central', naissance: '1994-08-22', nationalite: 'France' },
  { prenom: 'Rémi', nom: 'Ménard', poste: 'milieu_defensif', naissance: '1998-01-12', nationalite: 'France' },
  { prenom: 'Loan', nom: 'Theillaumas', poste: 'milieu_defensif', naissance: '2001-01-18', nationalite: 'France' },
  { prenom: 'Pierre', nom: 'Bourillon', poste: 'milieu_central', naissance: '1999-05-01', nationalite: 'France' },
  { prenom: 'Nino', nom: 'Grégoire', poste: 'milieu_central', naissance: '2000-05-10', nationalite: 'France' },
  { prenom: 'Jean-Jacques', nom: 'Boukie', poste: 'milieu_central', naissance: '1994-08-11', nationalite: 'France' },
  { prenom: 'Thomas', nom: 'Vasseur', poste: 'milieu_central', naissance: '2004-04-21', nationalite: 'France' },
  { prenom: 'Alexandre', nom: 'Ferreira', poste: 'milieu_offensif', naissance: '2000-01-07', nationalite: 'France' },
  { prenom: 'Alban', nom: 'Effa Essomba', poste: 'milieu_offensif', naissance: '2000-11-25', nationalite: 'France' },
  { prenom: 'Dan', nom: 'Ngouyombo', poste: 'ailier_gauche', naissance: '2002-08-05', nationalite: 'France' },
  { prenom: 'Matéo', nom: 'Tesson', poste: 'ailier_gauche', naissance: '2001-07-30', nationalite: 'France' },
  { prenom: 'Mathis', nom: 'da Silva Mendonça', poste: 'attaquant', naissance: '2001-08-28', nationalite: 'France' },
  { prenom: 'Thomas', nom: 'Alvarez', poste: 'attaquant', naissance: '1997-10-17', nationalite: 'France' },
  { prenom: 'Bertrand', nom: 'Konaté', poste: 'attaquant', naissance: '1997-02-10', nationalite: 'France' },
  { prenom: 'Randy', nom: 'Tueba', poste: 'attaquant', naissance: '2002-03-21', nationalite: 'France' },
  { prenom: 'Camille', nom: 'Ployet', poste: 'attaquant', naissance: '2007-03-10', nationalite: 'France' },
  { prenom: 'Djati', nom: 'Brewan', poste: 'attaquant', naissance: '2003-01-08', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "jean le blanc"/"st jean") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /jean.*blanc/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.fcsjb.manuel@scoute.footlight.fr`;
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
