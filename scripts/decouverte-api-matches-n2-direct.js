// Découverte lecture seule (aucune écriture) : le run précédent a
// confirmé que l'API interne FFF est appelable en fetch() simple, et a
// trouvé cpNo=452037/phNo=1/gpNo=5 pour National 2 poule 5, mais sans
// récupérer le corps JSON (capture réseau ratée). Appelle directement
// cette API pour récupérer enfin la vraie structure des données de match
// pour National 2 (noms d'équipes, ids, dates, statut).
const URL_N2 = 'https://epreuves.fff.fr/api/data/matches?cpNo=452037&phNo=1&gpNo=5&pjNo=1&itemsPerPage=20&page=1&pagination=true';

console.log(`URL : ${URL_N2}`);
const res = await fetch(URL_N2, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json',
    Referer: 'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/5/resultats-et-calendrier',
    Origin: 'https://epreuves.fff.fr',
  },
});
console.log(`Statut : ${res.status}`);
console.log('En-têtes réponse :', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));
const texte = await res.text();
console.log(`Corps complet :\n${texte}`);

// Deuxième essai : même URL que le test 1 qui avait fonctionné (National 1),
// pour vérifier que ce n'est pas un blocage général devenu permanent.
console.log('\n--- Nouvel essai sur National 1 (avait fonctionné juste avant) ---');
const res2 = await fetch('https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3&pjNo=1&itemsPerPage=20&page=1&pagination=true', {
  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
});
console.log(`Statut : ${res2.status}`);
console.log((await res2.text()).slice(0, 500));
