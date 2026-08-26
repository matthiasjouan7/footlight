// Logique partagée de rapprochement des stats de match (lequipe.fr ->
// matchs_joueur), utilisée par :
// - sync-lequipe-match-stats.js (cron hebdomadaire, une seule journée : celle
//   affichée par défaut sur la page calendrier-resultats de la compétition)
// - rattrapage-lequipe-match-stats.js (rattrapage à la demande sur une ou
//   plusieurs journées passées, ex: joueur ajouté après plusieurs journées
//   déjà jouées)
import * as cheerio from 'cheerio';

const HEADERS_LEQUIPE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// lequipe.fr peut occasionnellement ne jamais répondre à une requête ;
// fetch() n'a pas de timeout par défaut, ce qui bloquerait tout le script
// (et le job GitHub Actions) indéfiniment — déjà rencontré sur
// foot-direct.com (voir calcule-impact-banc.js, même correctif).
async function fetchAvecTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: HEADERS_LEQUIPE, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const MOIS_FR = {
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
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
  // La page Ligue 3 de lequipe.fr a pour libellé de compétition "Ligue 3"
  // (pas "National"), sans quoi division/groupe ne sont jamais déterminés.
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

// Récupère division/groupe/saison d'une compétition à partir de sa page
// calendrier-resultats de base (sans suffixe de journée), pour permettre à
// sync-lequipe-match-stats-auto.js de déterminer quelles journées rattraper
// sans avoir à les connaître à l'avance.
// "1re journée", "2e journée", ..., "34e journée" -> "1re-journee", "2e-journee", ...
export function ordinalJournee(n) {
  return n === 1 ? '1re-journee' : `${n}e-journee`;
}

export async function detecterCompetition(baseUrl) {
  let res;
  try {
    res = await fetchAvecTimeout(baseUrl);
  } catch (err) {
    console.error(`Échec chargement ${baseUrl} : ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const competitionLabel = $('script[type="application/ld+json"]')
    .map((i, el) => { try { return JSON.parse($(el).html()); } catch (e) { return null; } })
    .get()
    .find((j) => j && j['@type'] === 'BreadcrumbList')
    ?.itemListElement?.at(-1)?.item?.name || null;
  const pageTitle = $('title').text().trim();
  const saisonMatch = pageTitle.match(/(\d{4})-(\d{4})/);
  const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;
  const division = mapDivision(competitionLabel);
  const groupe = extraireGroupe(competitionLabel);
  return { division, groupe, saison };
}

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliser(`${prenom[0]}. ${nom}`);
}

// Rapprochement flou des noms de club — même logique que clubWordsMatch()
// dans generer-calendriers-existants.js / footlight-modifier-profil.html /
// footlight-inscription-joueur.html (à garder synchronisée avec ces
// copies) : la page calendrier-resultats de lequipe.fr affiche des noms
// courts ou d'usage ("Caen", "Saint-Brieuc", "Limonest") alors que
// calendrier_officiel stocke souvent des noms officiels longs, des
// adjectifs démonymes ou des sigles ("SM CAEN", "Stade Briochin",
// "FCLDSD") — une simple égalité stricte, voire un recoupement de mots
// naïf, rate ces cas faute de mot commun.
function normaliserClub(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim()
    // Suffixe d'équipe réserve : le nom officiel (calendrier_officiel) le
    // note en chiffre ("FC Lorient 2"), lequipe.fr en lettre ("Lorient B")
    // — sans ce retrait les deux ne partagent plus aucun mot en commun.
    .replace(/\s(\d{1,2}|[bc])$/, '');
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'sas', 'sr', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const MOTS_REMPLACEMENT_CLUB = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee',
};
// Sigles/noms d'usage sans aucun mot en commun avec le nom officiel
// correspondant, même après remplacement — repérés en pratique (les
// joueurs de ces clubs n'avaient jamais de score synchronisé, la synchro
// ne retrouvant jamais la bonne ligne calendrier_officiel).
const CLUB_SYNONYMES_COMPLETS_STATS = {
  fcldsd: { mots: ['limonest'], elargi: false },
  goal: { mots: ['grand', 'ouest', 'associat'], elargi: false },
  'poire vendee': { mots: ['poire', 'vie'], elargi: false },
  // "Racing Club France" -> "racing"/"club" génériques, ne reste que
  // "france" ; lequipe.fr affiche "Racing CF", qui ne reste réduit qu'à
  // "cf" (non générique) — aucun mot commun sans ce synonyme.
  france: { mots: ['cf'], elargi: false },
};
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => MOTS_REMPLACEMENT_CLUB[w] || w);
  const sansGeneriques = remplaces.filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function signatureClub(s) {
  const cle = motsClub(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function motsClubElargi(s) {
  const mots = motsClub(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubsCorrespondent(a, b) {
  const sigA = signatureClub(a), sigB = signatureClub(b);
  if (sigA && sigB && sigA === sigB) return true;
  const wa = motsClubElargi(a), wb = motsClubElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const [small, big] = wa.length <= wb.length ? [setA, setB] : [setB, setA];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

// Même logique que contributionMatch() dans footlight-modifier-profil.html :
// répercute la fiche d'un match sur le total de saison du joueur, en ne
// comptant "matchs_joues"/titularisations/remplaçant/clean_sheet que si le
// match a réellement été joué ("minutes_jouees" renseigné) — une fiche
// générée à l'avance depuis le calendrier officiel existe déjà, bien avant
// le coup d'envoi, avec tout à null.
function contributionMatch(m) {
  const n = (v) => (v == null ? 0 : v);
  if (!m) {
    return { matchs_joues: 0, titularisations: 0, matchs_remplacant: 0, buts: 0, passes_decisives: 0, minutes_jouees: 0, cartons_jaunes: 0, cartons_rouges: 0, buts_encaisses_avec: 0, clean_sheets: 0 };
  }
  const joue = m.minutes_jouees != null;
  return {
    matchs_joues: joue ? 1 : 0,
    titularisations: joue && m.titulaire === true ? 1 : 0,
    matchs_remplacant: joue && m.titulaire === false ? 1 : 0,
    buts: n(m.buts),
    passes_decisives: n(m.passes_decisives),
    minutes_jouees: n(m.minutes_jouees),
    cartons_jaunes: n(m.cartons_jaunes),
    cartons_rouges: n(m.cartons_rouges),
    buts_encaisses_avec: n(m.buts_encaisses_avec),
    clean_sheets: joue && !!m.clean_sheet ? 1 : 0,
  };
}
export async function syncMatchStats(targetUrl, supabase, dryRun) {
  // joueurSaison : saison en cours du joueur (joueurs.saison), pour choisir
  // entre joueurs (saison en cours) et stats_saisons (saison passée), comme
  // côté client.
  //
  // Recalcule le total de saison à partir de TOUTES les lignes matchs_joueur
  // du joueur pour cette saison (plutôt que d'ajouter un delta au-dessus
  // d'une valeur lue séparément) : un lecture-puis-écriture en delta n'est
  // pas atomique et double-compte si deux exécutions de synchro se
  // chevauchent (constaté en pratique le 25/08 — plusieurs joueurs de N1
  // avec matchs_joues=2 pour 1 seul match réellement joué, alors qu'une
  // seule ligne matchs_joueur existait). Un recalcul complet est lui
  // idempotent : deux exécutions concurrentes lisent le même état réel de
  // matchs_joueur et écrivent le même résultat, sans jamais s'additionner.
  async function recalculerAgregatsSaison(joueurId, joueurSaison, saisonFiche) {
    const { data: matchs, error: errMatchs } = await supabase
      .from('matchs_joueur')
      .select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges, buts_encaisses_avec, clean_sheet')
      .eq('joueur_id', joueurId)
      .eq('saison', saisonFiche);
    if (errMatchs) return;
    const totaux = (matchs || []).reduce((acc, m) => {
      const c = contributionMatch(m);
      Object.keys(c).forEach((k) => { acc[k] = (acc[k] || 0) + c[k]; });
      return acc;
    }, {});
    const isCurrentSeason = saisonFiche === (joueurSaison || '2026-2027');
    if (isCurrentSeason) {
      await supabase.from('joueurs').update(totaux).eq('id', joueurId);
    } else {
      await supabase.from('stats_saisons').upsert({ joueur_id: joueurId, saison: saisonFiche, ...totaux }, { onConflict: 'joueur_id,saison' });
    }
  }

  // ---- 1. Page calendrier : liste des rencontres + lien vers chaque match ----
  let resCal;
  try {
    resCal = await fetchAvecTimeout(targetUrl);
  } catch (err) {
    console.error(`Échec chargement calendrier : ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    return null;
  }
  if (!resCal.ok) {
    console.error(`Échec chargement calendrier : statut ${resCal.status}`);
    return null;
  }
  const htmlCal = await resCal.text();
  const $cal = cheerio.load(htmlCal);

  const competitionLabel = $cal('script[type="application/ld+json"]')
    .map((i, el) => { try { return JSON.parse($cal(el).html()); } catch (e) { return null; } })
    .get()
    .find((j) => j && j['@type'] === 'BreadcrumbList')
    ?.itemListElement?.at(-1)?.item?.name || null;
  // Une journée peut être étalée sur plusieurs jours (ex: vendredi +
  // samedi) : la page affiche alors PLUSIEURS légendes de date, une par
  // groupe de matchs. Ne garder que la première ratait les matchs des
  // jours suivants (leur ligne calendrier_officiel n'était jamais
  // retrouvée) — on calcule donc une date min/max couvrant toute la
  // journée plutôt qu'une égalité stricte sur une seule date.
  const datesCaptions = $cal('.caption.caption--small')
    .filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($cal(el).text()))
    .map((i, el) => $cal(el).text().trim())
    .get();
  const pageTitleCal = $cal('title').text().trim();
  const saisonMatch = pageTitleCal.match(/(\d{4})-(\d{4})/);
  const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;
  const division = mapDivision(competitionLabel);
  const groupe = extraireGroupe(competitionLabel);
  const datesMatchJournee = [...new Set(datesCaptions.map((d) => calculerDateMatch(d, saison)).filter(Boolean))].sort();
  const dateMatchJourneeMin = datesMatchJournee[0] || null;
  const dateMatchJourneeMax = datesMatchJournee[datesMatchJournee.length - 1] || null;

  console.log(`Compétition : ${competitionLabel} -> ${division} groupe ${groupe}, saison ${saison}, date(s) ${datesMatchJournee.join(', ') || '(aucune)'}`);

  if (!division || !saison || !dateMatchJourneeMin) {
    console.error('Impossible de déterminer division/saison/date — abandon pour cette URL.');
    return null;
  }

  const rencontres = [];
  $cal('.TeamScore').each((i, el) => {
    const $el = $cal(el);
    const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
    const away = $el.find('.TeamScore__team').filter((j, t) => !$cal(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
    if (!home || !away) return;

    let $ancestor = $el;
    let href = null;
    for (let depth = 0; depth < 6 && !href; depth++) {
      $ancestor = $ancestor.parent();
      if (!$ancestor.length) break;
      const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
      if ($link.length) href = $link.attr('href');
    }
    if (href) rencontres.push({ equipe_domicile: home, equipe_exterieur: away, matchUrl: new URL(href, targetUrl).toString() });
  });

  console.log(`${rencontres.length} rencontre(s) avec lien match-direct sur la page.`);

  let totalJoueursLies = 0, totalMaj = 0, totalDejaRenseignes = 0, totalAmbigus = 0;

  // Une seule lecture pour toute la journée (au lieu d'une requête par match) :
  // permet le rapprochement flou par club plutôt qu'une égalité stricte.
  const { data: calRowsJournee, error: calErrJournee } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur')
    .eq('division', division)
    .eq('groupe', groupe)
    .eq('saison', saison)
    .gte('date_match', dateMatchJourneeMin)
    .lte('date_match', dateMatchJourneeMax);
  if (calErrJournee) {
    console.error(`Erreur lecture calendrier_officiel : ${calErrJournee.message}`);
    return null;
  }

  for (const r of rencontres) {
    // ---- 2. Retrouver la ligne calendrier_officiel correspondante ----
    const calRow = (calRowsJournee || []).find((c) =>
      clubsCorrespondent(c.equipe_domicile, r.equipe_domicile) && clubsCorrespondent(c.equipe_exterieur, r.equipe_exterieur)
    );
    if (!calRow) continue;
    const calendrierOfficielId = calRow.id;

    // ---- 3. Joueurs FootLight ayant lié ce match ----
    const { data: mj, error: mjErr } = await supabase
      .from('matchs_joueur')
      .select('id, joueur_id, saison, domicile, titulaire, buts, cartons_jaunes, cartons_rouges, minutes_jouees, clean_sheet')
      .eq('calendrier_officiel_id', calendrierOfficielId);
    if (mjErr || !mj || !mj.length) continue;

    console.log(`\n--- ${r.equipe_domicile} vs ${r.equipe_exterieur} : ${mj.length} joueur(s) FootLight lié(s) ---`);
    totalJoueursLies += mj.length;

    const { data: joueursData } = await supabase
      .from('joueurs')
      .select('id, prenom, nom, saison')
      .in('id', [...new Set(mj.map((m) => m.joueur_id))]);
    const joueursById = new Map((joueursData || []).map((j) => [j.id, j]));

    // ---- 4. Buts/cartons du match ----
    let resMatch;
    try {
      resMatch = await fetchAvecTimeout(r.matchUrl);
    } catch (err) {
      console.log(`  Échec chargement page match (${err.name === 'AbortError' ? 'timeout' : err.message}), ignoré.`);
      continue;
    }
    if (!resMatch.ok) { console.log(`  Échec chargement page match (${resMatch.status}), ignoré.`); continue; }
    const htmlMatch = await resMatch.text();
    const decoded = htmlMatch
      .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    function extractBalancedObject(text, keyPattern) {
      const m = text.match(keyPattern);
      if (!m) return null;
      const start = m.index + m[0].length - 1;
      let depth = 0, inString = false, escaped = false;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (c === '\\') escaped = true;
          else if (c === '"') inString = false;
          continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
      }
      return null;
    }

    // Repli score seul : certains matchs (couverture éditoriale minimale
    // côté lequipe.fr) n'ont jamais de bloc "specifics" JSON exploitable
    // (buts/cartons/minutes par joueur indisponibles), mais le score final
    // reste, lui, toujours affiché dans le DOM (.TeamScore__score--ended).
    // Plutôt que d'ignorer tout le match, applique au moins ce score à
    // toutes les lignes matchs_joueur liées.
    async function appliquerScoreDepuisDom() {
      const $m = cheerio.load(decoded);
      const texteScore = $m('.TeamScore__score--ended').first().text().trim();
      const mScore = texteScore.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!mScore) return false;
      const butsDom = parseInt(mScore[1], 10);
      const butsExt = parseInt(mScore[2], 10);
      for (const row of mj) {
        const joueur = joueursById.get(row.joueur_id);
        if (!joueur || row.score_pour != null || row.score_contre != null) continue;
        const scorePour = row.domicile ? butsDom : butsExt;
        const scoreContre = row.domicile ? butsExt : butsDom;
        console.log(`  ${joueur.prenom} ${joueur.nom} : score (repli DOM): ${scorePour}-${scoreContre}`);
        totalMaj++;
        if (!dryRun) {
          const { error: updErr } = await supabase.from('matchs_joueur').update({ score_pour: scorePour, score_contre: scoreContre }).eq('id', row.id);
          if (updErr) { console.log(`    Erreur écriture : ${updErr.message}`); continue; }
          await recalculerAgregatsSaison(row.joueur_id, joueur.saison, row.saison);
        }
      }
      return true;
    }

    const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
    if (!specificsRaw) {
      console.log('  Objet "specifics" introuvable.');
      if (!(await appliquerScoreDepuisDom())) console.log('  Score DOM introuvable non plus, ignoré.');
      continue;
    }
    let specifics;
    try { specifics = JSON.parse(specificsRaw); }
    catch (e) {
      console.log(`  Échec JSON.parse : ${e.message}.`);
      if (!(await appliquerScoreDepuisDom())) console.log('  Score DOM introuvable non plus, ignoré.');
      continue;
    }

    const finMatch = specifics.prolongation ? 120 : 90;

    function evenementsCote(side) {
      const buts = (side?.buts || []).map((b) => ({ abrege: normaliser(b.joueur?.nom_abrege), nomComplet: b.joueur?.nom_complet }));
      const jaunes = (side?.cartons || []).filter((c) => c.type === 'jaune').map((c) => normaliser(c.joueur?.nom_abrege));
      const rouges = (side?.cartons || []).filter((c) => c.type === 'rouge').map((c) => normaliser(c.joueur?.nom_abrege));
      const sportifsParAbrege = new Map();
      (side?.sportifs || []).forEach((s) => {
        const a = normaliser(s.nom_abrege);
        sportifsParAbrege.set(a, [...(sportifsParAbrege.get(a) || []), s.id]);
      });
      const titulaires = new Set(side?.ids_titulaires || []);
      const remplacants = new Set(side?.ids_remplacants || []);
      const remplacements = side?.remplacements || [];
      return { buts, jaunes, rouges, sportifsParAbrege, titulaires, remplacants, remplacements };
    }
    const evtDomicile = evenementsCote(specifics.domicile);
    const evtExterieur = evenementsCote(specifics.exterieur);
    // Score final : nombre de buteurs de chaque côté (déjà extraits
    // ci-dessus pour les buts individuels). Contrairement aux buts/cartons
    // personnels, c'est une info de MATCH, pas de joueur : elle s'applique à
    // toute ligne matchs_joueur liée à ce match, qu'il ait joué ou non — une
    // ligne existe déjà pour chaque match de l'équipe dès l'inscription
    // (voir generer-calendriers-existants.js), pas besoin d'un scraper
    // séparé pour connaître les résultats complets de la saison.
    const butsDom = evtDomicile.buts.length;
    const butsExt = evtExterieur.buts.length;

    // Minutes jouées : pas de champ direct sur lequipe.fr — calculées à
    // partir des titulaires/remplaçants et des instants d'entrée/sortie.
    function minutesJouees(cote, sportifId) {
      if (cote.titulaires.has(sportifId)) {
        const sortie = cote.remplacements.find((r) => r.sortant?.id === sportifId);
        return sortie ? parseInt(sortie.instant?.date, 10) : finMatch;
      }
      if (cote.remplacants.has(sportifId)) {
        const entree = cote.remplacements.find((r) => r.entrant?.id === sportifId);
        return entree ? finMatch - parseInt(entree.instant?.date, 10) : 0;
      }
      return null;
    }

    // ---- 5. Rapprochement par joueur ----
    for (const row of mj) {
      const joueur = joueursById.get(row.joueur_id);
      if (!joueur) continue;
      const cle = `${joueur.prenom} ${joueur.nom}`;

      const maj = {};
      const details = [];

      // Score du match : indépendant du rapprochement par nom ci-dessous,
      // s'applique même si le joueur n'a pas été identifié dans les
      // événements (bloqué le jour du match, remplaçant non utilisé, etc.).
      if (row.score_pour == null || row.score_contre == null) {
        const scorePour = row.domicile ? butsDom : butsExt;
        const scoreContre = row.domicile ? butsExt : butsDom;
        maj.score_pour = scorePour;
        maj.score_contre = scoreContre;
        details.push(`score: ${scorePour}-${scoreContre}`);
      }

      const attendu = abregeAttendu(joueur.prenom, joueur.nom);
      if (attendu) {
        const cote = row.domicile ? evtDomicile : evtExterieur;

        // Ambiguïté : un autre joueur FootLight du même côté a le même abrégé attendu.
        const ambiguite = mj.some((other) => {
          if (other === row || other.domicile !== row.domicile) return false;
          const autreJoueur = joueursById.get(other.joueur_id);
          return autreJoueur && abregeAttendu(autreJoueur.prenom, autreJoueur.nom) === attendu;
        });
        if (ambiguite) {
          console.log(`  ${cle} : ambigu (plusieurs joueurs FootLight partagent "${attendu}"), ignoré pour buts/cartons/minutes.`);
          totalAmbigus++;
        } else {
          const nbButs = cote.buts.filter((b) => b.abrege === attendu).length;
          const nbJaunes = cote.jaunes.filter((a) => a === attendu).length;
          const nbRouges = cote.rouges.filter((a) => a === attendu).length;

          if (nbButs > 0) {
            if (row.buts == null) { maj.buts = nbButs; details.push(`buts: ${nbButs}`); }
            else { details.push(`buts déjà renseigné (${row.buts}), non modifié malgré ${nbButs} détecté(s)`); totalDejaRenseignes++; }
          }
          if (nbJaunes > 0) {
            if (row.cartons_jaunes == null) { maj.cartons_jaunes = nbJaunes; details.push(`cartons_jaunes: ${nbJaunes}`); }
            else { details.push(`cartons_jaunes déjà renseigné (${row.cartons_jaunes}), non modifié`); totalDejaRenseignes++; }
          }
          if (nbRouges > 0) {
            if (row.cartons_rouges == null) { maj.cartons_rouges = nbRouges; details.push(`cartons_rouges: ${nbRouges}`); }
            else { details.push(`cartons_rouges déjà renseigné (${row.cartons_rouges}), non modifié`); totalDejaRenseignes++; }
          }

          const sportifIds = cote.sportifsParAbrege.get(attendu) || [];
          if (sportifIds.length === 1) {
            const minutes = minutesJouees(cote, sportifIds[0]);
            if (minutes != null) {
              if (row.minutes_jouees == null) { maj.minutes_jouees = minutes; details.push(`minutes_jouees: ${minutes}`); }
              else { details.push(`minutes_jouees déjà renseigné (${row.minutes_jouees}), non modifié malgré ${minutes} calculé`); totalDejaRenseignes++; }
            }
            if (row.titulaire == null) {
              if (cote.titulaires.has(sportifIds[0])) { maj.titulaire = true; details.push('titulaire: true'); }
              else if (cote.remplacants.has(sportifIds[0])) { maj.titulaire = false; details.push('titulaire: false'); }
            }
          } else if (sportifIds.length > 1) {
            details.push(`minutes_jouees/titulaire : ${sportifIds.length} joueurs lequipe.fr partagent l'abrégé "${attendu}", ignoré`);
            totalAmbigus++;
          }
        }
      }

      if (!details.length) continue;
      console.log(`  ${cle} : ${details.join(', ')}`);

      if (Object.keys(maj).length) {
        totalMaj++;
        if (!dryRun) {
          const { error: updErr } = await supabase.from('matchs_joueur').update(maj).eq('id', row.id);
          if (updErr) { console.log(`    Erreur écriture : ${updErr.message}`); continue; }
          await recalculerAgregatsSaison(row.joueur_id, joueur.saison, row.saison);
        } else {
          console.log(`    Total de saison : recalculé après écriture (dry run : pas de calcul détaillé).`);
        }
      }
    }
  }

  console.log(`\nRésumé : ${totalJoueursLies} joueur(s) FootLight lié(s) examiné(s), ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalDejaRenseignes} champ(s) déjà renseigné(s) laissé(s) tel quel, ${totalAmbigus} ambiguïté(s) ignorée(s).`);

  return { totalJoueursLies, totalMaj, totalDejaRenseignes, totalAmbigus };
}
