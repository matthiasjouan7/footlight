// Diagnostic lecture seule : l'utilisateur soupçonne des doublons dans le
// calendrier de FC Villefranche Beaujolais (40 matchs_joueur pour Sabihi,
// alors qu'une Ligue 3 à ~16-18 équipes ne devrait donner qu'environ 30-34
// matchs). Liste TOUTES les lignes calendrier_officiel (toutes divisions/
// groupes confondues) où Villefranche apparaît, avec repérage des paires
// suspectes (même adversaire apparaissant plus de 2 fois, ou même
// domicile/exterieur en double).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

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

const rows = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison', (q) =>
  q.eq('saison', '2026-2027').or('equipe_domicile.ilike.%villefranche%,equipe_exterieur.ilike.%villefranche%')
);
console.log(`${rows.length} ligne(s) calendrier_officiel contenant "villefranche" (toutes divisions/groupes) :\n`);
rows.sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
for (const r of rows) {
  console.log(`  id=${r.id} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur} — division=${r.division} groupe=${r.groupe}`);
}

console.log('\n=== Adversaires apparaissant plus de 2 fois (suspect) ===');
const compte = {};
for (const r of rows) {
  const adv = /villefranche/i.test(r.equipe_domicile) ? r.equipe_exterieur : r.equipe_domicile;
  const cle = adv.trim().toLowerCase();
  compte[cle] = (compte[cle] || 0) + 1;
}
let suspects = 0;
for (const [adv, n] of Object.entries(compte)) {
  if (n > 2) { console.log(`  "${adv}" — ${n} occurrence(s)`); suspects++; }
}
console.log(`${suspects} adversaire(s) suspect(s) (>2 occurrences).`);

console.log('\n=== Adversaires apparaissant 1 seule fois (aller OU retour manquant, ou ligne isolée) ===');
let uneFois = 0;
for (const [adv, n] of Object.entries(compte)) {
  if (n === 1) { console.log(`  "${adv}"`); uneFois++; }
}
console.log(`${uneFois} adversaire(s) avec une seule occurrence.`);
