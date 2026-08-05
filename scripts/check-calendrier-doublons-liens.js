// Diagnostic (lecture seule) : pour chaque paire de doublons détectée dans
// calendrier_officiel (même match, deux formats de nom), vérifie si des
// lignes matchs_joueur (l'historique généré par les joueurs) pointent vers
// l'une ou l'autre — indispensable avant tout nettoyage, pour ne pas casser
// de liens existants.
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

const { data, error } = await supabase.from('calendrier_officiel').select('*').order('date_match', { ascending: true });
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const parCle = new Map();
for (const r of data) {
  const cle = `${r.date_match}|${r.division}|${r.groupe}|${r.saison}`;
  parCle.set(cle, [...(parCle.get(cle) || []), r]);
}

const paires = [];
for (const lignes of parCle.values()) {
  if (lignes.length < 2) continue;
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i], b = lignes[j];
      const memeSens = clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) && clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur);
      const senInverse = clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur) && clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile);
      if (memeSens || senInverse) paires.push([a, b]);
    }
  }
}
console.log(`${paires.length} paire(s) de doublons à vérifier.\n`);

const tousLesIds = paires.flatMap(([a, b]) => [a.id, b.id]);
const { data: liens, error: liensErr } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id')
  .in('calendrier_officiel_id', tousLesIds);
if (liensErr) { console.error('Erreur lecture matchs_joueur :', liensErr.message); process.exit(1); }

const liensParCalId = new Map();
(liens || []).forEach((l) => liensParCalId.set(l.calendrier_officiel_id, [...(liensParCalId.get(l.calendrier_officiel_id) || []), l]));

let totalLiensAncien = 0, totalLiensNouveau = 0;
paires.forEach(([a, b]) => {
  const [ancien, nouveau] = new Date(a.created_at) < new Date(b.created_at) ? [a, b] : [b, a];
  const liensAncien = liensParCalId.get(ancien.id) || [];
  const liensNouveau = liensParCalId.get(nouveau.id) || [];
  totalLiensAncien += liensAncien.length;
  totalLiensNouveau += liensNouveau.length;
  console.log(`"${ancien.equipe_domicile}" vs "${ancien.equipe_exterieur}" (${ancien.date_match})`);
  console.log(`  ancien [id ${ancien.id}, ${ancien.created_at}] : ${liensAncien.length} lien(s) matchs_joueur`);
  console.log(`  nouveau [id ${nouveau.id}, ${nouveau.created_at}] : ${liensNouveau.length} lien(s) matchs_joueur`);
});

console.log(`\nRésumé : ${totalLiensAncien} lien(s) matchs_joueur vers les lignes ANCIENNES (noms longs), ${totalLiensNouveau} lien(s) vers les lignes NOUVELLES (noms courts).`);
