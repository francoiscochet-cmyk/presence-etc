# Pointage équipe commerciale

Application web de pointage quotidien des présences pour une équipe
commerciale, pensée pour être remplie en 2 ou 3 clics par les managers.

**Lien de production** (à distribuer aux managers, aucun compte requis) :
`https://francoiscochet-cmyk.github.io/presence-etc/`

La logique applicative tient dans deux fichiers : **`src/App.jsx`** (tous les
écrans) et **`src/firebase.js`** (connexion à la base partagée). Le reste
(`vite.config.js`, `index.html`, `src/main.jsx`, Tailwind...) n'est que le
socle minimal permettant de lancer l'appli dans un navigateur.

## Fonctionnalités

- **Écran 1** : sélection du manager en un clic (grille de cartes), plus une
  carte « Direction » vers la vue consolidée en lecture seule.
- **Écran 2** : pointage du jour de l'équipe du manager, tout le monde
  pré-coché « Présent » — journée normale = 2 clics, un absent = 3 clics.
- **Écran 3** : confirmation avec récapitulatif en une ligne.
- Fonctions secondaires (jamais dans le chemin principal) : sélecteur de
  date, vue semaine en tableau, vue Direction (taux de présence par manager,
  filtres, export CSV), gestion de l'équipe (et des managers, depuis
  l'écran d'accueil).

## Données partagées en temps réel

Pas de backend à héberger : les données (managers, équipe, pointage) vivent
dans **Firebase Realtime Database** (offre gratuite). Dès qu'un manager
modifie quelque chose, tous les autres managers qui ont la page ouverte le
voient apparaître immédiatement — aucun compte n'est nécessaire côté
managers, juste le lien. Un bouton « Réinitialiser (pour tout le monde) avec
les données de démonstration », discret en bas de l'onglet Équipe, permet de
repartir des données d'exemple si besoin.

La configuration Firebase (`src/firebase.js`) contient des identifiants
publics par conception : dans le modèle Firebase, la sécurité vient des
règles de la base (lecture/écriture ouvertes ici, sur le chemin
`pointage-etc`), pas de la confidentialité de cette config.

## Démarrer le projet en local

```bash
npm install
npm run dev
```

Puis ouvrez l'URL affichée (par défaut http://localhost:5173). Se connecte à
la même base partagée que la production — pratique pour tester, mais les
changements sont alors visibles par tout le monde.

## Déploiement

Le déploiement sur GitHub Pages est automatique (voir
`.github/workflows/deploy.yml`) : chaque push sur `main` ou sur la branche de
développement construit le projet et publie `dist/` sur
`https://francoiscochet-cmyk.github.io/presence-etc/`.

## Technique

- React (hooks, état métier synchronisé via Firebase Realtime Database).
- Tailwind CSS pour le style, `lucide-react` pour les icônes.
- Données de démonstration (utilisées uniquement si la base est vide au tout
  premier chargement) : les 6 équipes réelles (Lenny, François, Julian,
  Alexis, Bertrand, Ulysse) et leurs commerciaux, avec des statuts variés sur
  les jours précédents.
