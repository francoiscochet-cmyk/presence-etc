# Pointage équipe commerciale

Application web de pointage quotidien des présences pour une équipe
commerciale, pensée pour être remplie en 2 ou 3 clics par les managers.

Toute la logique applicative tient dans un seul fichier : **`src/App.jsx`**.
Le reste des fichiers (`vite.config.js`, `index.html`, `src/main.jsx`,
Tailwind...) n'est que le socle minimal permettant de lancer ce composant
dans un navigateur.

## Fonctionnalités

- **Écran 1** : sélection du manager en un clic (grille de cartes), plus une
  carte « Direction » vers la vue consolidée en lecture seule.
- **Écran 2** : pointage du jour de l'équipe du manager, tout le monde
  pré-coché « Présent » — journée normale = 2 clics, un absent = 3 clics.
- **Écran 3** : confirmation avec récapitulatif en une ligne.
- Fonctions secondaires (jamais dans le chemin principal) : sélecteur de
  date, vue semaine en tableau, vue Direction (taux de présence par manager
  et par secteur, filtres, export CSV), gestion de l'équipe.

## Démarrer le projet

```bash
npm install
npm run dev
```

Puis ouvrez l'URL affichée (par défaut http://localhost:5173).

## Mémorisation des données

Il n'y a pas de backend, mais l'application sauvegarde automatiquement les
managers, la composition des équipes et le pointage dans le `localStorage`
du navigateur à chaque modification. Les noms saisis restent donc d'une
visite à l'autre sur le même appareil/navigateur (pas de synchronisation
entre appareils). Un bouton « Réinitialiser avec les données de
démonstration », discret en bas de l'onglet Équipe, permet d'effacer la
sauvegarde et de repartir des données d'exemple.

## Technique

- React (hooks, état géré via `useState`, persistance via `localStorage` —
  pas de backend).
- Tailwind CSS pour le style, `lucide-react` pour les icônes.
- Données de démonstration (utilisées tant qu'aucune sauvegarde locale
  n'existe) : 3 managers, 12 commerciaux répartis sur 4 secteurs, avec des
  statuts variés sur les jours précédents.
