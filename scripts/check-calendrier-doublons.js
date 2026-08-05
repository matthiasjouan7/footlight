// Diagnostic (lecture seule) : détecte les doublons dans calendrier_officiel
// où le même match réel est présent deux fois sous des formats de nom
// différents (ex: "Chantilly" vs "US CHANTILLY"), pour comprendre l'ampleur
// du problème avant de toucher au rapprochement dans sync-lequipe-match-stats.js.
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
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('*')
  .order('date_match', { ascending: true });

if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} ligne(s) au total dans calendrier_officiel.\n`);
console.log(`Colonnes disponibles : ${Object.keys(data[0] || {}).join(', ')}\n`);

// Groupe par (date_match, division, groupe, saison) pour chercher des doublons.
const parCle = new Map();
for (const r of data) {
  const cle = `${r.date_match}|${r.division}|${r.groupe}|${r.saison}`;
  parCle.set(cle, [...(parCle.get(cle) || []), r]);
}

let nbGroupesAvecDoublons = 0;
let nbLignesEnDoublon = 0;
for (const [cle, lignes] of parCle) {
  if (lignes.length < 2) continue;
  // Cherche des paires qui semblent être le même match (mêmes deux équipes, ordre quelconque).
  const paires = [];
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i], b = lignes[j];
      const memeSens = clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) && clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur);
      const senInverse = clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur) && clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile);
      if (memeSens || senInverse) paires.push([a, b]);
    }
  }
  if (paires.length) {
    nbGroupesAvecDoublons++;
    console.log(`--- ${cle} ---`);
    paires.forEach(([a, b]) => {
      console.log(`  [id ${a.id}, créé ${a.created_at}] "${a.equipe_domicile}" vs "${a.equipe_exterieur}"`);
      console.log(`  [id ${b.id}, créé ${b.created_at}] "${b.equipe_domicile}" vs "${b.equipe_exterieur}"`);
      nbLignesEnDoublon += 2;
    });
  }
}

console.log(`\nRésumé : ${nbGroupesAvecDoublons} match(s) potentiellement en doublon détecté(s) (sur ${data.length} lignes au total).`);
