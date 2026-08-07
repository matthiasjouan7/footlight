// Diagnostic (lecture seule) : vérifie l'existence d'un joueur par nom (ou
// par club + poste, ex: le gardien d'un club donné) et affiche ses données
// de profil + stats de saison, pour préparer une démonstration (vidéo) sans
// deviner l'état actuel de la base.
import { createClient } from '@supabase/supabase-js';

const nomRecherche = process.env.NOM_RECHERCHE;
const clubRecherche = process.env.CLUB_RECHERCHE;
const posteRecherche = process.env.POSTE_RECHERCHE;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!nomRecherche && !clubRecherche) { console.error('NOM_RECHERCHE ou CLUB_RECHERCHE requis.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

let query = supabase.from('joueurs').select('*');
if (nomRecherche) {
  const [prenom, ...reste] = nomRecherche.trim().split(' ');
  const nom = reste.join(' ');
  query = query.ilike('prenom', `%${prenom}%`).ilike('nom', `%${nom}%`);
}
if (clubRecherche) query = query.ilike('club', `%${clubRecherche}%`);
if (posteRecherche) query = query.ilike('poste', `%${posteRecherche}%`);

const { data: joueurs, error: jErr } = await query;

if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

const critere = [nomRecherche, clubRecherche, posteRecherche].filter(Boolean).join(' / ');
console.log(`${joueurs.length} joueur(s) trouvé(s) pour "${critere}" :\n`);

for (const j of joueurs) {
  console.log(`--- ${j.prenom} ${j.nom} (id: ${j.id}) ---`);
  console.log(JSON.stringify(j, null, 2));

  const { data: stats } = await supabase.from('stats_saisons').select('*').eq('joueur_id', j.id);
  console.log(`\nstats_saisons (${stats?.length || 0}) :`);
  console.log(JSON.stringify(stats, null, 2));

  const { data: matchs } = await supabase.from('matchs_joueur').select('*').eq('joueur_id', j.id);
  console.log(`\nmatchs_joueur (${matchs?.length || 0}) :`);
  console.log(JSON.stringify(matchs, null, 2));

  const { data: off } = await supabase.from('stats_officielles').select('*').eq('joueur_id', j.id);
  console.log(`\nstats_officielles (${off?.length || 0}) :`);
  console.log(JSON.stringify(off, null, 2));
  console.log('\n');
}
