// Ajoute l'effectif AJ Auxerre B (N2 groupe H, saison 2026-2027, capture
// d'écran "EFFECTIF AJ AUXERRE B", 25 joueurs) + tente de générer son
// calendrier (groupe H, pas encore confirmé dans calendrier_officiel —
// premier club du groupe H ajouté cette session, contrairement au groupe
// G déjà synchronisé). Si 0 ligne trouvée, il faudra vérifier séparément
// la disponibilité du calendrier N2 groupe H.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'AJ Auxerre B';
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
  { prenom: 'Louis', nom: 'Mezerette', poste: 'gardien', naissance: '2006-08-30', nationalite: 'France' },
  { prenom: 'Rayann', nom: 'Amedivlo', poste: 'gardien', naissance: '2006-04-21', nationalite: 'France' },
  { prenom: 'Pierre', nom: 'Réale', poste: 'gardien', naissance: '2009-01-08', nationalite: 'France' },
  { prenom: 'Elikya', nom: 'Legros', poste: 'defenseur_central', naissance: '2008-06-06', nationalite: 'France' },
  { prenom: 'Alvin', nom: 'Petit Dol', poste: 'defenseur_central', naissance: '2006-11-07', nationalite: 'France' },
  { prenom: 'Ismaël', nom: 'Sidibé', poste: 'defenseur_central', naissance: '2009-04-08', nationalite: 'Espagne' },
  { prenom: 'Mohamed', nom: 'Coulibaly', poste: 'defenseur_central', naissance: '2008-11-11', nationalite: 'France' },
  { prenom: 'Ata-Yis', nom: 'Onday Nianga', poste: 'defenseur_central', naissance: '2008-05-21', nationalite: 'France' },
  { prenom: 'Lamfia', nom: 'Dioubaté', poste: 'milieu_defensif', naissance: '2007-07-20', nationalite: 'France' },
  { prenom: 'Yvan', nom: 'Zaddy', poste: 'milieu_defensif', naissance: '2006-05-01', nationalite: "Côte d'Ivoire" },
  { prenom: 'Kilyan', nom: 'Kenne Mouafo', poste: 'milieu_defensif', naissance: '2008-05-11', nationalite: 'France' },
  { prenom: 'Théo', nom: 'Mary', poste: 'milieu_central', naissance: '2006-05-01', nationalite: 'France' },
  { prenom: 'Redwan', nom: 'Eid Hamzawiy', poste: 'milieu_central', naissance: '2006-01-05', nationalite: 'France' },
  { prenom: 'Elyes', nom: 'Saïdi', poste: 'milieu_central', naissance: '2008-12-15', nationalite: 'France' },
  { prenom: 'Louka', nom: 'Vandenbossche', poste: 'milieu_central', naissance: '2008-06-29', nationalite: 'France' },
  { prenom: 'Rúben', nom: 'Da Costa', poste: 'milieu_offensif', naissance: '2008-01-28', nationalite: 'Portugal' },
  { prenom: 'Gloire', nom: 'Kanza', poste: 'ailier_gauche', naissance: '2008-01-07', nationalite: 'France' },
  { prenom: 'Mamoudou', nom: 'Cissokho', poste: 'ailier_droit', naissance: '2007-12-20', nationalite: 'France' },
  { prenom: 'Ousmane', nom: 'Baal', poste: 'ailier_droit', naissance: '2008-01-24', nationalite: 'France' },
  { prenom: 'Kiliane', nom: 'Assougrou', poste: 'ailier_droit', naissance: '2009-01-06', nationalite: 'France' },
  { prenom: 'Ailton', nom: 'Gomes', poste: 'ailier_droit', naissance: '2008-04-18', nationalite: 'France' },
  { prenom: 'Ryan', nom: 'Rodin', poste: 'attaquant', naissance: '2006-03-02', nationalite: 'France' },
  { prenom: 'Tony', nom: 'Mendy', poste: 'attaquant', naissance: '2006-09-03', nationalite: 'France' },
  { prenom: 'Elijah', nom: 'Owona', poste: 'attaquant', naissance: '2006-03-01', nationalite: 'France' },
  { prenom: 'Youssef', nom: 'Khoudda', poste: 'attaquant', naissance: '2007-04-20', nationalite: 'France' },
];

console.log(`\n=== Vérification homonymes (club "auxerre") ===`);
let nbConflits = 0;
for (const j of JOUEURS) {
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${j.nom.split(' ')[0]}%`);
  if (error) { console.log(`  ${j.nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((d) => /auxerre/i.test(d.club || ''));
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
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.ajab.manuel@scoute.footlight.fr`;
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
  console.log(`  ${calendrier.length} ligne(s) totales en N2 groupe ${GROUPE}.`);
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
