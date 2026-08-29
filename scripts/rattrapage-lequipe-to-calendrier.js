// Rattrapage à la demande du CALENDRIER (lequipe.fr -> calendrier_officiel)
// sur une ou plusieurs journées passées d'une compétition précisées à la
// main — même principe que rattrapage-lequipe-match-stats.js, mais pour
// remplir calendrier_officiel plutôt que les stats de match.
//
// Découvert en pratique : FC Limonest (National 1 groupe C) n'avait
// qu'UNE seule ligne dans tout calendrier_officiel (le seul match où son
// nom apparaissait littéralement) — sync-lequipe-scheduled.yml ne
// synchronise que la journée courante chaque jour, donc un club dont le
// rapprochement échouait par le passé (avant la correction du
// rapprochement club, voir la synchro calendrier canonique) reste
// durablement absent des journées déjà passées tant que personne ne les
// rejoue manuellement.
//
// Chaque journée a une URL stable sur lequipe.fr, ex:
//   .../page-calendrier-resultats/1re-journee
//   .../page-calendrier-resultats/2e-journee
// (même pattern que rattrapage-lequipe-match-stats.js).
//
// Sécurité : DRY_RUN=true par défaut.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const competitionUrl = (process.env.COMPETITION_URL || '').replace(/\/+$/, '');
const journeesSpec = process.env.JOURNEES;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!competitionUrl) { console.error('COMPETITION_URL manquant (ex: https://www.lequipe.fr/Football/national-1-groupe-c/page-calendrier-resultats).'); process.exit(1); }
if (!journeesSpec) { console.error('JOURNEES manquant (ex: "3", "1-5", "1,2,7-9").'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

function parseJournees(spec) {
  const journees = new Set();
  for (const partie of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const plage = partie.match(/^(\d+)-(\d+)$/);
    if (plage) {
      const [, debut, fin] = plage.map(Number);
      for (let j = Math.min(debut, fin); j <= Math.max(debut, fin); j++) journees.add(j);
    } else if (/^\d+$/.test(partie)) {
      journees.add(Number(partie));
    } else {
      console.error(`Entrée JOURNEES invalide : "${partie}" (attendu : nombre ou plage "1-5").`);
      process.exit(1);
    }
  }
  return [...journees].sort((a, b) => a - b);
}
function ordinalJournee(n) {
  return n === 1 ? '1re-journee' : `${n}e-journee`;
}

// Les journées éloignées de la date du jour affichent le mois abrégé
// ("samedi 19 sept.") plutôt qu'en toutes lettres — sans ces clés
// abrégées, calculerDateMatch échoue et la journée entière est ignorée
// (constaté : 23 journées sur 34 échouaient ainsi lors du rattrapage).
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
  if (!dateTexte || !saison) return null;
  const m = dateTexte.match(/(\d{1,2})\s+([a-zéû]+)/i);
  if (!m) return null;
  const jour = parseInt(m[1], 10);
  const mois = MOIS_FR[m[2].toLowerCase()];
  if (!mois) return null;
  const [anneeDebut, anneeFin] = saison.split('-').map(Number);
  const annee = mois >= 7 ? anneeDebut : anneeFin;
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
function mapDivision(competitionLabel) {
  if (!competitionLabel) return null;
  const s = competitionLabel.toLowerCase();
  if (s.includes('national 1')) return 'N1';
  if (s.includes('national 2')) return 'N2';
  if (s.includes('ligue 3')) return 'Ligue 3';
  if (s.includes('national')) return 'Ligue 3';
  return null;
}
function extraireGroupe(competitionLabel) {
  if (!competitionLabel) return null;
  const m = competitionLabel.match(/groupe\s+([a-z0-9]+)/i);
  if (m) return m[1].toUpperCase();
  return competitionLabel.toLowerCase().includes('ligue 3') ? 'Unique' : null;
}
// ── Copie fidèle de la logique canonique de rapprochement club ──
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
  alenconnaise: 'alencon',
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
// ── Fin de la copie ──

async function syncJournee(url, supabase) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });
  if (!res.ok) { console.error(`  Échec : statut ${res.status}`); return { erreur: true }; }
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

  console.log(`  Compétition : ${competitionLabel} → division : ${division}, groupe : ${groupe}`);
  console.log(`  Journée : "${journeeLabel}" → ${journee} | Date : "${dateCaption}" → ${dateMatch} | Saison : ${saison}`);

  if (!division || !groupe || !journee || !dateMatch || !saison) {
    console.error('  Impossible de déterminer division/groupe/journée/date/saison — journée ignorée.');
    return { erreur: true };
  }

  const matchs = [];
  $('.TeamScore').each((i, el) => {
    const $match = $(el);
    const home = $match.find('.TeamScore__team--home').first().text().trim() || null;
    const away = $match.find('.TeamScore__team')
      .filter((j, teamEl) => !$(teamEl).hasClass('TeamScore__team--home'))
      .first().text().trim() || null;
    if (home && away) matchs.push({ equipe_domicile: home, equipe_exterieur: away, date_match: dateMatch, division, groupe, journee, saison });
  });
  console.log(`  ${matchs.length} match(s) trouvé(s) sur la page.`);
  if (!matchs.length) return { inserted: 0, skipped: 0, errors: 0 };

  const { data: existants, error: existantsErr } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur')
    .eq('division', division).eq('groupe', groupe).eq('saison', saison).eq('date_match', dateMatch);
  if (existantsErr) { console.error(`  Erreur lecture existants : ${existantsErr.message}`); return { erreur: true }; }

  let inserted = 0, skipped = 0, errors = 0;
  for (const m of matchs) {
    const dejaPresent = (existants || []).some((e) => clubsCorrespondent(e.equipe_domicile, m.equipe_domicile) && clubsCorrespondent(e.equipe_exterieur, m.equipe_exterieur));
    if (dejaPresent) { console.log(`    Déjà présent : ${m.equipe_domicile} vs ${m.equipe_exterieur}`); skipped++; continue; }
    console.log(`    ${dryRun ? 'À insérer' : 'Insertion'} : ${m.equipe_domicile} vs ${m.equipe_exterieur} (${m.date_match})`);
    if (!dryRun) {
      const { error: insertError } = await supabase.from('calendrier_officiel').insert([m]);
      if (insertError) { console.error(`      Erreur : ${insertError.message}`); errors++; continue; }
    }
    inserted++;
  }
  return { inserted, skipped, errors };
}

const journees = parseJournees(journeesSpec);
console.log(`${journees.length} journée(s) à traiter : ${journees.join(', ')}\n`);
const supabase = createClient(supabaseUrl, supabaseKey);

let totalInserted = 0, totalSkipped = 0, totalErrors = 0, echecs = 0;
for (const j of journees) {
  const url = `${competitionUrl}/${ordinalJournee(j)}`;
  console.log(`\n========== Journée ${j} (${url}) ==========`);
  const resultat = await syncJournee(url, supabase);
  if (resultat.erreur) { echecs++; continue; }
  totalInserted += resultat.inserted;
  totalSkipped += resultat.skipped;
  totalErrors += resultat.errors;
}

console.log(`\n========== Résumé global (${journees.length} journée(s), ${echecs} échec(s) de lecture) ==========`);
console.log(`${totalInserted} ligne(s) ${dryRun ? 'à insérer' : 'insérée(s)'}, ${totalSkipped} déjà présente(s), ${totalErrors} erreur(s) d'insertion.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
