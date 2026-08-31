// -----------------------------------------------------------------------------
// CONFIGURATION FIREBASE — base de données partagée entre tous les managers
// -----------------------------------------------------------------------------
// Ces valeurs ne sont pas des secrets à cacher : dans le modèle Firebase, la
// sécurité vient des règles de la base (voir la console Firebase du projet),
// pas de la confidentialité de cette config. Elle est faite pour vivre dans
// le code d'une application web publique.
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBhUHcSs8YKcQO0xXyksZfLYUX0NZe3Nsg',
  authDomain: 'pointage-simple.firebaseapp.com',
  databaseURL: 'https://pointage-simple-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'pointage-simple',
  storageBucket: 'pointage-simple.firebasestorage.app',
  messagingSenderId: '770782519091',
  appId: '1:770782519091:web:08336874df776cd6762846',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Chemin unique, dans la base, sous lequel vit tout l'état partagé de
// l'application (managers, équipe, pointage). Doit correspondre à la clé
// utilisée dans les règles de la Realtime Database.
export const CHEMIN_DONNEES = 'pointage-etc';
