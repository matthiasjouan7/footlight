// Diagnostic : reproduit exactement le parcours du navigateur d'un joueur
// qui vient de s'inscrire (footlight-inscription-joueur.html) — signUp()
// avec la clé anon, puis INSERT dans joueurs, puis INSERT dans
// matchs_joueur — pour vérifier si une policy RLS bloque silencieusement
// genererCalendrierAuto() juste après l'inscription (avant confirmation
// email éventuelle), alors que le bouton "Générer mon calendrier" sur la
// page profil fonctionne (session déjà authentifiée de longue date).
//
// Nettoie ensuite les données de test avec la clé service_role.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://migarohddystlyhuoxfg.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2Fyb2hkZHlzdGx5aHVveGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjI2NjksImV4cCI6MjA5Mjk5ODY2OX0.NKlySSVpnws5WZF41T2qeoMjBi5VZzpnk_h-ejTj9R4';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant (nécessaire pour le nettoyage).'); process.exit(1); }

const db = createClient(supabaseUrl, anonKey);
const admin = createClient(supabaseUrl, serviceKey);

const emailTest = `diagnostic-rls-${Date.now()}@scoute.footlight.fr`;
let userId = null;
let joueurId = null;

try {
  console.log('--- 1. signUp() (clé anon), comme à l\'inscription ---');
  const { data: signUpData, error: signUpError } = await db.auth.signUp({
    email: emailTest, password: 'DiagnosticRLS!2026',
    options: { data: { prenom: 'Diagnostic', nom: 'RLS', type: 'joueur' } },
  });
  if (signUpError) { console.error('signUp error:', signUpError.message); process.exit(1); }
  userId = signUpData?.user?.id;
  console.log('session présente juste après signUp ?', !!signUpData?.session);
  console.log('user.id :', userId);

  console.log('\n--- 2. INSERT joueurs (clé anon, comme à l\'inscription) ---');
  const { data: joueurData, error: joueurError, status: joueurStatus } = await db.from('joueurs').insert([{
    prenom: 'Diagnostic', nom: 'RLS', email: emailTest,
    poste: 'gardien', pied_fort: 'Droit',
    club: 'FC Rouen 1899', niveau: 'Ligue 3', saison: '2026-2027',
    matchs_joues: 0, buts: 0, badge: 'declaratif', score: 50, profil_public: false,
  }]).select().single();
  console.log('status:', joueurStatus, '| error:', joueurError ? joueurError.message : null);
  joueurId = joueurData?.id;
  console.log('joueur.id :', joueurId);

  if (joueurId) {
    console.log('\n--- 3. SELECT calendrier_officiel (clé anon, juste après signUp) ---');
    const { data: calData, error: calError, status: calStatus } = await db.from('calendrier_officiel').select('*').eq('saison', '2026-2027').eq('division', 'Ligue 3').limit(3);
    console.log('status:', calStatus, '| error:', calError ? calError.message : null, '| lignes:', calData ? calData.length : null);

    console.log('\n--- 4. INSERT matchs_joueur (clé anon, joueur_id réel, juste après signUp) ---');
    const { data: insData, error: insError, status: insStatus } = await db.from('matchs_joueur').insert([{
      joueur_id: joueurId,
      saison: '2026-2027', date_match: '2026-01-01', adversaire: 'Diagnostic RLS',
      competition: 'championnat', domicile: true, verifie: true,
    }]).select();
    console.log('status:', insStatus, '| error:', insError ? insError.message : null, '| data:', insData);
  }
} finally {
  console.log('\n--- Nettoyage (clé service_role) ---');
  if (joueurId) {
    await admin.from('matchs_joueur').delete().eq('joueur_id', joueurId);
    await admin.from('joueurs').delete().eq('id', joueurId);
    console.log('joueur de test supprimé.');
  }
  if (userId) {
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    console.log('utilisateur auth de test supprimé.', delErr ? `(erreur: ${delErr.message})` : '');
  }
}
