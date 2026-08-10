// Diagnostic (lecture seule) : compte les joueurs par profil_public, et
// vérifie spécifiquement les clubs importés récemment (AF Virois, Lannion
// Football Club, et plus généralement niveau N2), pour comprendre pourquoi
// ils n'apparaissent pas sur footlight-recherche.html (qui filtre
// profil_public = true).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { count: totalCount, error: e1 } = await supabase.from('joueurs').select('*', { count: 'exact', head: true });
if (e1) { console.error('Erreur count total :', e1.message); process.exit(1); }
console.log(`Total joueurs en base : ${totalCount}`);

const { count: publicCount, error: e2 } = await supabase.from('joueurs').select('*', { count: 'exact', head: true }).eq('profil_public', true);
if (e2) { console.error('Erreur count public :', e2.message); process.exit(1); }
console.log(`profil_public = true : ${publicCount}`);

const { count: privateCount, error: e3 } = await supabase.from('joueurs').select('*', { count: 'exact', head: true }).eq('profil_public', false);
if (e3) { console.error('Erreur count privé :', e3.message); process.exit(1); }
console.log(`profil_public = false : ${privateCount}`);

const { count: n2Count, error: e4 } = await supabase.from('joueurs').select('*', { count: 'exact', head: true }).eq('niveau', 'N2');
console.log(`\nNiveau N2 (total) : ${n2Count}`);
const { count: n2PublicCount, error: e5 } = await supabase.from('joueurs').select('*', { count: 'exact', head: true }).eq('niveau', 'N2').eq('profil_public', true);
console.log(`Niveau N2, profil_public = true : ${n2PublicCount}`);

for (const club of ['AF Virois', 'Lannion Football Club']) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, profil_public').eq('club', club);
  if (error) { console.error(`Erreur ${club} :`, error.message); continue; }
  const pub = (data || []).filter((j) => j.profil_public).length;
  console.log(`\n${club} : ${data.length} joueur(s) en base, ${pub} avec profil_public = true`);
}
