/*
 * Configuration de la base de données partagée.
 *
 * Tant que ce fichier n'est pas rempli, le site fonctionne en mode autonome :
 * chaque appareil garde ses propres données, comme avant. Dès qu'il est
 * rempli, les 8 appareils partagent la même partie en temps réel.
 *
 * Où trouver ces valeurs :
 *   console.firebase.google.com > ton projet > ⚙ Paramètres du projet
 *   > onglet "Général" > section "Tes applications" > application Web
 *
 * databaseURL doit pointer vers une Realtime Database (et non Firestore) :
 *   console Firebase > Realtime Database > Créer une base de données
 */
window.CONFIG_FIREBASE = {
  apiKey: "",
  databaseURL: "",
  projectId: ""
};
