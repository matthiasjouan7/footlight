// Traitement groupé (pour limiter les allers-retours) demandé par
// l'utilisateur :
// 1) Nassim Sabihi (FC Villefranche Beaujolais) signalé en N1 alors qu'il
//    doit être en Ligue 3 (même bug que le lot précédent Khouma/Badey/etc.)
//    -> correction niveau + génération calendrier.
// 2) Stade Beaucairois 30 (N2) : diagnostic-sbfc-et-sabihi.js a confirmé
//    26 lignes "Sbfc 1" en division=N2 groupe=G dans calendrier_officiel —
//    le calendrier existe bien, mais sous le nom d'usage FFF "SBFC" (PDF
//    "N2 / Fff Poule G" fourni par l'utilisateur), sans mot commun avec
//    "Stade Beaucairois 30". Utilise le même mécanisme que "vfc"->"vendee"
//    (remplacement de mot) pour les faire correspondre, sans renommer le
//    club affiché sur les fiches joueurs (conservé "Stade Beaucairois 30"
//    à la demande explicite de l'utilisateur).
// 3) Ajout de l'effectif ES Cannet Rocheville (N2, même groupe G — visible
//    dans le même PDF sous "Es Cannet Roche 1"), avec club calé sur le nom
//    officiel du calendrier pour garantir la correspondance automatique.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubWordsMatch(a, b) {
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

async function genererCalendrierClub(club, niveau, groupe, joueurIds) {
  let q = supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', niveau).eq('saison', SAISON);
  if (groupe) q = q.eq('groupe', groupe);
  const { data: calendrier, error: errC } = await q;
  if (errC) { console.log(`  Erreur calendrier : ${errC.message}`); return; }
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, club) || clubWordsMatch(row.equipe_exterieur, club));
  console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s) pour ${club}.`);
  let total = 0;
  for (const j of joueurIds) {
    const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', j.id);
    if (errE) { console.log(`  ${j.prenom} ${j.nom} : erreur lecture existants (${errE.message})`); continue; }
    const idsExistants = new Set((existants || []).filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
    const datesExistantes = new Set((existants || []).map((m) => m.date_match));
    const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, club);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    total += aInserer.length;
    if (!dryRun && aInserer.length) {
      const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
      if (insErr) console.log(`  Erreur insertion ${j.prenom} ${j.nom} : ${insErr.message}`);
    }
  }
  console.log(`  Total : ${total} match(s) ${dryRun ? 'à insérer' : 'inséré(s)'}.`);
}

// ── 1) Nassim Sabihi ──
console.log('\n=== 1) Nassim Sabihi (niveau N1 -> Ligue 3) ===');
const SABIHI_ID = 'e50df0c5-f81f-4e76-9f4c-efea8d94002d';
if (!dryRun) {
  const { error } = await supabase.from('joueurs').update({ niveau: 'Ligue 3' }).eq('id', SABIHI_ID);
  if (error) console.log(`  Erreur correction niveau : ${error.message}`);
  else console.log('  Niveau corrigé en Ligue 3.');
} else {
  console.log('  (DRY RUN) Niveau à corriger : N1 -> Ligue 3.');
}
await genererCalendrierClub('FC Villefranche Beaujolais', 'Ligue 3', null, [{ id: SABIHI_ID, prenom: 'Nassim', nom: 'Sabihi' }]);

// ── 2) Stade Beaucairois 30 ──
console.log('\n=== 2) Calendrier Stade Beaucairois 30 (N2 groupe G, via mapping sbfc) ===');
const { data: beaucairois, error: errB } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', 'Stade Beaucairois 30').eq('niveau', 'N2').eq('saison', SAISON);
if (errB) { console.error('Erreur lecture Beaucairois :', errB.message); process.exit(1); }
console.log(`  ${beaucairois.length} joueur(s) trouvé(s) pour Stade Beaucairois 30.`);
await genererCalendrierClub('Stade Beaucairois 30', 'N2', 'G', beaucairois);

// ── 3) ES Cannet Rocheville ──
console.log('\n=== 3) Effectif ES Cannet Rocheville (N2 groupe G) ===');
const CLUB_ECR = 'Es Cannet Roche 1';
const ECR_JOUEURS = [
  { prenom: 'Reynald', nom: 'Framery', poste: 'gardien', naissance: '1997-03-21', nationalite: 'France' },
  { prenom: 'François', nom: 'Squarcioni', poste: 'gardien', naissance: '1990-07-12', nationalite: 'France' },
  { prenom: 'Victor', nom: 'Battu', poste: 'gardien', naissance: '2003-04-22', nationalite: 'France' },
  { prenom: 'Nicolas', nom: 'Coulanghon', poste: 'defenseur_central', naissance: '1997-05-11', nationalite: 'France' },
  { prenom: 'Iwan', nom: 'Olessongo', poste: 'defenseur_central', naissance: '2007-01-24', nationalite: 'France' },
  { prenom: 'Grégory', nom: 'Rolando', poste: 'lateral_gauche', naissance: '2000-02-28', nationalite: 'France' },
  { prenom: 'Antar', nom: 'Yalaoui', poste: 'lateral_droit', naissance: '2000-01-08', nationalite: 'France' },
  { prenom: 'Paul', nom: 'Grandemange', poste: 'lateral_droit', naissance: '1997-10-09', nationalite: 'France' },
  { prenom: 'Romain', nom: 'Chauvet', poste: 'lateral_droit', naissance: '1995-05-19', nationalite: 'France' },
  { prenom: 'Alexandre', nom: 'Even', poste: 'milieu_defensif', naissance: '1994-03-12', nationalite: 'France' },
  { prenom: 'Gauthier', nom: 'Denis', poste: 'milieu_defensif', naissance: '1993-07-06', nationalite: 'France' },
  { prenom: 'Anthony', nom: 'Calatayud', poste: 'milieu_central', naissance: '1990-04-04', nationalite: 'France' },
  { prenom: 'Ryan', nom: 'Affane', poste: 'milieu_central', naissance: '2000-02-04', nationalite: 'France' },
  { prenom: 'Azihard', nom: "M'Changama", poste: 'milieu_defensif', naissance: '2001-04-21', nationalite: 'Comores' },
  { prenom: 'Thomas', nom: 'Gomes', poste: 'milieu_defensif', naissance: '2006-02-17', nationalite: 'France' },
  { prenom: 'Amir', nom: 'Nouri', poste: 'milieu_central', naissance: '1994-07-10', nationalite: 'Algérie' },
  { prenom: 'Anis', nom: 'Ajroud', poste: 'ailier_gauche', naissance: '2002-03-30', nationalite: 'Tunisie' },
  { prenom: 'Alkaou', nom: 'Keita', poste: 'attaquant', naissance: '1998-05-07', nationalite: 'Mali' },
  { prenom: 'Bastien', nom: 'Gourdon', poste: 'attaquant', naissance: '2003-12-20', nationalite: 'France' },
  { prenom: 'Bruno', nom: 'Sylva', poste: 'attaquant', naissance: '2001-05-22', nationalite: 'France' },
  { prenom: 'Nassim', nom: 'Guettache', poste: 'attaquant', naissance: '2004-05-20', nationalite: 'France' },
  { prenom: 'Valentin', nom: 'Théron', poste: 'attaquant', naissance: null, nationalite: 'France' },
];

function slugifier(str) { return normalizeName(str).replace(/[^a-z0-9]+/g, ''); }

console.log('  Vérification homonymes (club "cannet"/"rocheville") :');
let nbConflits = 0;
for (const j of ECR_JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`    ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /cannet|rocheville/i.test(d.club || ''));
  if (auClub.length) {
    console.log(`    CONFLIT POSSIBLE pour ${j.prenom} ${j.nom} :`);
    for (const d of auClub) console.log(`      ${d.prenom} ${d.nom} — club="${d.club}" niveau="${d.niveau}" saison="${d.saison}"`);
    nbConflits++;
  }
}
console.log(`  ${nbConflits} conflit(s) potentiel(s) détecté(s).`);

let nbCrees = 0;
const idsCrees = [];
for (const j of ECR_JOUEURS) {
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.ecr.manuel@scoute.footlight.fr`;
  console.log(`  ${j.prenom} ${j.nom} (${j.poste}, né(e) ${j.naissance || 'inconnu'}, ${j.nationalite})`);
  if (!dryRun) {
    const { data: inserted, error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste, niveau: 'N2', club: CLUB_ECR, saison: SAISON,
      date_naissance: j.naissance, nationalite: j.nationalite,
      matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: true,
    }]).select('id, prenom, nom');
    if (insErr) { console.log(`    Erreur écriture : ${insErr.message}`); continue; }
    idsCrees.push(inserted[0]);
  }
  nbCrees++;
}
console.log(`  Résumé : ${nbCrees} joueur(s) ${dryRun ? 'à créer' : 'créé(s)'}.`);

console.log('\n=== Calendrier ES Cannet Rocheville ===');
if (!dryRun) {
  await genererCalendrierClub(CLUB_ECR, 'N2', 'G', idsCrees);
} else {
  console.log('  (DRY RUN) Calendrier généré uniquement après écriture réelle des joueurs (les id sont nécessaires).');
}

if (dryRun) console.log('\nDRY RUN global : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
