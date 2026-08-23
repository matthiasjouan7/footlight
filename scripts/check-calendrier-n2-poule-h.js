// Diagnostic lecture seule : identifie quel "groupe" de calendrier_officiel
// (division N2) correspond à POULE H FFF (cpNo=452037, phNo=1, gpNo=8),
// l'ancien groupe d'Union Foot Touraine avant son repêchage en N1 — pour
// savoir si notre base contient encore Touraine dans ce groupe, et quelles
// équipes/joueurs sont concernés par la correction (exempt à la place de
// Touraine dans les appariements).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function selectAll(table, colonnes, filtre) {
  let tous = [];
  let debut = 0;
  const TAILLE_PAGE = 1000;
  for (;;) {
    let q = supabase.from(table).select(colonnes).range(debut, debut + TAILLE_PAGE - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    tous = tous.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    debut += TAILLE_PAGE;
  }
  return tous;
}

const n2 = await selectAll('calendrier_officiel', 'id, groupe, equipe_domicile, equipe_exterieur, date_match, journee', (q) => q.eq('division', 'N2').eq('saison', '2026-2027'));
console.log(`Lignes calendrier_officiel N2 2026-2027 : ${n2.length}`);

const parGroupe = {};
for (const r of n2) parGroupe[r.groupe] = (parGroupe[r.groupe] || 0) + 1;
console.log(`Répartition par groupe : ${JSON.stringify(parGroupe)}`);

const avecTouraine = n2.filter((r) => /touraine/i.test(r.equipe_domicile) || /touraine/i.test(r.equipe_exterieur));
console.log(`\nLignes N2 mentionnant "Touraine" : ${avecTouraine.length}`);
for (const r of avecTouraine.slice(0, 20)) console.log(`  groupe=${r.groupe} — ${r.date_match} — J${r.journee} — ${r.equipe_domicile} vs ${r.equipe_exterieur}`);

// Cherche le groupe le plus probable via le recoupement d'équipes vues côté FFF.
const EQUIPES_FFF_POULE_H = ['AJ AUXERRE 2', 'PARIS FC 2', 'BRETIGNY FCS', 'BERRI CHATEAUROUX 2', 'LINAS MONTLHERY ESA', 'CORTE', 'GAZELEC FC AJACCIO', 'US ORLEANS 45 2', 'BLOIS F. 41', 'VIERZON FC', 'STE GENEVIEVE FC'];
function motsSimples(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}
function ressemble(a, b) {
  const wa = new Set(motsSimples(a)), wb = new Set(motsSimples(b));
  for (const w of wa) if (w.length >= 4 && [...wb].some((w2) => w2.startsWith(w) || w.startsWith(w2))) return true;
  return false;
}
const correspondancesParGroupe = {};
for (const r of n2) {
  for (const eq of EQUIPES_FFF_POULE_H) {
    if (ressemble(r.equipe_domicile, eq) || ressemble(r.equipe_exterieur, eq)) {
      correspondancesParGroupe[r.groupe] = (correspondancesParGroupe[r.groupe] || 0) + 1;
    }
  }
}
console.log(`\nCorrespondances avec les équipes FFF POULE H, par groupe : ${JSON.stringify(correspondancesParGroupe)}`);

// Joueurs N2 dont le club ressemble à une équipe FFF POULE H (ou Touraine).
const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison', (q) => q.eq('niveau', 'N2').eq('saison', '2026-2027'));
const joueursConcernes = joueurs.filter((j) => EQUIPES_FFF_POULE_H.some((eq) => ressemble(j.club, eq)) || /touraine/i.test(j.club || ''));
console.log(`\nJoueurs N2 2026-2027 dans un club de POULE H (ou Touraine) : ${joueursConcernes.length}`);
for (const j of joueursConcernes) console.log(`  ${j.prenom} ${j.nom} — "${j.club}"`);
