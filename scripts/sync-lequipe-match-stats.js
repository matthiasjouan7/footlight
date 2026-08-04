// Rapproche les buts/cartons d'un match (lequipe.fr) avec les joueurs
// FootLight qui ont déjà généré ce match dans leur historique (via
// "Générer mon calendrier"), et propose de compléter buts/cartons_jaunes/
// cartons_rouges — UNIQUEMENT les champs encore vides (on n'écrase jamais
// une stat que le joueur a saisie lui-même).
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
    .select('id, joueur_id, domicile, buts, cartons_jaunes, cartons_rouges')
    .eq('calendrier_officiel_id', calendrierOfficielId);
  if (mjErr || !mj || !mj.length) continue;

  console.log(`\n--- ${r.equipe_domicile} vs ${r.equipe_exterieur} : ${mj.length} joueur(s) FootLight lié(s) ---`);
  totalJoueursLies += mj.length;

  const { data: joueursData } = await supabase
    .from('joueurs')
    .select('id, prenom, nom')
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

  function evenementsCote(side) {
    const buts = (side?.buts || []).map((b) => ({ abrege: normaliser(b.joueur?.nom_abrege), nomComplet: b.joueur?.nom_complet }));
    const jaunes = (side?.cartons || []).filter((c) => c.type === 'jaune').map((c) => normaliser(c.joueur?.nom_abrege));
    const rouges = (side?.cartons || []).filter((c) => c.type === 'rouge').map((c) => normaliser(c.joueur?.nom_abrege));
    return { buts, jaunes, rouges };
  }
  const evtDomicile = evenementsCote(specifics.domicile);
  const evtExterieur = evenementsCote(specifics.exterieur);

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

    if (!details.length) continue;
    console.log(`  ${cle} : ${details.join(', ')}`);

    if (Object.keys(maj).length) {
      totalMaj++;
      if (!dryRun) {
        const { error: updErr } = await supabase.from('matchs_joueur').update(maj).eq('id', row.id);
        if (updErr) console.log(`    Erreur écriture : ${updErr.message}`);
      }
    }
  }
}

console.log(`\nRésumé : ${totalJoueursLies} joueur(s) FootLight lié(s) examiné(s), ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalDejaRenseignes} champ(s) déjà renseigné(s) laissé(s) tel quel, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
