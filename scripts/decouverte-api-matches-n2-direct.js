// Découverte lecture seule (aucune écriture) : le run précédent a
// confirmé que l'API interne FFF est appelable en fetch() simple, et a
// trouvé cpNo=452037/phNo=1/gpNo=5 pour National 2 poule 5, mais sans
// récupérer le corps JSON (capture réseau ratée). Appelle directement
// cette API pour récupérer enfin la vraie structure des données de match
// pour National 2 (noms d'équipes, ids, dates, statut).
const URL_N2 = 'https://epreuves.fff.fr/api/data/matches?cpNo=452037&phNo=1&gpNo=5&pjNo=1&itemsPerPage=20&page=1&pagination=true';

console.log(`URL : ${URL_N2}`);
const res = await fetch(URL_N2, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
console.log(`Statut : ${res.status}`);
const texte = await res.text();
console.log(`Corps complet :\n${texte}`);
