// Corrige 2 transferts non répercutés, détectés par
// detecte-transferts-transfermarkt.js (National 1 groupe A) : les deux
// clubs de destination restent en N1 groupe A, donc seul le champ club est
// à corriger (pas de changement de niveau).
//   - Aboubakar Touré : Sporting Club de Toulon -> Us Le Pays Du Valois
//   - Aymeric Ahmed    : LB Châteauroux -> Us Creteil Football
//
// Sécurité : DRY_RUN=true par défaut. Vérifie l'homonymie avant d'écrire.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N1';
const GROUPE = 'A';
const SAISON = '2026-2027';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon' };
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

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }

const CORRECTIONS = [
  { prenom: 'Aboubakar', nom: 'Touré', nouveauClub: 'Us Le Pays Du Valois' },
  { prenom: 'Aymeric', nom: 'Ahmed', nouveauClub: 'Us Creteil Football' },
];

for (const c of CORRECTIONS) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('prenom', c.prenom).eq('nom', c.nom).eq('niveau', NIVEAU).eq('saison', SAISON);
  if (error) { console.log(`${c.prenom} ${c.nom} : erreur ${error.message}`); continue; }
  console.log(`\n${c.prenom} ${c.nom} : ${data.length} correspondance(s) exacte(s) (prénom+nom+niveau+saison).`);
  if (data.length !== 1) {
    console.log('  Nombre de correspondances != 1, ignoré par sécurité.');
    for (const d of data) console.log(`    -> id=${d.id} club="${d.club}"`);
    continue;
  }
  const joueur = data[0];
  console.log(`  Club actuel : "${joueur.club}" -> "${c.nouveauClub}"`);

  const matchsNouveauClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, c.nouveauClub) || clubWordsMatch(row.equipe_exterieur, c.nouveauClub));
  console.log(`  ${matchsNouveauClub.length} ligne(s) calendrier trouvée(s) pour "${c.nouveauClub}" (groupe ${GROUPE}).`);

  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: c.nouveauClub }).eq('id', joueur.id);
    if (updErr) { console.log(`  Erreur mise à jour club : ${updErr.message}`); continue; }
    console.log('  Club mis à jour.');
  }

  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', joueur.id);
  if (errMj) { console.log(`  Erreur lecture matchs_joueur : ${errMj.message}`); continue; }
  const idsReels = new Set(matchsNouveauClub.map((m) => m.id));
  const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
  const idsDejaValides = new Set(mj.filter((m) => m.calendrier_officiel_id && idsReels.has(m.calendrier_officiel_id)).map((m) => m.calendrier_officiel_id));
  const manquants = matchsNouveauClub.filter((row) => !idsDejaValides.has(row.id));
  console.log(`  ${mj.length} matchs_joueur existant(s), ${horsCalendrier.length} hors-calendrier (ancien club) à supprimer, ${manquants.length} match(s) réel(s) manquant(s) à ajouter.`);

  if (!dryRun) {
    if (horsCalendrier.length) {
      const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', horsCalendrier.map((m) => m.id));
      if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
    }
    if (manquants.length) {
      const aInserer = manquants.map((row) => {
        const domicile = clubWordsMatch(row.equipe_domicile, c.nouveauClub);
        return {
          joueur_id: joueur.id, saison: SAISON, date_match: row.date_match,
          adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
          competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
        };
      });
      const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
      if (insErr) console.log(`  Erreur insertion : ${insErr.message}`);
    }
  }
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
