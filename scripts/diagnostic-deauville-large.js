// Diagnostic lecture seule : recherche élargie (deauville, astdv,
// trouville, villers, touques) pour comprendre l'écart entre le nombre de
// joueurs trouvés côté base (7 avec le premier diagnostic) et le nombre
// affiché sur footlight-recherche.html (25 selon l'utilisateur) pour le
// club Deauville. Liste aussi les clubs distincts trouvés, au cas où
// plusieurs orthographes coexistent.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, profil_public, created_at')
  .or('club.ilike.%deauville%,club.ilike.%astdv%,club.ilike.%trouville%,club.ilike.%villers%,club.ilike.%touques%');

if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${data?.length || 0} joueur(s) trouvé(s) au total (recherche élargie).\n`);

const parClub = new Map();
for (const j of data || []) {
  if (!parClub.has(j.club)) parClub.set(j.club, []);
  parClub.get(j.club).push(j);
}
console.log(`Club(s) distinct(s) : ${parClub.size}`);
for (const [club, liste] of parClub) {
  console.log(`\n  Club="${club}" : ${liste.length} joueur(s)`);
  for (const j of liste) console.log(`    ${j.prenom} ${j.nom} (id=${j.id}, niveau=${j.niveau}, saison=${j.saison}, public=${j.profil_public}, créé le ${j.created_at})`);
}
