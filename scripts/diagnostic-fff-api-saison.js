// Diagnostic lecture seule : l'API JSON FFF découverte via
// diagnostic-fff-api.js (epreuves.fff.fr/api/data/matches) accepte
// dateDebut/dateFin — teste avec une plage couvrant toute la saison
// 2026-2027 plutôt que la semaine courante, pour vérifier qu'un seul (ou
// quelques) appel(s) suffit à récupérer tout le calendrier du groupe C
// (cpNo=452036, phNo=1, gpNo=3, découverts sur la page National 1).
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const url = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3&dateDebut=2026-07-01T00:00:00%2B00:00&dateFin=2027-06-30T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true';
const res = await fetch(url, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
const texte = await res.text();
console.log(`Taille réponse : ${texte.length} caractères`);

let data;
try {
  data = JSON.parse(texte);
} catch (err) {
  console.log('Pas du JSON valide, aperçu brut :');
  console.log(texte.slice(0, 1000));
  process.exit(0);
}

console.log(`Clés racine : ${JSON.stringify(Object.keys(data))}`);
const liste = Array.isArray(data) ? data : (data.member || data.data || data['hydra:member'] || null);
if (!liste) {
  console.log('Structure inattendue, dump complet (tronqué) :');
  console.log(JSON.stringify(data, null, 2).slice(0, 3000));
  process.exit(0);
}
console.log(`Nombre de matchs : ${liste.length}`);
console.log('\nPremier match (structure complète) :');
console.log(JSON.stringify(liste[0], null, 2));
console.log('\n3 matchs suivants (résumé) :');
for (const m of liste.slice(1, 4)) console.log(JSON.stringify(m));

console.log('\nToutes les dates présentes (uniques, triées) :');
const dates = [...new Set(liste.map((m) => (m.date || m.dateMatch || m.dateRencontre || '').slice(0, 10)))].sort();
console.log(dates.join(', '));

console.log(`\n"Touraine" présent : ${texte.toLowerCase().includes('touraine')}`);
