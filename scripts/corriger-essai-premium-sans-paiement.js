// Corrige les comptes recruteurs qui ont reçu le plan Premium gratuitement
// à l'inscription (sans jamais passer par Stripe), via le mécanisme
// essai_fin/plan:'premium' introduit le 25/07 et retiré depuis (voir
// footlight-inscription-recruteur.html) faute de tâche de retour en Gratuit
// fonctionnelle. Un compte est concerné s'il a essai_fin renseigné mais pas
// de stripe_subscription_id (donc jamais de vrai abonnement payé).
//
// Sécurité : DRY_RUN=true par défaut — logue ce qui serait fait sans rien
// écrire.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('recruteurs')
  .select('id, prenom, nom, email, plan, essai_fin, stripe_subscription_id, created_at')
  .not('essai_fin', 'is', null);

if (error) { console.error('Erreur :', error.message); process.exit(1); }

const concernes = (data || []).filter((r) => !r.stripe_subscription_id);

console.log(`${data.length} compte(s) avec essai_fin renseigné, dont ${concernes.length} sans abonnement Stripe réel.\n`);

for (const r of concernes) {
  console.log(`${dryRun ? 'À corriger' : 'Correction'} : ${r.prenom} ${r.nom} <${r.email}> — plan actuel "${r.plan}", essai_fin ${r.essai_fin}, créé ${r.created_at}`);
  if (!dryRun) {
    const { error: updErr } = await supabase
      .from('recruteurs')
      .update({ plan: 'free', essai_fin: null })
      .eq('id', r.id);
    if (updErr) console.log(`  Erreur mise à jour : ${updErr.message}`);
  }
}

console.log(`\nRésumé : ${concernes.length} compte(s) ${dryRun ? 'à corriger' : 'corrigé(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été modifié. Relancer avec DRY_RUN=false pour corriger réellement.');
