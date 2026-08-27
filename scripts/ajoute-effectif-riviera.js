// Ajoute l'effectif Riviera FC (N2, saison 2026-2027, capture d'écran
// "EFFECTIF RIVIERA FC", 27 joueurs) + génère son calendrier. Club visible
// dans le PDF "N2 / Fff Poule G" fourni par l'utilisateur sous
// "Riviera Fc 1" — club calé sur ce nom officiel du calendrier pour
// garantir la correspondance automatique (même convention que les autres
// clubs N2 groupe G ajoutés cette session).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Riviera Fc 1';
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
  { prenom: 'Clément', nom: 'Lumé', poste: 'gardien', naissance: '1990-12-19', nationalite: 'France' },
  { prenom: 'Mathis', nom: 'Poleri Alunno', poste: 'gardien', naissance: '2004-03-08', nationalite: 'France' },
  { prenom: 'Ernest', nom: 'Nsengo', poste: 'defenseur_central', naissance: '2001-10-14', nationalite: 'France' },
  { prenom: 'Davidson', nom: 'Guéguen', poste: 'defenseur_central', naissance: '2004-09-24', nationalite: 'Burkina Faso' },
  { prenom: 'Amin', nom: 'Ibrahim Brahmi', poste: 'defenseur_central', naissance: '2001-02-28', nationalite: 'France' },
  { prenom: 'Ludovic', nom: 'Ouedraogo', poste: 'defenseur_central', naissance: '1996-03-16', nationalite: 'France' },
  { prenom: 'Iheb', nom: 'Lahouel', poste: 'lateral_gauche', naissance: '1995-08-08', nationalite: 'France' },
  { prenom: 'Mehdi', nom: 'Later', poste: 'lateral_gauche', naissance: '2007-12-21', nationalite: 'France' },
  { prenom: 'Younes', nom: 'Trabelsi', poste: 'lateral_gauche', naissance: '2006-11-20', nationalite: 'France' },
  { prenom: 'Mamadou', nom: 'Barry', poste: 'lateral_droit', naissance: '1993-07-05', nationalite: 'Guinée' },
  { prenom: 'Julian', nom: 'Planet', poste: 'lateral_droit', naissance: '2005-02-25', nationalite: 'France' },
  { prenom: 'Hatmen', nom: 'Reibec', poste: 'milieu_defensif', naissance: '1994-06-12', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Peirano', poste: 'milieu_defensif', naissance: '2002-05-24', nationalite: 'France' },
  { prenom: 'Ilan', nom: 'Tabet', poste: 'milieu_central', naissance: '2002-11-14', nationalite: 'France' },
  { prenom: 'Rocco', nom: 'Carracoi', poste: 'milieu_central', naissance: '2006-09-09', nationalite: 'France' },
  { prenom: 'Florian', nom: 'Baranik', poste: 'milieu_central', naissance: '2002-02-02', nationalite: 'France' },
  { prenom: 'Youssef', nom: 'Ajroud', poste: 'milieu_central', naissance: '2003-08-09', nationalite: 'France' },
  { prenom: 'Zakaria', nom: 'Grich', poste: 'milieu_central', naissance: '1996-06-09', nationalite: 'France' },
  { prenom: 'Yacine', nom: 'Atarsia', poste: 'milieu_offensif', naissance: '2001-06-06', nationalite: 'France' },
  { prenom: 'Bilel', nom: 'Abdellah', poste: 'milieu_offensif', naissance: '2003-04-09', nationalite: 'France' },
  { prenom: 'Loïc', nom: 'Gagnon', poste: 'ailier_droit', naissance: '1991-01-21', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Baglieri', poste: 'attaquant', naissance: '2003-03-04', nationalite: 'France' },
  { prenom: 'Noa', nom: 'Olivon', poste: 'attaquant', naissance: '2005-08-30', nationalite: 'France' },
  { prenom: 'Hamza', nom: 'Jemaguer', poste: 'attaquant', naissance: '1994-03-26', nationalite: 'France' },
  { prenom: 'Cédric', nom: 'Backoula Nkouta', poste: 'attaquant', naissance: '2000-04-17', nationalite: 'France' },
  { prenom: 'Akram', nom: 'El Mardi', poste: 'attaquant', naissance: '2001-02-18', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Mangione', poste: 'attaquant', naissance: '2007-05-18', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "riviera") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /riviera/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.rfc.manuel@scoute.footlight.fr`;
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
