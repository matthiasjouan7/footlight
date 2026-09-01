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

// Les journées éloignées de la date du jour affichent le mois abrégé
// ("samedi 19 sept.") plutôt qu'en toutes lettres ("16 mai") — sans ces
// clés abrégées, calculerDateMatch échoue silencieusement (mois
// introuvable) et la journée entière est ignorée, constaté en pratique
// sur le rattrapage calendrier (23 journées sur 34 échouaient ainsi).
const MOIS_FR = {
  janvier: 1, janv: 1,
  février: 2, fevr: 2, févr: 2,
  mars: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  août: 8, aout: 8,
  septembre: 9, sept: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  décembre: 12, decembre: 12, dec: 12, déc: 12,
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
  // sur "Unique" par défaut plutôt que d'échouer — doit rester identique à
  // la valeur déjà utilisée par le calendrier Ligue 3 chargé en base
  // (sinon même match inséré deux fois avec un groupe différent, invisible
  // pour nettoyer-doublons-calendrier.js qui groupe par date+division+
  // groupe+saison — constaté en pratique le 07/08 sur SM Caen-Valenciennes).
  if (!competitionLabel) return null;
  const m = competitionLabel.match(/groupe\s+([a-z0-9]+)/i);
  if (m) return m[1].toUpperCase();
  return competitionLabel.toLowerCase().includes('ligue 3') ? 'Unique' : null;
}

// Rapprochement flou des noms de club — une égalité stricte manque les
// lignes déjà présentes sous un autre format (ex: table alimentée à
// l'origine avec des noms officiels longs "US CHANTILLY", alors que
// lequipe.fr affiche des noms courts "Chantilly") : constaté en pratique,
// ça provoquait une réinsertion en double à chaque exécution du cron.
//
// Copie fidèle de la logique canonique (footlight-modifier-profil.html et
// al.) — la version précédente de ce fichier utilisait un rapprochement
// bien plus simple (mots génériques + sous-ensemble strict, sans les
// remplacements st/ste/briochin/bayonnais/vfc/sbfc... ni les synonymes
// complets QRM/ASTDV/Alençon...), ce qui la rendait bien plus permissive à
// rater un match déjà présent sous un nom différent ("Stade Briochin" vs
// "Saint-Brieuc", "Aviron Bayonnais FC" vs "Bayonne", etc.) : constaté en
// pratique, ça faisait réinsérer une ligne "orpheline" à chaque exécution
// du cron dès que lequipe.fr affichait un nom court non couvert par cette
// version simplifiée, créant les mêmes ambiguïtés que
// nettoyer-ambiguites-n1.js corrige après coup pour National 1.
function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas',
  'sr', 'srfa', 'ol', 'om', 'rc',
  'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club',
  'sporting', 'racing', 'stade',
  'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois',
  alenconnaise: 'alencon', raph: 'raphael',
};
const CLUB_SYNONYMES_COMPLETS = {
  qrm: { mots: ['quevilly', 'rouen', 'metropole'], elargi: false },
  astdv: { mots: ['touques', 'deauville', 'trouville', 'villers'], elargi: true },
  alencon: { mots: ['alenconnaise', '61'], elargi: true },
  'anne sainte vertou': { mots: ['ussa'], elargi: true },
  'sables vf': { mots: ['sable', 'vendee'], elargi: false },
  'sable vendee': { mots: ['sable', 'vendee'], elargi: false },
  'sables vendee': { mots: ['sable', 'vendee'], elargi: false },
  'bourgoin j': { mots: ['jallieu'], elargi: true },
  'romorantin so': { mots: ['sologne'], elargi: true },
  // Locminé/Angoulême/Tarbes/Chateaubriant/Grand Ouest Lyonnais : calendrier_officiel
  // utilise des abréviations non reconnues par CLUB_MOTS_REMPLACEMENT pour ces
  // clubs précis (constaté en pratique : joueurs bloqués à 1-3 matchs alors que
  // le calendrier complet existe sous ce nom abrégé).
  'co locmine saint': { mots: ['colomban', 'locmine', 'saint'], elargi: false },
  'angouleme chte': { mots: ['angouleme', 'charente'], elargi: false },
  'pf tarbes': { mots: ['pyrenees', 'tarbes'], elargi: false },
  'chateaubriant volt': { mots: ['voltigeurs', 'chateaubriant'], elargi: false },
  'associat grand ouest': { mots: ['grand', 'ouest', 'association', 'lyonnaise'], elargi: false },
  'berri chateauroux': { mots: ['lb', 'chateauroux'], elargi: false },
};
const CLUB_PAIRES_DISTINCTES = new Set([
  ['apm metz', 'metz'].sort().join('|'),
  ['asptt dijon', 'dijon'].sort().join('|'),
]);
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function clubIdentitySignature(s) {
  const cle = clubWords(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function clubWordsElargi(s) {
  const mots = clubWords(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubsCorrespondent(a, b) {
  const sigA = clubIdentitySignature(a), sigB = clubIdentitySignature(b);
  if (sigA && sigB && sigA === sigB) return true;
  if (sigA && sigB && CLUB_PAIRES_DISTINCTES.has([sigA, sigB].sort().join('|'))) return false;
  const wa = clubWordsElargi(a), wb = clubWordsElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
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
