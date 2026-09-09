// Diagnostic lecture seule rapide (pas de Playwright) : vérifie si le match
// calendrier_officiel_id=483 (Trelissac vs Onet, groupe A) a déjà des
// minutes_jouees renseignées pour ses joueurs, avant de conclure que le
// DRY_RUN sync-transfermarkt-match-stats-n2.js échoue à le synchroniser —
// s'il est déjà entièrement synchronisé, son absence de log ("Ambiguïté"/
// "À écrire") dans le DRY_RUN groupe A est normale (skip silencieux sur
// minutes_jouees déjà renseigné), et ce n'est pas un bon exemple pour
// diagnostiquer les 73 "non trouvés" du groupe A.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const CALENDRIER_OFFICIEL_ID = parseInt(process.env.CALENDRIER_OFFICIEL_ID || '483', 10);

const { data: mj, error } = await supabase
  .from('matchs_joueur')
  .select('joueur_id, minutes_jouees, buts, titulaire')
  .eq('calendrier_officiel_id', CALENDRIER_OFFICIEL_ID);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
const avecMinutes = mj.filter((m) => m.minutes_jouees != null);
console.log(`calendrier_officiel_id=${CALENDRIER_OFFICIEL_ID} : ${mj.length} ligne(s) matchs_joueur, ${avecMinutes.length} avec minutes_jouees renseigné.`);
if (avecMinutes.length) {
  const joueurIds = avecMinutes.map((m) => m.joueur_id);
  const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
  const parId = new Map((joueurs || []).map((j) => [j.id, j]));
  for (const m of avecMinutes) {
    const j = parId.get(m.joueur_id) || {};
    console.log(`  ${j.prenom} ${j.nom} (${j.club}) — minutes=${m.minutes_jouees} titulaire=${m.titulaire} buts=${m.buts}`);
  }
}
