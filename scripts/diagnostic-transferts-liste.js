// Diagnostic en lecture seule : cherche dans la table joueurs les joueurs
// correspondant à une liste de transferts (nom/prénom), pour préparer une
// mise à jour du champ "club" vers leur nouveau club.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// Liste extraite de la capture d'écran fournie par l'utilisateur.
const TRANSFERTS = [
  { prenom: 'Nathanaël', nom: 'Bai', de: 'US Créteil', vers: 'AS Saint-Priest' },
  { prenom: 'Lucas', nom: 'Rigaud', de: 'AS Furiani', vers: 'Mi. Trévoux' },
  { prenom: 'Aboubakar', nom: 'Touré', de: 'SC Toulon', vers: 'Pays du Valois' },
  { prenom: 'Paul', nom: 'Meliande', de: 'Angoulême CFC', vers: 'Pays du Valois' },
  { prenom: 'Thomas', nom: 'Secchi', de: 'AS Furiani', vers: 'Genêts Anglet' },
  { prenom: 'Axel', nom: 'Dauchy', de: 'US Créteil', vers: 'US Lusitanos' },
  { prenom: 'Riyan', nom: 'Majdi', de: 'FC Sochaux B', vers: 'Pays du Valois' },
  { prenom: 'Brice', nom: 'Seymour', de: 'EA Guingamp B', vers: 'Pays du Valois' },
  { prenom: 'Marwane', nom: 'Rokami', de: 'AS Beauvais', vers: 'Pays du Valois' },
  { prenom: 'Christophe', nom: 'Diedhiou', de: 'US Lusitanos', vers: 'Paris 13 Atl.' },
  { prenom: 'Momar', nom: 'Gadji', de: 'Montlouis', vers: 'Canet Rous.' },
  { prenom: 'Brandon', nom: 'Agounon', de: 'US Créteil', vers: 'RAEC Mons' },
  { prenom: 'Jodel', nom: 'Dossou', de: 'Pays du Valois', vers: 'Lorentzweiler' },
  { prenom: 'Caumes', nom: 'Cimetière', de: 'US Orléans U19', vers: 'Montlouis' },
  { prenom: 'Lucas', nom: 'Barreto', de: 'Neuves-Maisons', vers: 'SAS Épinal' },
  { prenom: 'Nathan', nom: 'Deheppe', de: 'Troyes B', vers: 'FR Haguenau' },
  { prenom: 'Lassana', nom: 'Sylla', de: 'Saint-Quentin', vers: 'Pays du Valois' },
  { prenom: 'Peterson', nom: 'Paul', de: 'Amiens SC', vers: 'AS Furiani', pret: true },
  { prenom: 'Rosario', nom: 'Latouchent', de: 'Bourges FC', vers: 'FC Chambly Oise' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) en base.\n`);

let trouves = 0;
for (const t of TRANSFERTS) {
  const candidats = (joueurs || []).filter(
    (j) => normaliser(j.prenom) === normaliser(t.prenom) && normaliser(j.nom) === normaliser(t.nom)
  );
  if (!candidats.length) {
    console.log(`${t.prenom} ${t.nom} : aucun joueur FootLight correspondant.`);
    continue;
  }
  trouves++;
  for (const c of candidats) {
    console.log(`${t.prenom} ${t.nom} : trouvé (id=${c.id}, niveau=${c.niveau}, saison=${c.saison}) — club actuel "${c.club || '—'}" -> "${t.vers}"${t.pret ? ' (prêt)' : ''}`);
  }
}
console.log(`\nRésumé : ${trouves}/${TRANSFERTS.length} joueur(s) de la liste trouvé(s) en base.`);
