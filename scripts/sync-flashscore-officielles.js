// Synchronise les stats de saison "officielles" (flashscore.fr) vers la
// table stats_officielles, pour les joueurs FootLight dont le club
// correspond. Table dédiée et séparée de joueurs/stats_saisons/matchs_joueur
// (jamais touchées) : ces stats sont un résumé affiché en complément sur le
// profil, pas une source qui écrase ce que le joueur a saisi lui-même.
//
// Sécurité : DRY_RUN=true par défaut. Il faut positionner explicitement
// DRY_RUN=false pour écrire.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL;
const saison = process.env.SAISON;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
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
function motsNom(str) {
  return normaliser(str).split(' ').filter(Boolean);
}
function memeNom(motsA, motsB) {
  if (motsA.length !== motsB.length) return false;
  const setA = new Set(motsA), setB = new Set(motsB);
  if (setA.size !== setB.size) return false;
  for (const w of setA) if (!setB.has(w)) return false;
  return true;
}

// ---- 1. Scraping flashscore (navigateur) ----
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

const pageTitle = await page.title();
const titreMatch = pageTitle.match(/^Football:\s*(.+?)\s*-\s*effectif/i);
const clubFlashscore = titreMatch ? titreMatch[1].trim() : null;
if (!clubFlashscore) { console.error(`Impossible d'extraire le nom du club depuis le titre : "${pageTitle}"`); process.exit(1); }
console.log(`Club flashscore : "${clubFlashscore}"`);

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
await browser.close();
console.log(`${effectif.length} joueur(s) extrait(s) de flashscore.`);

// ---- 2. Joueurs FootLight du club correspondant ----
const { data: joueursFootlight, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

const candidats = (joueursFootlight || []).filter((j) => clubsCorrespondent(j.club, clubFlashscore));
console.log(`${candidats.length} joueur(s) FootLight du club "${clubFlashscore}" (sur ${joueursFootlight?.length || 0} au total).`);

if (!candidats.length) {
  console.log('Aucun joueur FootLight pour ce club, rien à faire.');
  process.exit(0);
}

// ---- 3. Rapprochement par nom ----
let totalMaj = 0, totalAmbigus = 0, totalSansDonnees = 0;
for (const joueur of candidats) {
  const motsJoueur = motsNom(`${joueur.prenom} ${joueur.nom}`);
  const correspondances = effectif.filter((j) => memeNom(motsNom(j.nom_complet), motsJoueur));

  if (correspondances.length === 0) {
    console.log(`${joueur.prenom} ${joueur.nom} : aucune correspondance dans l'effectif flashscore, ignoré.`);
    continue;
  }
  if (correspondances.length > 1) {
    console.log(`${joueur.prenom} ${joueur.nom} : ${correspondances.length} correspondances ambiguës, ignoré.`);
    totalAmbigus++;
    continue;
  }
  const stats = correspondances[0];
  if ([stats.matchs_joues, stats.minutes, stats.buts, stats.passes_decisives, stats.cartons_jaunes, stats.cartons_rouges].every((v) => v == null)) {
    totalSansDonnees++;
  }

  const ligne = {
    joueur_id: joueur.id,
    saison,
    source: 'flashscore',
    club: clubFlashscore,
    matchs_joues: stats.matchs_joues,
    minutes: stats.minutes,
    buts: stats.buts,
    passes_decisives: stats.passes_decisives,
    cartons_jaunes: stats.cartons_jaunes,
    cartons_rouges: stats.cartons_rouges,
    lien_source: stats.lien_fiche ? new URL(stats.lien_fiche, 'https://www.flashscore.fr').toString() : null,
    updated_at: new Date().toISOString(),
  };

  console.log(`${joueur.prenom} ${joueur.nom} : matchs=${stats.matchs_joues ?? '-'}, min=${stats.minutes ?? '-'}, buts=${stats.buts ?? '-'}, passes_d=${stats.passes_decisives ?? '-'}, cj=${stats.cartons_jaunes ?? '-'}, cr=${stats.cartons_rouges ?? '-'}`);
  totalMaj++;

  if (!dryRun) {
    const { error: upErr } = await supabase.from('stats_officielles').upsert(ligne, { onConflict: 'joueur_id,saison,source' });
    if (upErr) console.log(`  Erreur écriture : ${upErr.message}`);
  }
}

console.log(`\nRésumé : ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'} (dont ${totalSansDonnees} sans aucune donnée chiffrée), ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
