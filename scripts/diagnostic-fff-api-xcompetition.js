// Diagnostic lecture seule : diagnostic-fff-api-headers.js a révélé que la
// requête qui réussit envoie un en-tête personnalisé "x-competition"
// (jeton opaque, absent de toutes les tentatives précédentes qui ont
// toutes échoué en 403). Teste si le rejouer suffit à débloquer un
// fetch() nu, sans navigateur, avec la plage de dates complète de la saison.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier',
  'x-competition': '80cb2ae0bcee96250927df322696e781fbebf1e3',
};

const url = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3&dateDebut=2026-07-01T00:00:00%2B00:00&dateFin=2027-06-30T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true';
const res = await fetch(url, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
const texte = await res.text();
console.log(`Taille réponse : ${texte.length} caractères`);

let data;
try {
  data = JSON.parse(texte);
} catch {
  console.log('Pas du JSON valide, aperçu :');
  console.log(texte.slice(0, 1000));
  process.exit(0);
}

console.log(`Clés racine : ${JSON.stringify(Object.keys(data))}`);
const liste = Array.isArray(data) ? data : (data.member || data.data || data['hydra:member'] || null);
if (!liste) {
  console.log('Structure inattendue :');
  console.log(JSON.stringify(data, null, 2).slice(0, 3000));
  process.exit(0);
}
console.log(`Nombre de matchs : ${liste.length}`);
console.log('\nPremier match (structure complète) :');
console.log(JSON.stringify(liste[0], null, 2));

console.log('\nToutes les dates présentes (uniques, triées) :');
const dates = [...new Set(liste.map((m) => (m.date || m.dateMatch || m.dateRencontre || '').slice(0, 10)))].sort();
console.log(dates.join(', '));

console.log(`\n"Touraine" présent : ${texte.toLowerCase().includes('touraine')}`);
