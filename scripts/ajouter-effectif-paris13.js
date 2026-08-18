// Ajoute les joueurs manquants de l'effectif Paris 13 Atletico (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury, Villefranche,
// Concarneau).
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Paris 13 Atletico';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF PARIS 13 ATLETICO", 26/27).
const EFFECTIF = [
  { prenom: 'Axel', nom: 'Temperton', poste: 'gardien', naissance: '1998-03-08' },
  { prenom: 'Sasha', nom: 'Bernard', poste: 'gardien', naissance: '1999-12-18' },
  { prenom: 'Jordan', nom: 'Poha', poste: 'defenseur_central', naissance: '2003-07-08' },
  { prenom: 'Jésah', nom: 'Ayessa', poste: 'defenseur_central', naissance: '2000-01-09' },
  { prenom: 'Hady', nom: 'Camara', poste: 'defenseur_central', naissance: '2002-01-17' },
  { prenom: 'Christophe', nom: 'Diedhiou', poste: 'defenseur_central', naissance: '1988-01-08' },
  { prenom: 'Enzo-Noël', nom: 'Dodé', poste: 'lateral_gauche', naissance: '2006-12-25' },
  { prenom: 'Nicolas', nom: 'Bernardiño', poste: 'lateral_droit', naissance: '2002-09-29' },
  { prenom: 'Ibrahim', nom: 'Koné', poste: 'lateral_droit', naissance: '1998-12-27' },
  { prenom: 'Stacy', nom: 'Misiatu', poste: 'milieu_defensif', naissance: '1997-07-17' },
  { prenom: 'Omar', nom: 'Bezzekhami', poste: 'milieu_central', naissance: '1995-12-18' },
  { prenom: 'Ibrahim', nom: 'Camara', poste: 'milieu_central', naissance: '2000-09-12' },
  { prenom: 'Qays', nom: 'Salhi', poste: 'ailier_gauche', naissance: '2002-10-06' },
  { prenom: 'Noa', nom: 'Donat', poste: 'milieu_offensif', naissance: '2003-09-29' },
  { prenom: 'Etienne', nom: 'Michut', poste: 'milieu_offensif', naissance: '2006-12-16' },
  { prenom: 'Mattheo', nom: 'Guendez', poste: 'ailier_gauche', naissance: '2005-10-16' },
  { prenom: 'Abdelmalek', nom: 'Amara', poste: 'ailier_gauche', naissance: '2000-03-16' },
  { prenom: 'Fodié', nom: 'Camara', poste: 'ailier_gauche', naissance: '2003-05-22' },
  { prenom: 'Mamadou', nom: 'Kébé', poste: 'ailier_droit', naissance: '2003-11-13' },
  { prenom: 'Aboubacar', nom: 'Sidibé', poste: 'attaquant', naissance: '2006-02-07' },
  { prenom: 'Bonota', nom: 'Traoré', poste: 'attaquant', naissance: '2003-06-30' },
  { prenom: 'Inza', nom: 'Koné', poste: 'attaquant', naissance: '2001-11-05' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = (joueurs || []).find(
    (x) => normaliser(x.prenom) === normaliser(j.prenom) && normaliser(x.nom) === normaliser(j.nom)
  );
  if (existant) {
    console.log(`${j.prenom} ${j.nom} : déjà en base (id=${existant.id}, club="${existant.club || '—'}"), ignoré.`);
    ignores++;
    continue;
  }
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.manuel@scoute.footlight.fr`;
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance}).`);
  aInserer++;
  if (!dryRun) {
    const { error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste,
      niveau: NIVEAU, club: CLUB, saison: SAISON,
      date_naissance: j.naissance,
      matchs_joues: 0,
      buts: 0,
      badge: 'declaratif',
      profil_public: false,
    }]);
    if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  }
}
console.log(`\nRésumé : ${aInserer} joueur(s) à créer, ${ignores} déjà en base (ignoré(s)).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
