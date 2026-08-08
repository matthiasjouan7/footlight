// Rapproche les buts/cartons/minutes jouées d'un match (lequipe.fr) avec
// les joueurs FootLight qui ont déjà généré ce match dans leur historique
// (via "Générer mon calendrier"), et propose de compléter buts/
// cartons_jaunes/cartons_rouges/minutes_jouees — UNIQUEMENT les champs
// encore vides (on n'écrase jamais une stat que le joueur a saisie
// lui-même). Les minutes jouées ne sont pas un champ direct de lequipe.fr :
// elles sont calculées à partir des titulaires/remplaçants et des
// remplacements (sortant/entrant/minute), vérifié sur un vrai match.
//
// Sécurité : DRY_RUN=true par défaut — logue ce qui serait fait sans rien
// écrire. Il faut positionner explicitement DRY_RUN=false pour écrire.
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
if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquant (nécessaire même en DRY_RUN, pour lire les données existantes).');
  process.exit(1);
}
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

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
  if (s.includes('national')) return 'Ligue 3';
  return null;
}

function extraireGroupe(competitionLabel) {
  if (!competitionLabel) return null;
  const m = competitionLabel.match(/groupe\s+([a-z0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
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
function deltaContributionMatch(ancien, nouveau) {
  const a = contributionMatch(ancien), n = contributionMatch(nouveau);
  const delta = {};
  Object.keys(n).forEach((c) => { delta[c] = n[c] - a[c]; });
  return delta;
}
// joueurSaison : saison en cours du joueur (joueurs.saison), pour choisir
// entre joueurs (saison en cours) et stats_saisons (saison passée), comme
// côté client.
async function appliquerDeltaSaison(joueurId, joueurSaison, saisonFiche, delta) {
  const champs = Object.keys(delta).filter((c) => delta[c] !== 0);
  if (!champs.length) return;
  const isCurrentSeason = saisonFiche === (joueurSaison || '2026-2027');
  let current;
  if (isCurrentSeason) {
    ({ data: current } = await supabase.from('joueurs').select(champs.join(',')).eq('id', joueurId).single());
  } else {
    ({ data: current } = await supabase.from('stats_saisons').select(champs.join(',')).eq('joueur_id', joueurId).eq('saison', saisonFiche).single());
  }
  const maj = {};
  champs.forEach((c) => { maj[c] = (current && current[c] != null ? current[c] : 0) + delta[c]; });
  if (isCurrentSeason) {
    await supabase.from('joueurs').update(maj).eq('id', joueurId);
  } else {
    await supabase.from('stats_saisons').upsert({ joueur_id: joueurId, saison: saisonFiche, ...maj }, { onConflict: 'joueur_id,saison' });
  }
}

// ---- 1. Page calendrier : liste des rencontres + lien vers chaque match ----
const resCal = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
if (!resCal.ok) {
  console.error(`Échec chargement calendrier : statut ${resCal.status}`);
  process.exit(1);
}
const htmlCal = await resCal.text();
const $cal = cheerio.load(htmlCal);

const competitionLabel = $cal('script[type="application/ld+json"]')
  .map((i, el) => { try { return JSON.parse($cal(el).html()); } catch (e) { return null; } })
  .get()
  .find((j) => j && j['@type'] === 'BreadcrumbList')
  ?.itemListElement?.at(-1)?.item?.name || null;
const dateCaption = $cal('.caption.caption--small')
  .filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($cal(el).text()))
  .first().text().trim() || null;
const pageTitleCal = $cal('title').text().trim();
const saisonMatch = pageTitleCal.match(/(\d{4})-(\d{4})/);
const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;
const division = mapDivision(competitionLabel);
const groupe = extraireGroupe(competitionLabel);
const dateMatchJournee = calculerDateMatch(dateCaption, saison);

console.log(`Compétition : ${competitionLabel} -> ${division} groupe ${groupe}, saison ${saison}, date ${dateMatchJournee}`);

if (!division || !saison || !dateMatchJournee) {
  console.error('Impossible de déterminer division/saison/date — abandon.');
  process.exit(1);
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

for (const r of rencontres) {
  // ---- 2. Retrouver la ligne calendrier_officiel correspondante ----
  const { data: calRows, error: calErr } = await supabase
    .from('calendrier_officiel')
    .select('id')
    .eq('equipe_domicile', r.equipe_domicile)
    .eq('equipe_exterieur', r.equipe_exterieur)
    .eq('date_match', dateMatchJournee)
    .limit(1);
  if (calErr || !calRows || !calRows.length) continue;
  const calendrierOfficielId = calRows[0].id;

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
  const resMatch = await fetch(r.matchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });
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

  const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
  if (!specificsRaw) { console.log('  Objet "specifics" introuvable, ignoré.'); continue; }
  let specifics;
  try { specifics = JSON.parse(specificsRaw); }
  catch (e) { console.log(`  Échec JSON.parse : ${e.message}, ignoré.`); continue; }

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
    const attendu = abregeAttendu(joueur.prenom, joueur.nom);
    if (!attendu) continue;

    const cote = row.domicile ? evtDomicile : evtExterieur;
    const cle = `${joueur.prenom} ${joueur.nom}`;

    // Ambiguïté : un autre joueur FootLight du même côté a le même abrégé attendu.
    const ambiguite = mj.some((other) => {
      if (other === row || other.domicile !== row.domicile) return false;
      const autreJoueur = joueursById.get(other.joueur_id);
      return autreJoueur && abregeAttendu(autreJoueur.prenom, autreJoueur.nom) === attendu;
    });
    if (ambiguite) {
      console.log(`  ${cle} : ambigu (plusieurs joueurs FootLight partagent "${attendu}"), ignoré.`);
      totalAmbigus++;
      continue;
    }

    const nbButs = cote.buts.filter((b) => b.abrege === attendu).length;
    const nbJaunes = cote.jaunes.filter((a) => a === attendu).length;
    const nbRouges = cote.rouges.filter((a) => a === attendu).length;

    const maj = {};
    const details = [];
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

    if (!details.length) continue;
    console.log(`  ${cle} : ${details.join(', ')}`);

    if (Object.keys(maj).length) {
      totalMaj++;
      const delta = deltaContributionMatch(row, { ...row, ...maj });
      if (!dryRun) {
        const { error: updErr } = await supabase.from('matchs_joueur').update(maj).eq('id', row.id);
        if (updErr) { console.log(`    Erreur écriture : ${updErr.message}`); continue; }
        await appliquerDeltaSaison(row.joueur_id, joueur.saison, row.saison, delta);
      } else {
        console.log(`    Total de saison (proposé) : ${JSON.stringify(delta)}`);
      }
    }
  }
}

console.log(`\nRésumé : ${totalJoueursLies} joueur(s) FootLight lié(s) examiné(s), ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalDejaRenseignes} champ(s) déjà renseigné(s) laissé(s) tel quel, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
