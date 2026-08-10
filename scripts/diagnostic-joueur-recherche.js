// Diagnostic (lecture seule) : recherche un joueur par prénom/nom et affiche
// son profil complet, pour comprendre pourquoi il n'apparaît pas dans
// footlight-recherche.html (qui ne liste que profil_public = true).
import { createClient } from '@supabase/supabase-js';

const q = process.env.RECHERCHE;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!q) { console.error('RECHERCHE manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const mots = q.trim().split(/\s+/);
const or = mots.map((m) => `prenom.ilike.%${m}%,nom.ilike.%${m}%`).join(',');

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, email, club, niveau, saison, poste, badge, profil_public, created_at')
  .or(or)
  .order('created_at', { ascending: false });

if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${data.length} résultat(s) pour "${q}" :\n`);
for (const j of data) {
  console.log(`id=${j.id} | ${j.prenom} ${j.nom} | email="${j.email}" | club="${j.club}" | niveau="${j.niveau}" | saison="${j.saison}" | poste="${j.poste}" | badge="${j.badge}" | profil_public=${j.profil_public} | créé le ${j.created_at}`);
}
