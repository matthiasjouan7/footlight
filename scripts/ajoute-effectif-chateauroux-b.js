// Ajoute l'effectif LB Châteauroux B (N2 groupe H, saison 2026-2027,
// capture d'écran "EFFECTIF LB CHÂTEAUROUX B", 26 joueurs) + génère son
// calendrier. Club confirmé dans calendrier_officiel sous
// "Berri Chateauroux 2" (diagnostic-clubs-groupe-h.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Berri Chateauroux 2';
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
  { prenom: 'Mathis', nom: 'Thollet', poste: 'gardien', naissance: '2000-05-15', nationalite: 'France' },
  { prenom: 'Louis', nom: 'Hérault', poste: 'gardien', naissance: '2007-03-31', nationalite: 'France' },
  { prenom: 'Raphaël', nom: 'Brady', poste: 'gardien', naissance: '2010-01-12', nationalite: 'France' },
  { prenom: 'Rayan', nom: 'El Gaouzi', poste: 'defenseur_central', naissance: null, nationalite: 'France' },
  { prenom: 'Nolan', nom: 'Renault', poste: 'defenseur_central', naissance: null, nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Pascal', poste: 'defenseur_central', naissance: null, nationalite: 'France' },
  { prenom: 'Evann', nom: 'Clairicia', poste: 'defenseur_central', naissance: '2001-10-01', nationalite: 'France' },
  { prenom: 'Sekou', nom: 'Tandiang', poste: 'defenseur_central', naissance: '2005-10-15', nationalite: 'France' },
  { prenom: 'Ilan', nom: 'Thobor', poste: 'defenseur_central', naissance: '2005-05-28', nationalite: 'France' },
  { prenom: 'Mattéo', nom: 'Massy', poste: 'defenseur_central', naissance: '2005-06-15', nationalite: 'France' },
  { prenom: 'Maxime', nom: 'Appere', poste: 'defenseur_central', naissance: '2008-01-08', nationalite: 'France' },
  { prenom: 'Raphaël', nom: 'Nzabakomada-Yakoma', poste: 'lateral_gauche', naissance: '2007-05-22', nationalite: 'France' },
  { prenom: 'Cheickné', nom: 'Yaffa', poste: 'lateral_droit', naissance: '2001-04-06', nationalite: 'France' },
  { prenom: 'Gilles', nom: 'Mekondji Ketchadi', poste: 'lateral_droit', naissance: '2008-04-24', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Goes', poste: 'milieu_central', naissance: '2005-09-30', nationalite: 'France' },
  { prenom: 'Francisco', nom: 'Viegas', poste: 'milieu_central', naissance: '2003-06-15', nationalite: 'France' },
  { prenom: 'Émilien', nom: 'Viaud', poste: 'milieu_central', naissance: '2008-06-19', nationalite: 'France' },
  { prenom: 'Mounir', nom: 'Seguer', poste: 'milieu_central', naissance: '2007-06-05', nationalite: 'France' },
  { prenom: 'Kesley', nom: 'Keita', poste: 'ailier_gauche', naissance: '2001-04-17', nationalite: 'France' },
  { prenom: 'Aloïs', nom: 'Branlard', poste: 'ailier_gauche', naissance: '2007-09-03', nationalite: 'France' },
  { prenom: 'Jean-Guillaume', nom: 'Ndongala Zola', poste: 'ailier_droit', naissance: '2000-05-19', nationalite: 'Belgique' },
  { prenom: 'Sacha', nom: 'Lahitte', poste: 'attaquant', naissance: '2007-10-31', nationalite: 'France' },
  { prenom: 'Mansour', nom: 'Amadou', poste: 'attaquant', naissance: '2007-06-14', nationalite: 'France' },
  { prenom: 'Oscar', nom: 'Ebonock Romay', poste: 'attaquant', naissance: '2007-10-11', nationalite: 'France' },
  { prenom: 'Noah', nom: 'Natali', poste: 'attaquant', naissance: '2007-12-26', nationalite: 'France' },
  { prenom: 'Mohammed-Kasso', nom: 'Conde', poste: 'attaquant', naissance: '2002-08-17', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "chateauroux") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /chateauroux/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.lbcb.manuel@scoute.footlight.fr`;
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
