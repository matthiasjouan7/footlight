// Nettoyage groupé, généralisation du nettoyage Sabihi, pour tous les
// joueurs dont le niveau a été corrigé dans
// corrige-et-genere-calendrier-lot-niveau-toutes-divisions.js +
// corrige-aboubacar.js + fusionne-epagna.js. L'utilisateur a repéré que
// Stany Epagna avait 57 matchs_joueur au lieu de 26 (31 lignes restes
// d'un calendrier d'un autre niveau/club jamais nettoyées lors de la
// correction de niveau) — même pattern que Sabihi. Ce script vérifie et
// nettoie TOUS les joueurs concernés, pas seulement Epagna, puisque la
// correction de niveau précédente ajoutait les vraies lignes manquantes
// mais ne supprimait jamais les anciennes.
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

// prenom, nom (ou id direct pour Epagna dont la fiche a été fusionnée),
// club officiel, niveau correct.
const JOUEURS = [
  { prenom: 'Royce', nom: 'Openda', club: 'Pau', niveau: 'N2' },
  { prenom: 'Nathan', nom: 'Besse', club: 'Cestas SAG', niveau: 'N2' },
  { prenom: 'Marius', nom: 'Feuillet', club: 'Cestas SAG', niveau: 'N2' },
  { prenom: 'Wilfried', nom: 'Baana Jaba', club: 'Trélissac FC', niveau: 'N2' },
  { prenom: 'Pierre', nom: 'Portets', club: 'Trélissac FC', niveau: 'N2' },
  { prenom: 'Célian', nom: 'Chassain', club: 'US Chauvigny', niveau: 'N2' },
  { id: 'c8be5826-3a9d-4d71-b5d7-36e89e9ad75b', club: 'US Chauvigny', niveau: 'N2' }, // Ben Soilihi Aboubacar
  { prenom: 'Paco', nom: 'Mathis', club: 'US Chauvigny', niveau: 'N2' },
  { prenom: 'Clément', nom: 'Grégoire', club: 'US Chauvigny', niveau: 'N2' },
  { prenom: 'Hamissou', nom: 'Dangabo', club: 'FC Nantes B', niveau: 'N2' },
  { prenom: 'Brandon', nom: 'Dady', club: 'Avoine Olympique Chinon', niveau: 'N2' },
  { prenom: 'Jessy', nom: "N'Kassa", club: 'Pontivy', niveau: 'N1' },
  { prenom: 'Eneko', nom: 'Feltrin', club: 'Anglet Genêts Foot', niveau: 'N2' },
  { prenom: 'Valentin', nom: 'Picoulet', club: 'Anglet Genêts Foot', niveau: 'N2' },
  { prenom: 'Thibault', nom: 'Lapeyre', club: 'Anglet Genêts Foot', niveau: 'N2' },
  { prenom: 'Hugo', nom: 'Dellas', club: 'Anglet Genêts Foot', niveau: 'N2' },
  { prenom: 'Franck', nom: 'Mefouma', club: 'FC St-Lô Manche', niveau: 'N2' },
  { prenom: 'Samuel', nom: 'Genty', club: 'Milizac', niveau: 'N2' },
  { prenom: 'Lucas', nom: 'Rocrou', club: 'US Lège Cap-Ferret', niveau: 'N2' },
  { prenom: 'Maé', nom: 'Clavel', club: 'Thonon Evian Gg Fc 1', niveau: 'N2' },
  { id: '9b85b445-52eb-4794-a0a1-a2da7fa7eb4d', club: 'Vendée Fontenay Foot', niveau: 'N2' }, // Stany Epagna
];

const calendrierCache = new Map(); // niveau -> lignes
async function calendrierPourNiveau(niveau) {
  if (!calendrierCache.has(niveau)) {
    calendrierCache.set(niveau, await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur', (q) => q.eq('division', niveau).eq('saison', SAISON)));
  }
  return calendrierCache.get(niveau);
}

let totalSupprimees = 0;
for (const j of JOUEURS) {
  let joueur;
  if (j.id) {
    const { data, error } = await supabase.from('joueurs').select('id, prenom, nom').eq('id', j.id).single();
    if (error) { console.log(`  Erreur lecture id=${j.id} : ${error.message}`); continue; }
    joueur = data;
  } else {
    const { data, error } = await supabase.from('joueurs').select('id, prenom, nom').eq('saison', SAISON).eq('prenom', j.prenom).eq('nom', j.nom);
    if (error) { console.log(`  ${j.prenom} ${j.nom} : erreur (${error.message})`); continue; }
    if (data.length !== 1) { console.log(`  ${j.prenom} ${j.nom} : ${data.length} correspondance(s), attendu 1 — ignoré.`); continue; }
    joueur = data[0];
  }

  const calendrier = await calendrierPourNiveau(j.niveau);
  const idsReels = new Set(calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, j.club) || clubWordsMatch(row.equipe_exterieur, j.club)).map((r) => r.id));

  const { data: matchs, error: errM } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', joueur.id);
  if (errM) { console.log(`  ${joueur.prenom} ${joueur.nom} : erreur lecture matchs (${errM.message})`); continue; }
  const aSupprimer = matchs.filter((m) => !idsReels.has(m.calendrier_officiel_id));
  console.log(`  ${joueur.prenom} ${joueur.nom} (${j.club}, ${j.niveau}) : ${matchs.length} total, ${idsReels.size} réel(s) attendu(s), ${aSupprimer.length} à supprimer.`);
  totalSupprimees += aSupprimer.length;
  if (!dryRun && aSupprimer.length) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer.map((m) => m.id));
    if (delErr) console.log(`    Erreur suppression : ${delErr.message}`);
  }
}

console.log(`\nRésumé : ${totalSupprimees} ligne(s) hors calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'} au total.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
