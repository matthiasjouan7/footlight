// Détecte (lecture seule, AUCUNE écriture) les joueurs FootLight dont le
// club enregistré diverge du dernier club connu sur transfermarkt.fr
// (page "derniers transferts" d'une compétition). Objectif : repérer les
// transferts non répercutés côté FootLight (le niveau doit alors être mis
// à jour manuellement — voir l'historique de ce dépôt : de nombreux cas
// "joueur transféré mais niveau resté à l'ancien" ont dû être corrigés à la
// main faute de détection automatique).
//
// Volontairement PAS d'écriture automatique : un nom seul peut être
// ambigu (homonymes déjà rencontrés dans ce dépôt, ex. Aboubacar, Epagna)
// — ce script se contente de signaler les écarts pour vérification humaine.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL;
const division = process.env.DIVISION || 'Ligue 3';
const saison = process.env.SAISON;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
if (!saison) { console.error('SAISON manquant (ex: 2026-2027).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
// Rapprochement souple de club (même principe que le reste du dépôt) :
// évite un faux "écart" si le nom diffère juste par sigle/orthographe.
function motsClub(str) {
  return normaliser(str).replace(/[.'/-]/g, ' ').split(' ').filter((w) => w && !['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','football','club','sporting','racing','stade','olympique'].includes(w));
}
function clubsProches(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const [petit, grand] = wa.length <= wb.length ? [setA, setB] : [setB, setA];
  for (const w of petit) if (grand.has(w)) return true; // au moins 1 mot commun = probablement le même club
  return false;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`Page : "${await page.title()}"`);

const transferts = await page.evaluate(() => {
  const tables = [...document.querySelectorAll('table.items')];
  // La table "Les derniers transferts" a pour en-têtes Joueur/Âge/De/Vers/Montant.
  const table = tables.find((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    return heads.includes('De') && heads.includes('Vers');
  });
  if (!table) return [];
  const rows = [...table.querySelectorAll('tbody tr')];
  return rows.map((row) => {
    const cells = [...row.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
    if (cells.length < 11) return null;
    return { nom: cells[2], poste: cells[3], clubOrigine: cells[7] || cells[5], clubDestination: cells[10] || cells[8], type: cells[cells.length - 1] };
  }).filter(Boolean).filter((t) => t.nom && t.clubDestination);
});
console.log(`${transferts.length} transfert(s) trouvé(s) sur la page.\n`);

// PostgREST plafonne les requêtes sans .range() à 1000 lignes : sans cette
// pagination, une division de plus de 1000 joueurs (ex: National 2, ~2442
// joueurs) ne serait vérifiée qu'à moitié, faussant silencieusement le
// résultat (bug déjà rencontré et corrigé plusieurs fois dans ce dépôt).
const joueurs = [];
for (let offset = 0; ; offset += 1000) {
  const { data: page, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau').eq('niveau', division).eq('saison', saison).range(offset, offset + 999);
  if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); await browser.close(); process.exit(1); }
  joueurs.push(...page);
  if (page.length < 1000) break;
}
console.log(`${joueurs.length} joueur(s) FootLight en ${division} (${saison}).\n`);

let totalEcarts = 0;
for (const t of transferts) {
  const nomCible = normaliser(t.nom);
  const correspondances = (joueurs || []).filter((j) => normaliser(`${j.prenom} ${j.nom}`) === nomCible);
  if (!correspondances.length) continue;
  if (correspondances.length > 1) {
    console.log(`⚠️  "${t.nom}" : ${correspondances.length} joueurs FootLight partagent ce nom, ambigu, ignoré (à vérifier manuellement si besoin).`);
    continue;
  }
  const joueur = correspondances[0];
  if (clubsProches(joueur.club, t.clubDestination)) continue; // déjà à jour

  console.log(`ÉCART DÉTECTÉ : ${joueur.prenom} ${joueur.nom}`);
  console.log(`  Club FootLight actuel : "${joueur.club}" (niveau ${joueur.niveau})`);
  console.log(`  Transfert Transfermarkt : "${t.clubOrigine}" -> "${t.clubDestination}" (${t.type})`);
  console.log(`  -> Vérifier si le profil doit être mis à jour (club ET niveau si changement de division).\n`);
  totalEcarts++;
}

console.log(`\nRésumé : ${totalEcarts} écart(s) détecté(s) sur ${transferts.length} transfert(s) analysé(s) (lecture seule, aucune écriture).`);

await browser.close();
