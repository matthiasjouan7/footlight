// Diagnostic lecture seule : les 24 joueurs inscrits sous "Hyères 83 FC"
// ont un nom de club différent du nom officiel "HYERES F.C." utilisé dans
// calendrier_officiel — le rapprochement flou (clubsCorrespondent) risque
// de ne jamais les faire correspondre ("83" n'est un mot générique ni un
// synonyme connu), donc leur calendrier n'a peut-être jamais été généré.
// Vérifie combien de lignes matchs_joueur existent pour ces joueurs, et
// en particulier pour le match du 2026-08-21 (calendrier_officiel_id=2800).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, niveau, saison')
    .eq('club', 'Hyères 83 FC');
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }
  console.log(`${joueurs.length} joueur(s) "Hyères 83 FC".`);

  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id, date_match, adversaire')
    .in('joueur_id', joueurs.map((j) => j.id));
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }
  console.log(`${mj.length} ligne(s) matchs_joueur au total pour ces joueurs.`);

  const parJoueur = new Map();
  for (const m of mj) {
    if (!parJoueur.has(m.joueur_id)) parJoueur.set(m.joueur_id, []);
    parJoueur.get(m.joueur_id).push(m);
  }
  for (const j of joueurs) {
    const liste = parJoueur.get(j.id) || [];
    const surCeMatch = liste.find((m) => m.calendrier_officiel_id === 2800);
    console.log(`  ${j.prenom} ${j.nom} : ${liste.length} ligne(s) au total, ${surCeMatch ? `ligne id=${surCeMatch.id} présente pour calendrier_officiel_id=2800` : 'AUCUNE ligne pour calendrier_officiel_id=2800'}`);
  }
}

main().finally(() => process.exit(process.exitCode || 0));
