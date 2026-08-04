// Synchronise les stats de saison "officielles" (flashscore.fr) pour TOUS
// les clubs d'un groupe (ex: National 1 Groupe A) ayant au moins un joueur
// FootLight — pas la peine de scraper un club où personne n'est inscrit.
// Un seul navigateur pour tous les clubs du groupe (plus efficace qu'un
// run par club). Réutilise la même logique de rapprochement que
// sync-flashscore-officielles.js (table stats_officielles, jamais les
// stats saisies par le joueur).
//
// Sécurité : DRY_RUN=true par défaut.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const classementUrl = process.env.TARGET_URL;
const saison = process.env.SAISON;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!classementUrl) { console.error('TARGET_URL manquant (page classement flashscore.fr).'); process.exit(1); }
if (!saison) { console.error('SAISON manquant (ex: 2026-2027).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique']);
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
function motsNom(str) { return normaliser(str).split(' ').filter(Boolean); }
function memeNom(motsA, motsB) {
  if (motsA.length !== motsB.length) return false;
  const setA = new Set(motsA), setB = new Set(motsB);
  if (setA.size !== setB.size) return false;
  for (const w of setA) if (!setB.has(w)) return false;
  return true;
}

const browser = await chromium.launch();
const page = await browser.newPage();

// ---- 1. Liste des clubs du groupe (page classement) ----
await page.goto(classementUrl, { waitUntil: 'networkidle', timeout: 60000 });
const clubsGroupe = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/equipe/"]')]
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.text && l.href);
  return [...new Map(liens.map((l) => [l.href, l])).values()];
});
console.log(`${clubsGroupe.length} club(s) trouvé(s) dans le groupe.`);

// ---- 2. Joueurs FootLight, groupés par club correspondant ----
const { data: joueursFootlight, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

const clubsAVisiter = clubsGroupe.filter((c) =>
  (joueursFootlight || []).some((j) => clubsCorrespondent(j.club, c.text))
);
console.log(`${clubsAVisiter.length} club(s) du groupe ont au moins un joueur FootLight : ${clubsAVisiter.map((c) => c.text).join(', ') || '(aucun)'}`);

if (!clubsAVisiter.length) {
  await browser.close();
  console.log('Rien à faire.');
  process.exit(0);
}

let totalMaj = 0, totalAmbigus = 0;

for (const club of clubsAVisiter) {
  const effectifUrl = new URL(club.href.replace(/\/?$/, '/') + 'effectif/', classementUrl).toString();
  console.log(`\n--- ${club.text} (${effectifUrl}) ---`);
  try {
    await page.goto(effectifUrl, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.log(`  Échec chargement : ${e.message}`);
    continue;
  }

  const pageTitle = await page.title();
  const titreMatch = pageTitle.match(/^Football:\s*(.+?)\s*-\s*effectif/i);
  const clubFlashscore = titreMatch ? titreMatch[1].trim() : club.text;

  // "networkidle" ne garantit pas que le widget d'effectif (chargé par un
  // appel JS séparé) a fini de s'hydrater — en pratique, ça se voit surtout
  // en navigations répétées dans la même page (boucle sur plusieurs clubs) :
  // sans cette attente explicite, l'extraction retombe à 0 joueur.
  const rendu = await page.waitForSelector('.lineupTable--soccer', { timeout: 15000 }).then(() => true).catch(() => false);
  if (!rendu) console.log('  Tableau d\'effectif non détecté après attente, tentative d\'extraction quand même.');

  const effectif = await page.evaluate(() => {
    const num = (el) => { if (!el) return null; const t = el.textContent.trim(); return t === '' ? null : parseInt(t, 10); };
    const groupes = [...document.querySelectorAll('.lineupTable--soccer')];
    return groupes.flatMap((groupe) => {
      const rows = [...groupe.querySelectorAll('.lineupTable__row')];
      return rows.map((row) => {
        const nameEl = row.querySelector('.lineupTable__cell--name');
        return {
          nom_complet: nameEl?.textContent.trim() || null,
          lien_fiche: nameEl?.getAttribute('href') || null,
          matchs_joues: num(row.querySelector('.lineupTable__cell--matchesPlayed')),
          minutes: num(row.querySelector('.lineupTable__cell--minutesPlayed')),
          buts: num(row.querySelector('.lineupTable__cell--goal')),
          passes_decisives: num(row.querySelector('.lineupTable__cell--assist')),
          cartons_jaunes: num(row.querySelector('.lineupTable__cell--yellowCard')),
          cartons_rouges: num(row.querySelector('.lineupTable__cell--redCard')),
        };
      });
    }).filter((j) => j.nom_complet);
  });
  const effectifDedup = [...new Map(effectif.map((j) => [j.lien_fiche || j.nom_complet, j])).values()];
  console.log(`  ${effectif.length} ligne(s) brutes, ${effectifDedup.length} joueur(s) unique(s).`);

  const candidats = (joueursFootlight || []).filter((j) => clubsCorrespondent(j.club, clubFlashscore));
  for (const joueur of candidats) {
    const motsJoueur = motsNom(`${joueur.prenom} ${joueur.nom}`);
    const correspondances = effectifDedup.filter((j) => memeNom(motsNom(j.nom_complet), motsJoueur));

    if (correspondances.length === 0) {
      console.log(`  ${joueur.prenom} ${joueur.nom} : aucune correspondance, ignoré.`);
      continue;
    }
    if (correspondances.length > 1) {
      console.log(`  ${joueur.prenom} ${joueur.nom} : ${correspondances.length} correspondances ambiguës, ignoré.`);
      totalAmbigus++;
      continue;
    }
    const stats = correspondances[0];
    const ligne = {
      joueur_id: joueur.id, saison, source: 'flashscore', club: clubFlashscore,
      matchs_joues: stats.matchs_joues, minutes: stats.minutes, buts: stats.buts,
      passes_decisives: stats.passes_decisives, cartons_jaunes: stats.cartons_jaunes, cartons_rouges: stats.cartons_rouges,
      lien_source: stats.lien_fiche ? new URL(stats.lien_fiche, 'https://www.flashscore.fr').toString() : null,
      updated_at: new Date().toISOString(),
    };
    console.log(`  ${joueur.prenom} ${joueur.nom} : matchs=${stats.matchs_joues ?? '-'}, min=${stats.minutes ?? '-'}, buts=${stats.buts ?? '-'}, passes_d=${stats.passes_decisives ?? '-'}, cj=${stats.cartons_jaunes ?? '-'}, cr=${stats.cartons_rouges ?? '-'}`);
    totalMaj++;
    if (!dryRun) {
      const { error: upErr } = await supabase.from('stats_officielles').upsert(ligne, { onConflict: 'joueur_id,saison,source' });
      if (upErr) console.log(`    Erreur écriture : ${upErr.message}`);
    }
  }
}

await browser.close();
console.log(`\nRésumé : ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
