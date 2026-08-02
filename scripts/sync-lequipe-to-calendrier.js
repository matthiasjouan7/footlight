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
  if (s.includes('national')) return 'Ligue 3'; // "National" seul = 3e tier, appelé "Ligue 3" côté FootLight
  return null;
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

const pageTitle = $('title').text().trim();
const saisonMatch = pageTitle.match(/(\d{4})-(\d{4})/);
const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;

const division = mapDivision(competitionLabel);
const dateMatch = calculerDateMatch(dateCaption, saison);

console.log(`Compétition : ${competitionLabel} → division : ${division}`);
console.log(`Date : "${dateCaption}" (saison ${saison}) → ${dateMatch}`);

if (!division || !dateMatch || !saison) {
  console.error('Impossible de déterminer division/date/saison — abandon.');
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
    matchs.push({ equipe_domicile: home, equipe_exterieur: away, date_match: dateMatch, division, saison });
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

for (const m of matchs) {
  const { data: existing, error: selectError } = await supabase
    .from('calendrier_officiel')
    .select('id')
    .eq('equipe_domicile', m.equipe_domicile)
    .eq('equipe_exterieur', m.equipe_exterieur)
    .eq('date_match', m.date_match)
    .limit(1);

  if (selectError) {
    console.error(`Erreur lecture pour ${m.equipe_domicile} vs ${m.equipe_exterieur} : ${selectError.message}`);
    errors++;
    continue;
  }

  if (existing && existing.length > 0) {
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
