// Diagnostic (lecture seule) : identifie quel joueur existant en base
// possède déjà l'un des emails auto-générés pour l'effectif Stade Brest 29 B,
// après l'échec de l'insertion sur la contrainte unique joueurs_email_key
// (0 doublon détecté par normalizeName, donc collision probablement due à un
// caractère invisible dans un prenom/nom existant que normalizeName ne
// nettoie pas mais que slugifyName absorbe).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

const NOMS = [
  ['Nando', 'Martinez'], ['Yanis', 'Ettori'], ['Kelyan', 'Graziani'], ['Angelo', 'Bico'],
  ['Paul', 'Rivoal'], ['Davy', 'Tia'], ['Evan', 'Mailly'], ['Nathan', 'Thomas'],
  ['Hugo', 'Bourgoin'], ['Sacha', 'Viel'], ['Kenan', 'Moulangou'], ['Axel', 'Lassus'],
  ['Noa', 'Mokhtari'], ['Yannis', 'Rabrun-Nellec'], ['Abdoul', 'Samaké'], ['Samba', 'Diop'],
  ['Ibrahim', 'Yayiya Kanté'], ['Yessine', 'Ben Mahmoud'], ['Mathis', 'Lainé'], ['Darri', 'Tifra'],
  ['Enzo', 'Monchatre'],
];

const emails = NOMS.map(([p, n]) => `${slugifyName(p)}.${slugifyName(n)}.manuel@scoute.footlight.fr`);

const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, email').in('email', emails);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${data.length} collision(s) trouvée(s) :`);
for (const r of data) {
  console.log(`  email="${r.email}" -> id=${r.id} | prenom="${r.prenom}" (len=${r.prenom.length}) | nom="${r.nom}" (len=${r.nom.length}) | club="${r.club}" | niveau="${r.niveau}"`);
}
