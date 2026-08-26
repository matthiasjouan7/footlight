// Correctif groupé, généralisation du lot Ligue 3 précédent, pour les 21
// joueurs trouvés par le scan systémique corrigé (scan-niveau-errone-
// toutes-divisions.js, union de tous les clubs correspondants — la
// version précédente ne prenait que le premier match trouvé et produisait
// ~70 faux positifs pour des clubs déjà correctement classés type
// "FC Versailles 78"). Ces 21 cas sont des correspondances non ambiguës
// (même club, nom légèrement différent, ou joueur transféré dont le
// niveau n'a pas suivi — ex Maé Clavel déjà changé de club vers Thonon
// Évian mais resté en N1 au lieu de N2).
//
// Corrige le niveau déclaré puis génère le calendrier réel pour chacun.
// Pagine calendrier_officiel (selectAll) pour éviter le plafond de 1000
// lignes PostgREST déjà rencontré pour les divisions à groupes multiples.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

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

async function selectAll(table, columns, filters) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    let q = supabase.from(table).select(columns).range(page * pageSize, page * pageSize + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

// Liste figée : id joueur, niveau correct, club (pour retrouver le
// calendrier). Ids récupérés via le scan (ilike sur nom+prénom+club).
const CORRECTIONS = [
  { prenom: 'Royce', nom: 'Openda', club: 'Pau', niveauCorrect: 'N2' },
  { prenom: 'Nathan', nom: 'Besse', club: 'Cestas SAG', niveauCorrect: 'N2' },
  { prenom: 'Marius', nom: 'Feuillet', club: 'Cestas SAG', niveauCorrect: 'N2' },
  { prenom: 'Wilfried', nom: 'Baana Jaba', club: 'Trélissac FC', niveauCorrect: 'N2' },
  { prenom: 'Pierre', nom: 'Portets', club: 'Trélissac FC', niveauCorrect: 'N2' },
  { prenom: 'Célian', nom: 'Chassain', club: 'US Chauvigny', niveauCorrect: 'N2' },
  { prenom: 'Ben Soilihi', nom: 'Aboubacar', club: 'US Chauvigny', niveauCorrect: 'N2' },
  { prenom: 'Paco', nom: 'Mathis', club: 'US Chauvigny', niveauCorrect: 'N2' },
  { prenom: 'Clément', nom: 'Grégoire', club: 'US Chauvigny', niveauCorrect: 'N2' },
  { prenom: 'Stany', nom: 'Epagna', club: 'Vendée Fontenay Foot', niveauCorrect: 'N2' },
  { prenom: 'Hamissou', nom: 'Dangabo', club: 'FC Nantes B', niveauCorrect: 'N2' },
  { prenom: 'Brandon', nom: 'Dady', club: 'Avoine Olympique Chinon', niveauCorrect: 'N2' },
  { prenom: 'Jessy', nom: "N'Kassa", club: 'Pontivy', niveauCorrect: 'N1' },
  { prenom: 'Eneko', nom: 'Feltrin', club: 'Anglet Genêts Foot', niveauCorrect: 'N2' },
  { prenom: 'Valentin', nom: 'Picoulet', club: 'Anglet Genêts Foot', niveauCorrect: 'N2' },
  { prenom: 'Thibault', nom: 'Lapeyre', club: 'Anglet Genêts Foot', niveauCorrect: 'N2' },
  { prenom: 'Hugo', nom: 'Dellas', club: 'Anglet Genêts Foot', niveauCorrect: 'N2' },
  { prenom: 'Franck', nom: 'Mefouma', club: 'FC St-Lô Manche', niveauCorrect: 'N2' },
  { prenom: 'Samuel', nom: 'Genty', club: 'Milizac', niveauCorrect: 'N2' },
  { prenom: 'Lucas', nom: 'Rocrou', club: 'US Lège Cap-Ferret', niveauCorrect: 'N2' },
  { prenom: 'Maé', nom: 'Clavel', club: 'Thonon Evian Gg Fc 1', niveauCorrect: 'N2' },
];

console.log(`\n=== Correction des niveaux (${CORRECTIONS.length} joueur(s)) ===`);
const joueursCorriges = [];
for (const c of CORRECTIONS) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau').eq('saison', SAISON).eq('prenom', c.prenom).eq('nom', c.nom);
  if (error) { console.log(`  ${c.prenom} ${c.nom} : erreur lecture (${error.message})`); continue; }
  if (data.length !== 1) { console.log(`  ${c.prenom} ${c.nom} : ${data.length} correspondance(s) exacte(s), attendu 1 — ignoré par sécurité.`); continue; }
  const j = data[0];
  console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau ${j.niveau} -> ${c.niveauCorrect}`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ niveau: c.niveauCorrect }).eq('id', j.id);
    if (updErr) { console.log(`    Erreur écriture : ${updErr.message}`); continue; }
  }
  joueursCorriges.push({ ...j, niveau: c.niveauCorrect, club: c.club });
}
console.log(`${joueursCorriges.length} joueur(s) ${dryRun ? 'à corriger' : 'corrigé(s)'}.`);

console.log('\n=== Génération des calendriers ===');
const parClub = new Map();
for (const j of joueursCorriges) {
  const cle = `${j.club}|${j.niveau}`;
  if (!parClub.has(cle)) parClub.set(cle, { club: j.club, niveau: j.niveau, joueurs: [] });
  parClub.get(cle).joueurs.push(j);
}

let totalInseres = 0;
for (const { club, niveau, joueurs } of parClub.values()) {
  const calendrier = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match', (q) => q.eq('division', niveau).eq('saison', SAISON));
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, club) || clubWordsMatch(row.equipe_exterieur, club));
  console.log(`  ${club} (${niveau}) : ${matchsClub.length} ligne(s) calendrier pour ${joueurs.length} joueur(s).`);
  for (const j of joueurs) {
    const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', j.id);
    if (errE) { console.log(`    ${j.prenom} ${j.nom} : erreur lecture existants (${errE.message})`); continue; }
    const idsExistants = new Set((existants || []).filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
    const datesExistantes = new Set((existants || []).map((m) => m.date_match));
    const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, club);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    totalInseres += aInserer.length;
    if (!dryRun && aInserer.length) {
      const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
      if (insErr) console.log(`    Erreur insertion ${j.prenom} ${j.nom} : ${insErr.message}`);
    }
  }
}
console.log(`\nRésumé : ${joueursCorriges.length} niveau(x) ${dryRun ? 'à corriger' : 'corrigé(s)'}, ${totalInseres} match(s) ${dryRun ? 'à insérer' : 'inséré(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
