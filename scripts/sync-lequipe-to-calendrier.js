// Synchronise une page calendrier-resultats de lequipe.fr vers la table
// calendrier_officiel de Supabase.
//
// Sécurité : DRY_RUN=true par défaut — logue ce qui serait fait sans rien
// écrire. Il faut positionner explicitement DRY_RUN=false pour écrire
// réellement en base (nécessite SUPABASE_SERVICE_ROLE_KEY).
//
// calendrier_officiel n'a pas de colonne de score (c'est juste le calendrier
// des rencontres, pas les résultats) : equipe_domicile, equipe_exterieur,
// date_match, division, saison.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}
if (!dryRun && !supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquant (requis hors DRY_RUN).');
  process.exit(1);
}

console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const MOIS_FR = {
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
};

function calculerDateMatch(dateTexte, saison) {
  // dateTexte ex: "samedi 16 mai." — saison ex: "2025-2026"
  if (!dateTexte || !saison) return null;
  const m = dateTexte.match(/(\d{1,2})\s+([a-zéû]+)/i);
  if (!m) return null;
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR[m[2].toLowerCase()];
  if (!mois) return null;
  const [anneeDebut, anneeFin] = saison.split('-').map(Number);
  // Saison d'août à juin/juillet : juillet-décembre -> 1re année, sinon 2e.
  const annee = mois >= 7 ? anneeDebut : anneeFin;
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

function mapDivision(competitionLabel) {
  if (!competitionLabel) return null;
  const s = competitionLabel.toLowerCase();
  if (s.includes('national 1')) return 'N1';
  if (s.includes('national 2')) return 'N2';
  // lequipe.fr a sa propre page "Ligue 3" (/Football/ligue-3/...), à jour
  // pour la saison en cours — l'ancienne page bare "National" (/Football/
  // national/...) qu'on utilisait comme repli n'est elle plus mise à jour.
  if (s.includes('ligue 3')) return 'Ligue 3';
  if (s.includes('national')) return 'Ligue 3';
  return null;
}

function extraireGroupe(competitionLabel) {
  // "National 2 groupe a" -> "A" — calendrier_officiel a une colonne
  // "groupe" obligatoire (découvert via une erreur d'insertion réelle,
  // absente des lectures faites ailleurs dans l'app). Ligue 3 n'a qu'un
  // seul groupe national (pas de "groupe X" dans son libellé) : on retombe
  // sur "A" par défaut plutôt que d'échouer.
  if (!competitionLabel) return null;
  const m = competitionLabel.match(/groupe\s+([a-z0-9]+)/i);
  if (m) return m[1].toUpperCase();
  return competitionLabel.toLowerCase().includes('ligue 3') ? 'A' : null;
}

// Rapprochement flou des noms de club — une égalité stricte manque les
// lignes déjà présentes sous un autre format (ex: table alimentée à
// l'origine avec des noms officiels longs "US CHANTILLY", alors que
// lequipe.fr affiche des noms courts "Chantilly") : constaté en pratique,
// ça provoquait une réinsertion en double à chaque exécution du cron.
function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa']);
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

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
if (!res.ok) {
  console.error(`Échec : statut ${res.status}`);
  process.exit(1);
}
const html = await res.text();
const $ = cheerio.load(html);

const competitionLabel = $('script[type="application/ld+json"]')
  .map((i, el) => { try { return JSON.parse($(el).html()); } catch (e) { return null; } })
  .get()
  .find((j) => j && j['@type'] === 'BreadcrumbList')
  ?.itemListElement?.at(-1)?.item?.name || null;

const dateCaption = $('.caption.caption--small')
  .filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($(el).text()))
  .first().text().trim() || null;

const journeeLabel = $('.SelectNav__label').first().text().trim() || null;
const journeeMatch = journeeLabel ? journeeLabel.match(/(\d+)/) : null;
const journee = journeeMatch ? parseInt(journeeMatch[1], 10) : null;

const pageTitle = $('title').text().trim();
const saisonMatch = pageTitle.match(/(\d{4})-(\d{4})/);
const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;

const division = mapDivision(competitionLabel);
const groupe = extraireGroupe(competitionLabel);
const dateMatch = calculerDateMatch(dateCaption, saison);

console.log(`Compétition : ${competitionLabel} → division : ${division}, groupe : ${groupe}`);
console.log(`Journée : "${journeeLabel}" → ${journee}`);
console.log(`Date : "${dateCaption}" (saison ${saison}) → ${dateMatch}`);

if (!division || !groupe || !journee || !dateMatch || !saison) {
  console.error('Impossible de déterminer division/groupe/journée/date/saison — abandon.');
  process.exit(1);
}

const matchs = [];
$('.TeamScore').each((i, el) => {
  const $match = $(el);
  const home = $match.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $match.find('.TeamScore__team')
    .filter((j, teamEl) => !$(teamEl).hasClass('TeamScore__team--home'))
    .first().text().trim() || null;
  if (home && away) {
    matchs.push({ equipe_domicile: home, equipe_exterieur: away, date_match: dateMatch, division, groupe, journee, saison });
  }
});

console.log(`${matchs.length} match(s) à traiter.`);

if (dryRun) {
  console.log(JSON.stringify(matchs, null, 2));
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);
let inserted = 0, skipped = 0, errors = 0;

// Une seule lecture pour toute la journée (au lieu d'une requête par match) :
// permet le rapprochement flou par club, moins fragile qu'une égalité
// stricte sur des noms qui peuvent varier d'une source à l'autre.
const { data: existants, error: existantsErr } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur')
  .eq('division', division)
  .eq('groupe', groupe)
  .eq('saison', saison)
  .eq('date_match', dateMatch);
if (existantsErr) {
  console.error(`Erreur lecture des matchs existants : ${existantsErr.message}`);
  process.exit(1);
}

for (const m of matchs) {
  const dejaPresent = (existants || []).some((e) =>
    clubsCorrespondent(e.equipe_domicile, m.equipe_domicile) && clubsCorrespondent(e.equipe_exterieur, m.equipe_exterieur)
  );

  if (dejaPresent) {
    console.log(`Déjà présent : ${m.equipe_domicile} vs ${m.equipe_exterieur} (${m.date_match})`);
    skipped++;
    continue;
  }

  const { error: insertError } = await supabase.from('calendrier_officiel').insert([m]);
  if (insertError) {
    console.error(`Erreur insertion pour ${m.equipe_domicile} vs ${m.equipe_exterieur} : ${insertError.message}`);
    errors++;
    continue;
  }
  console.log(`Inséré : ${m.equipe_domicile} vs ${m.equipe_exterieur} (${m.date_match})`);
  inserted++;
}

console.log(`\nRésumé : ${inserted} inséré(s), ${skipped} déjà présent(s), ${errors} erreur(s).`);
