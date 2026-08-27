// 1. Corrige le nom de club de 5 clubs N2 confirmés en base (diagnostic
//    diagnostic-6-clubs-n2-manquants.js) mais mal rapprochés du nom
//    officiel calendrier_officiel : met à jour joueurs.club vers le nom
//    officiel, nettoie les matchs_joueur invalides, puis génère le vrai
//    calendrier.
// 2. Recherche plus large (élargie) pour "Us Alenconnaise 61 1" (groupe
//    B), le 6e club, non retrouvé avec le mot-clé "alenc" (faux positif
//    Valenciennes) — lecture seule, aucune correction pour celui-ci.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
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

async function fetchAll(table, select, filters) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let q = supabase.from(table).select(select);
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    const { data, error } = await q.range(offset, offset + 999);
    if (error) { console.error(`Erreur ${table} :`, error.message); process.exit(1); }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const CLUBS_A_CORRIGER = [
  { ancien: 'Onet-le-Château Football', officiel: 'Onet Le Chat. 1', groupe: 'A' },
  { ancien: 'AS Trouville-Deauville-Villers', officiel: 'Astdv 1', groupe: 'D' },
  { ancien: 'Les Sables Vendée Football', officiel: 'Les Sables Vf 1', groupe: 'B' },
  { ancien: 'US Sainte-Anne de Vertou', officiel: 'Vertou Ussa 1', groupe: 'B' },
  { ancien: 'FC Bourgoin-Jallieu', officiel: 'Bourgoin J. Fc 1', groupe: 'F' },
];

for (const c of CLUBS_A_CORRIGER) {
  console.log(`\n=== ${c.ancien} -> ${c.officiel} (groupe ${c.groupe}) ===`);
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', c.ancien).eq('niveau', NIVEAU).eq('saison', SAISON);
  if (errJ) { console.error('  Erreur recherche joueurs :', errJ.message); continue; }
  console.log(`  ${joueurs.length} joueur(s) trouvé(s) sous "${c.ancien}".`);

  const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', c.groupe).eq('saison', SAISON);
  if (errC) { console.error('  Erreur calendrier :', errC.message); continue; }
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, c.officiel) || clubWordsMatch(row.equipe_exterieur, c.officiel));
  console.log(`  ${matchsClub.length} ligne(s) calendrier trouvée(s) pour "${c.officiel}".`);

  for (const j of joueurs) {
    console.log(`  ${j.prenom} ${j.nom} :`);
    if (!dryRun) {
      const { error: updErr } = await supabase.from('joueurs').update({ club: c.officiel }).eq('id', j.id);
      if (updErr) { console.log(`    Erreur mise à jour club : ${updErr.message}`); continue; }
    }
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', j.id);
    if (errMj) { console.log(`    Erreur lecture matchs_joueur : ${errMj.message}`); continue; }
    const idsReels = new Set(matchsClub.map((m) => m.id));
    const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
    const idsVus = new Set();
    const doublons = mj.filter((m) => { if (!m.calendrier_officiel_id) return false; if (idsVus.has(m.calendrier_officiel_id)) return true; idsVus.add(m.calendrier_officiel_id); return false; });
    const idsDejaValides = new Set(mj.filter((m) => m.calendrier_officiel_id && idsReels.has(m.calendrier_officiel_id)).map((m) => m.calendrier_officiel_id));
    const manquants = matchsClub.filter((row) => !idsDejaValides.has(row.id));
    console.log(`    ${mj.length} matchs_joueur existant(s), ${horsCalendrier.length} hors-calendrier, ${doublons.length} doublon(s), ${manquants.length} match(s) réel(s) manquant(s) à ajouter.`);
    if (!dryRun) {
      const aSupprimer = [...horsCalendrier, ...doublons];
      if (aSupprimer.length) {
        const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer.map((m) => m.id));
        if (delErr) console.log(`    Erreur suppression : ${delErr.message}`);
      }
      if (manquants.length) {
        const aInserer = manquants.map((row) => {
          const domicile = clubWordsMatch(row.equipe_domicile, c.officiel);
          return {
            joueur_id: j.id, saison: SAISON, date_match: row.date_match,
            adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
            competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
          };
        });
        const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
        if (insErr) console.log(`    Erreur insertion : ${insErr.message}`);
      }
    }
  }
}

console.log(`\n=== Recherche élargie "Us Alenconnaise 61 1" (groupe B) — lecture seule ===`);
const motsCles = ['alenc', 'alenç', 'alençon', 'alencon', 'orne'];
for (const mot of motsCles) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('club', `%${mot}%`);
  if (error) { console.log(`  "${mot}" : erreur ${error.message}`); continue; }
  const filtres = data.filter((d) => !/valenciennes/i.test(d.club || ''));
  console.log(`  "${mot}" : ${filtres.length} résultat(s) pertinent(s) (hors Valenciennes) sur ${data.length} brut(s).`);
  const clubs = [...new Set(filtres.map((d) => `${d.club} | ${d.niveau} | ${d.saison}`))];
  clubs.forEach((c) => console.log(`    ${c}`));
}
