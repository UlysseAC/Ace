# Casino RP

Un jeu de rôle de soirée : une salle, des joueurs, un bookmaker, des courses
de chevaux, des investissements, des cartes à jouer contre les autres. Tout
tient dans une page web ouverte en même temps sur plusieurs appareils, qui
partagent la même partie en temps réel.

**Le site :** https://ulysseac.github.io/Ace/

## Les écrans

L'adresse est la même pour tous ; chacun choisit son écran dans le menu.

| Écran | Pour qui | À quoi il sert |
|---|---|---|
| 📱 **Banque automatisée** | les joueurs | Les bornes de la salle : solde, deck, missions, cartes à jouer. Un mode kiosque les verrouille sur une tablette. |
| 📺 **Écran d'affichage** | la salle | Le classement général, les événements, et les courses de chevaux en plein écran. |
| 🎩 **Bookmaker** | un meneur | Prend les paris, lance les courses, saisit les investissements. Sa vitrine est l'écran tourné vers les joueurs. |
| 🎲 **Croupier** · 🏦 **Banquier** | des meneurs | Les tables de jeu et la boutique. |
| 🛠️ **Admin & Config** | l'organisateur | Joueurs, missions, cartes, chevaux, projets, impression des chèques et des codes. |

## Avant la soirée

1. **Les comptes** — Admin, *Table 1 : Joueurs*. Un identifiant et un code par
   personne.
2. **Le papier** — Admin, l'imprimerie : des chèques de mission et des codes de
   carte, dix par page A4. Un code ne sert qu'une fois.
3. **La distribution** — Admin, *Distribution des cartes à la borne*, réglée sur
   **Masqués** : plus rien ne s'obtient sans un code imprimé. C'est le réglage
   de la vraie soirée ; les boutons ne servent qu'aux essais.
4. **Les bornes** — sur chaque tablette, ouvrir la Banque et appuyer sur
   *Passer en mode kiosque* : plein écran verrouillé, écran qui ne s'éteint
   pas, retour automatique sur la borne au redémarrage. Le code administrateur
   en fait sortir.
5. **Le départ** — Admin, *Démarrer la soirée*. Courses et blocs
   d'investissement se mettent en marche à partir de cet instant.

Le **mode simulation** (Réglages Bookmaker) sert à tout essayer sans attendre :
les courses se lancent à la main, et les temps de garde des cartes tombent à
dix secondes.

## Sous le capot

Une seule page, `multirole-mp-site/casino-rp/index.html`, en React servi par
Babel dans le navigateur — aucune étape de compilation. Les librairies sont
dans `vendor/`, pas sur un CDN : le site démarre même si le réseau de la salle
est lent ou filtré.

Les appareils se synchronisent par **Supabase** (`sync.js`), avec repli
autonome : sans base, chaque appareil garde sa propre partie. La configuration
va dans `supabase-config.js`, et `supabase-schema.sql` crée les deux tables.

## Mise en ligne

GitHub Pages, branche `main`, dossier `/ (root)`. Chaque push republie le site
en une à deux minutes. Le `index.html` de la racine redirige vers le jeu.

> Pages ne fonctionne sur un dépôt **privé** qu'avec un compte GitHub Pro ;
> sur un compte Free, rendre le dépôt privé dépublie le site.
