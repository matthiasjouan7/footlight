// Récupère (lecture seule) les stats des 4 joueurs libres depuis Supabase
// et les imprime en JSON sur stdout. Pas de Playwright/Chromium ici : ce
// script sert uniquement à alimenter une page HTML générée côté client
// (artifact), que l'utilisateur filme lui-même à l'écran.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://migarohddystlyhuoxfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2Fyb2hkZHlzdGx5aHVveGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjI2NjksImV4cCI6MjA5Mjk5ODY2OX0.NKlySSVpnws5WZF41T2qeoMjBi5VZzpnk_h-ejTj9R4';
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const JOUEURS = [
  { prenom: 'Yves', nom: 'DjeDje' },
  { prenom: 'Luderic', nom: 'Etonde' },
  { prenom: 'Salim', nom: 'Jabi' },
  { prenom: 'Adama', nom: 'Diop' },
];

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

const { data: allJoueurs, error } = await db.from('joueurs')
  .select('prenom,nom,poste,badge,buts,passes_decisives,matchs_joues,buts_encaisses_avec');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

function trouverJoueur(prenom, nom) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  return (allJoueurs || []).find((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
}

const profils = JOUEURS.map(({ prenom, nom }) => {
  const j = trouverJoueur(prenom, nom);
  return {
    prenom, nom,
    poste: j ? j.poste : null,
    badge: j ? j.badge : null,
    buts: j ? j.buts : null,
    passes_decisives: j ? j.passes_decisives : null,
    matchs_joues: j ? j.matchs_joues : null,
    buts_encaisses_avec: j ? j.buts_encaisses_avec : null,
  };
});

console.log('===JSON_START===');
console.log(JSON.stringify(profils));
console.log('===JSON_END===');
