import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration Vite minimale pour l'application de pointage.
// `base` correspond au nom du dépôt : nécessaire pour que les assets se
// chargent correctement une fois servis depuis GitHub Pages
// (https://<utilisateur>.github.io/presence-etc/).
export default defineConfig({
  plugins: [react()],
  base: '/presence-etc/',
});
