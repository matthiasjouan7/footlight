// Diagnostic lecture seule : les joueurs Lorient/Chauray/Chateaubriant/Pontivy/
// US ST MALO/US ST MAUR LUSITANOS/AS ST PRIEST/UNION FOOT TOURAINE restent à
// matchs_joues=0.0 malgré un calendrier généré (mj~30-33, cf. diagnostic-
// clubs-isoles-regression.js). On y a repéré des paires de lignes calendrier
// suspectes pour la même rencontre à des dates voisines (ex: Lorient vs
// Chauray daté 21/08 sous un id ET 22/08 sous un autre). Vérifie, pour
// chaque paire de dates suspectes en N1 groupe B (Lorient/Chauray/
// Chateaubriant/Pontivy) et groupe C (les autres), combien de matchs_joueur
// pointent vers chaque ligne et si les minutes y sont renseignées.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

async function detailLigne(id) {
  const { data: r, error } = await supabase.from('calendrier_officiel').select('id, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur').eq('id', id).maybeSingle();
  if (error || !r) return console.log(`  id=${id} : introuvable (${error?.message || 'supprimée ?'})`);
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', id);
  if (errMj) return console.log(`  id=${id} erreur matchs_joueur: ${errMj.message}`);
  const joueurIds = [...new Set(mj.map((m) => m.joueur_id))];
  const { data: joueurs } = await supabase.from('joueurs').select('id, club').in('id', joueurIds.length ? joueurIds : ['00000000-0000-0000-0000-000000000000']);
  const parClub = new Map();
  for (const j of joueurs || []) parClub.set(j.club, (parClub.get(j.club) || 0) + 1);
  const avecMinutes = mj.filter((m) => m.minutes_jouees != null).length;
  console.log(`  id=${id} groupe=${r.groupe} j${r.journee} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}" -> ${mj.length} matchs_joueur (${avecMinutes} avec minutes renseignées) [${[...parClub.entries()].map(([c, n]) => `${c}:${n}`).join(', ') || 'aucun'}]`);
}

console.log('=== Paire Lorient/Chauray (journée 1, groupe B) ===');
await detailLigne(3396);
await detailLigne(245);

console.log('\n=== Lignes Chateaubriant (journées 1-2) ===');
await detailLigne(3394);
await detailLigne(252);

console.log('\n=== Recherche calendrier_officiel N1 groupe B contenant "lorient" ou "chauray" (toutes lignes, pour repérer d\'autres doublons) ===');
async function fetchToutesPages(table, select, filtre) {
  let toutes = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return toutes;
}
const calB = await fetchToutesPages('calendrier_officiel', 'id, groupe, journee, date_match, equipe_domicile, equipe_exterieur', (q) => q.eq('division', 'N1').eq('saison', SAISON));
const suspects = calB.filter((r) => /lorient|chauray/i.test(r.equipe_domicile || '') || /lorient|chauray/i.test(r.equipe_exterieur || ''));
for (const r of suspects.sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''))) {
  console.log(`  id=${r.id} groupe=${r.groupe} j${r.journee} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);
}

console.log('\n=== Recherche calendrier_officiel N1 contenant "chateaubriant" ou "avranches" (journées 1-2 uniquement) ===');
const susChat = calB.filter((r) => (/chateaubriant|avranches/i.test(r.equipe_domicile || '') || /chateaubriant|avranches/i.test(r.equipe_exterieur || '')) && r.date_match >= '2026-08-15' && r.date_match <= '2026-09-01');
for (const r of susChat.sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''))) {
  console.log(`  id=${r.id} groupe=${r.groupe} j${r.journee} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);
}
