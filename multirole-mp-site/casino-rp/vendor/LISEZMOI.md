# Librairies embarquées

Ces fichiers sont des copies de librairies publiques, placées ici pour que le
site démarre sans dépendre d'un serveur extérieur. Le jour de la partie, un
réseau lent, filtré par un VPN ou coupé quelques minutes laisserait sinon les
appareils sur un écran vide.

Ne pas les modifier : pour changer de version, remplacer le fichier par la
version voulue.

| Fichier               | Librairie             | Version  | Origine                              |
| --------------------- | --------------------- | -------- | ------------------------------------ |
| `react.js`            | React (production)    | 18.3.1   | `react/umd/react.production.min.js`   |
| `react-dom.js`        | ReactDOM (production) | 18.3.1   | `react-dom/umd/react-dom.production.min.js` |
| `babel.js`            | Babel Standalone      | 7.x      | `@babel/standalone/babel.min.js`     |
| `supabase.js`         | Supabase JS           | 2.112.4  | `@supabase/supabase-js/dist/umd/supabase.js` |
| `xlsx.js`             | SheetJS               | 0.18.5   | `xlsx/dist/xlsx.full.min.js`         |

## À propos de Babel

Babel pèse à lui seul près de 2,4 Mo, soit l'essentiel du dossier. Il sert à
traduire le JSX d'`index.html` directement dans le navigateur, ce qui permet de
modifier le code du jeu sans aucune étape de compilation.

Si le temps de chargement devenait gênant sur les téléphones, on pourrait
pré-compiler le JSX et supprimer Babel : le dossier tomberait à environ 340 Ko
et le démarrage serait nettement plus rapide, au prix d'une étape de
compilation à chaque modification du code.
