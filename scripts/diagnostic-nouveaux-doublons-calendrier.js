// Diagnostic lecture seule : le diagnostic global des matchs mal
// synchronisés (diagnostic-n2-matchs-non-synchronises.js) a fait
// remonter des paires suspectes avec des noms abrégés façon lequipe.fr
// (ex: "Panazol" / "Panazol As 1" id=3340, "GFC Ajaccio" / "Gazelec Fc
// Ajaccio 1" id=3101) — exactement le type de doublon nettoyé hier
// (PR #938/#939, ids 3100-3465). Vérifie leur date de création pour
// savoir s'il s'agit d'anciens doublons jamais détectés par le premier
// nettoyage, ou de nouveaux doublons recréés par le cron après le
// correctif (PR #944, merge 2026-09-10).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS_SUSPECTS = [3340, 3453, 3346, 3351, 3370, 3459, 3374, 3375, 3446, 3449, 3101, 3457, 3463, 3466];

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, created_at, groupe, date_match, equipe_domicile, equipe_exterieur')
  .in('id', IDS_SUSPECTS)
  .order('created_at');
if (error) { console.error('Erreur :', error.message); process.exit(1); }

for (const r of data || []) {
  console.log(`id=${r.id} créé le ${r.created_at} — groupe ${r.groupe}, ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
}
