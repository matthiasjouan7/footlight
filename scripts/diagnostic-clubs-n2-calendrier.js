// Diagnostic (lecture seule) : compare les clubs de la table joueurs
// (niveau N2) avec les clubs déjà présents dans calendrier_officiel
// (division N2), en utilisant le même rapprochement flou que
// sync-lequipe-to-calendrier.js — sert à vérifier qu'un club fraîchement
// importé sera bien reconnu quand son calendrier sera synchronisé.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

async function selectAll(table, columns, filterColumn, filterValue) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(filterColumn, filterValue)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const joueurs = await selectAll('joueurs', 'club, niveau', 'niveau', 'N2');
const matchs = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur', 'division', 'N2');

const clubsJoueurs = [...new Set((joueurs || []).map((j) => j.club).filter(Boolean))].sort();
const clubsCalendrier = [...new Set((matchs || []).flatMap((m) => [m.equipe_domicile, m.equipe_exterieur]).filter(Boolean))].sort();

console.log(`${clubsJoueurs.length} club(s) distinct(s) dans joueurs (niveau N2).`);
console.log(`${clubsCalendrier.length} club(s) distinct(s) dans calendrier_officiel (division N2).\n`);

console.log('--- Rapprochement club joueurs -> calendrier_officiel ---');
for (const cj of clubsJoueurs) {
  const matchsTrouves = clubsCalendrier.filter((cc) => clubsCorrespondent(cj, cc));
  if (matchsTrouves.length === 0) {
    console.log(`SANS CORRESPONDANCE : "${cj}" — aucun club du calendrier ne matche.`);
  } else if (matchsTrouves.length > 1) {
    console.log(`AMBIGU : "${cj}" matche plusieurs clubs calendrier : ${matchsTrouves.map((m) => `"${m}"`).join(', ')}`);
  } else {
    console.log(`OK : "${cj}" <-> "${matchsTrouves[0]}"`);
  }
}
