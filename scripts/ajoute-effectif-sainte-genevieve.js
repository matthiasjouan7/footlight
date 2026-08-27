// Ajoute l'effectif Sainte-Geneviève Sports (N2 groupe H, saison
// 2026-2027, capture d'écran "EFFECTIF SAINTE-GENEVIÈVE SPORTS", 27
// joueurs) + génère son calendrier. Club confirmé dans calendrier_officiel
// sous "Ste Genevieve Fc 1" (diagnostic-clubs-groupe-h.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Ste Genevieve Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'H';

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
function slugifier(str) { return normalizeName(str).replace(/[^a-z0-9]+/g, ''); }

const JOUEURS = [
  { prenom: 'Yannick', nom: 'Tchintcho', poste: 'gardien', naissance: '1994-02-28', nationalite: 'France' },
  { prenom: 'Kévin', nom: 'Vautour', poste: 'gardien', naissance: '2003-07-01', nationalite: 'France' },
  { prenom: 'Kévin', nom: 'Varela', poste: 'defenseur_central', naissance: '2000-01-01', nationalite: 'France' },
  { prenom: 'Ousmane', nom: "N'Diaye", poste: 'defenseur_central', naissance: '1991-08-19', nationalite: 'France' },
  { prenom: 'Salif', nom: 'Dramé', poste: 'defenseur_central', naissance: '1997-01-03', nationalite: 'France' },
  { prenom: 'Souleymane', nom: 'Coulibaly', poste: 'defenseur_central', naissance: '1998-01-26', nationalite: 'France' },
  { prenom: 'Gnahoa', nom: 'Blazi', poste: 'defenseur_central', naissance: '1993-02-13', nationalite: 'France' },
  { prenom: 'Paul', nom: 'Empunda Ndjoku', poste: 'defenseur_central', naissance: '2002-05-01', nationalite: 'France' },
  { prenom: 'Enzo', nom: 'Fiore', poste: 'lateral_gauche', naissance: '2002-09-26', nationalite: 'France' },
  { prenom: 'Alfousseyni', nom: 'Sakiliba', poste: 'lateral_gauche', naissance: '1999-10-10', nationalite: 'France' },
  { prenom: 'Alane', nom: 'Dorol', poste: 'lateral_droit', naissance: '1997-06-29', nationalite: 'France' },
  { prenom: 'Matthias', nom: 'Llambrich', poste: 'milieu_defensif', naissance: '1993-02-06', nationalite: 'France' },
  { prenom: 'Hocine', nom: 'Belgacem', poste: 'milieu_defensif', naissance: '2002-09-05', nationalite: 'France' },
  { prenom: 'Mala', nom: 'Baro', poste: 'milieu_defensif', naissance: '2000-03-22', nationalite: 'France' },
  { prenom: 'Alvin', nom: 'Chovino', poste: 'milieu_central', naissance: '1999-11-12', nationalite: 'France' },
  { prenom: 'Samba', nom: 'Camara', poste: 'milieu_central', naissance: null, nationalite: 'France' },
  { prenom: 'Ange', nom: 'Koffi', poste: 'milieu_central', naissance: null, nationalite: 'France' },
  { prenom: 'Dolan', nom: 'Bahamboula', poste: 'milieu_central', naissance: '1995-05-22', nationalite: 'France' },
  { prenom: 'Yacine', nom: 'Ahjaou', poste: 'milieu_offensif', naissance: '2004-10-28', nationalite: 'France' },
  { prenom: 'Salya', nom: 'Touré', poste: 'milieu_offensif', naissance: '1995-04-11', nationalite: 'France' },
  { prenom: 'Allam', nom: 'Benaissa', poste: 'ailier_droit', naissance: '1999-04-29', nationalite: 'France' },
  { prenom: 'Robin', nom: "d'Agostino", poste: 'ailier_droit', naissance: '2000-04-25', nationalite: 'France' },
  { prenom: 'Yacine', nom: 'Bousnina', poste: 'attaquant', naissance: '1995-01-31', nationalite: 'France' },
  { prenom: 'Ibrahima', nom: 'Diallo', poste: 'attaquant', naissance: '1998-10-29', nationalite: 'Espagne' },
  { prenom: 'Oumerou', nom: 'Dramé', poste: 'attaquant', naissance: '1995-11-26', nationalite: 'France' },
  { prenom: 'Elias', nom: 'Bakchich', poste: 'attaquant', naissance: '2000-12-13', nationalite: 'France' },
  { prenom: 'Jérémie', nom: 'Liso', poste: 'attaquant', naissance: '1999-10-15', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "genevieve") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /genevieve/i.test(d.club || ''));
  if (auClub.length) {
    console.log(`  CONFLIT POSSIBLE pour ${j.prenom} ${j.nom} :`);
    for (const d of auClub) console.log(`    ${d.prenom} ${d.nom} — club="${d.club}" niveau="${d.niveau}" saison="${d.saison}"`);
    nbConflits++;
  }
}
console.log(`  ${nbConflits} conflit(s) potentiel(s) détecté(s).`);

console.log(`\n=== Ajout de l'effectif (${JOUEURS.length} joueurs) ===`);
let nbCrees = 0;
const idsCrees = [];
for (const j of JOUEURS) {
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.sgs.manuel@scoute.footlight.fr`;
  console.log(`  ${j.prenom} ${j.nom} (${j.poste}, né(e) ${j.naissance || 'inconnu'}, ${j.nationalite})`);
  if (!dryRun) {
    const { data: inserted, error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste, niveau: NIVEAU, club: CLUB, saison: SAISON,
      date_naissance: j.naissance, nationalite: j.nationalite,
      matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: true,
    }]).select('id, prenom, nom');
    if (insErr) { console.log(`    Erreur écriture : ${insErr.message}`); continue; }
    idsCrees.push(inserted[0]);
  }
  nbCrees++;
}
console.log(`  Résumé : ${nbCrees} joueur(s) ${dryRun ? 'à créer' : 'créé(s)'}.`);

console.log(`\n=== Calendrier ${CLUB} (groupe ${GROUPE}) ===`);
if (dryRun) {
  console.log('  (DRY RUN) Calendrier généré uniquement après écriture réelle des joueurs (les id sont nécessaires).');
} else {
  const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
  console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s) pour ${CLUB}.`);
  let total = 0;
  for (const j of idsCrees) {
    const aInserer = matchsClub.map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, CLUB);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    total += aInserer.length;
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`  Erreur insertion ${j.prenom} ${j.nom} : ${insErr.message}`);
  }
  console.log(`  Total : ${total} match(s) inséré(s).`);
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
