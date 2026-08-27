// Ajoute l'effectif US Orléans B (N2 groupe H, saison 2026-2027, capture
// d'écran "EFFECTIF US ORLÉANS B", 20 joueurs) + génère son calendrier.
// Club confirmé dans calendrier_officiel sous "Us Orleans 45 2"
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

const CLUB = 'Us Orleans 45 2';
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
  { prenom: 'Matisse', nom: 'Morville', poste: 'gardien', naissance: '2005-09-07', nationalite: 'France' },
  { prenom: 'Mohamed-Amine', nom: 'Ezzarhouni', poste: 'gardien', naissance: '2006-03-29', nationalite: 'France' },
  { prenom: 'Noah', nom: 'Voise', poste: 'gardien', naissance: '2006-05-15', nationalite: 'France' },
  { prenom: 'Ange', nom: 'Bailly', poste: 'defenseur_central', naissance: '2003-07-28', nationalite: 'France' },
  { prenom: 'Christian', nom: 'Ngambi Bikoi', poste: 'defenseur_central', naissance: '2006-02-10', nationalite: 'France' },
  { prenom: 'Mounir', nom: 'El Ghoulbzouri', poste: 'lateral_gauche', naissance: '2004-06-05', nationalite: 'France' },
  { prenom: 'Titouan', nom: 'Gilbert', poste: 'lateral_gauche', naissance: '2006-07-07', nationalite: 'France' },
  { prenom: 'Cameron', nom: 'Zekou', poste: 'lateral_droit', naissance: '2003-02-21', nationalite: 'France' },
  { prenom: 'Matthis', nom: 'Esch', poste: 'lateral_droit', naissance: '2006-05-30', nationalite: 'France' },
  { prenom: 'Théoglade', nom: 'Moukilou', poste: 'lateral_droit', naissance: '2007-07-06', nationalite: 'France' },
  { prenom: 'Samuel', nom: 'Koeberlé', poste: 'milieu_defensif', naissance: '2004-11-26', nationalite: 'France' },
  { prenom: 'Noory', nom: 'Elazouzi', poste: 'milieu_defensif', naissance: '2005-04-17', nationalite: 'France' },
  { prenom: 'Kurtys', nom: 'Pitchecanin', poste: 'milieu_central', naissance: '2006-10-18', nationalite: 'France' },
  { prenom: 'Wassim', nom: 'Nia', poste: 'milieu_central', naissance: '2006-06-07', nationalite: 'France' },
  { prenom: 'Yaya', nom: 'Diakité', poste: 'milieu_central', naissance: '2006-12-29', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Arbona', poste: 'milieu_offensif', naissance: '2004-02-20', nationalite: 'France' },
  { prenom: 'Ylian', nom: 'Baptiste', poste: 'attaquant', naissance: '2003-01-30', nationalite: 'France' },
  { prenom: 'Pacôme', nom: 'Becard', poste: 'attaquant', naissance: '2006-08-24', nationalite: 'France' },
  { prenom: 'Ange-Kévine', nom: 'Gnabo', poste: 'attaquant', naissance: '2004-04-08', nationalite: 'France' },
  { prenom: 'Dan', nom: 'Boyele', poste: 'attaquant', naissance: '2007-06-07', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "orleans") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /orleans/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.usob.manuel@scoute.footlight.fr`;
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
