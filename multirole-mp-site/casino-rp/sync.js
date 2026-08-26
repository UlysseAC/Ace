/*
 * Couche de synchronisation temps réel entre les appareils de la partie.
 *
 * Sans configuration Firebase, tout reste local : `Sync.actif` vaut false et
 * useEtatPartage se comporte exactement comme React.useState.
 */
(function () {
  const config = window.CONFIG_FIREBASE || {};
  const disponible =
    typeof firebase !== "undefined" &&
    !!config.apiKey &&
    !!config.databaseURL;

  let racine = null;
  if (disponible) {
    firebase.initializeApp(config);
    racine = firebase.database().ref("partie");
  }

  // Firebase ne stocke pas les tableaux vides et renvoie parfois un objet
  // indexé à la place d'un tableau : on rétablit toujours un vrai tableau,
  // sinon les .map/.some du jeu plantent au premier chargement.
  // Les entrées vides sont écartées : une suppression laisse parfois un trou,
  // et un joueur nul ferait planter l'affichage du classement.
  const nonVide = (x) => x !== null && x !== undefined;

  const versTableau = (v) => {
    if (Array.isArray(v)) return v.filter(nonVide);
    if (v && typeof v === "object") return Object.values(v).filter(nonVide);
    return [];
  };

  const CHAMPS_TABLEAU_JOUEUR = [
    "deck",
    "historique",
    "qrCodesUtilises",
    "missionsFaites",
    "produitsAchetes",
    "penalitesSubies"
  ];

  const normaliserJoueur = (j) => {
    const propre = { ...j };
    CHAMPS_TABLEAU_JOUEUR.forEach((champ) => {
      propre[champ] = versTableau(propre[champ]);
    });
    return propre;
  };

  const normalisateurs = {
    joueurs: (v) =>
      versTableau(v)
        .map(normaliserJoueur)
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0)),
    desConfig: (v) =>
      versTableau(v).map((d) => ({ ...d, faces: versTableau(d.faces) })),
    configGlobale: (v) => ({
      ...v,
      raccourcisTactiles: versTableau(v && v.raccourcisTactiles)
    }),
    missions: versTableau,
    produits: versTableau,
    penalites: versTableau,
    cartesJeu: versTableau,
    qrCodesRegistre: versTableau,
    historiqueFiscal: versTableau,
    historiqueAffichage: versTableau
  };

  const Sync = {
    actif: disponible,

    ecouter(cle, rappel) {
      if (!disponible) return () => {};
      const noeud = racine.child(cle);
      const handler = noeud.on("value", (snap) => rappel(snap.val()));
      return () => noeud.off("value", handler);
    },

    ecrire(cle, valeur) {
      if (!disponible) return;
      if (cle === "joueurs") return Sync.ecrireJoueurs([], valeur);
      racine.child(cle).set(valeur);
    },

    // N'écrit que les joueurs réellement modifiés. Sans ça, le croupier qui
    // débite Steph écraserait le panier que le banquier vient de valider
    // pour Alex, puisque les deux enverraient la liste entière.
    ecrireJoueurs(avant, apres) {
      if (!disponible) return;
      const empreinteAvant = {};
      avant.forEach((j, i) => {
        empreinteAvant[j.id] = JSON.stringify({ ...j, ordre: i });
      });
      const modifs = {};
      apres.forEach((j, i) => {
        const valeur = { ...j, ordre: i };
        if (empreinteAvant[j.id] !== JSON.stringify(valeur)) {
          modifs[j.id] = valeur;
        }
      });
      // Un joueur retiré de la liste doit aussi disparaître de la base :
      // une mise à jour n'efface rien, il faut demander sa suppression.
      const idsApres = new Set(apres.map((j) => j.id));
      avant.forEach((j) => {
        if (!idsApres.has(j.id)) modifs[j.id] = null;
      });
      if (Object.keys(modifs).length > 0) {
        racine.child("joueurs").update(modifs);
      }
    },

    // L'animation du dé doit se jouer sur l'écran de la salle, pas seulement
    // sur le téléphone du lanceur : on la diffuse comme un événement.
    diffuser(evenement) {
      if (!disponible) return;
      racine.child("evenement").set({ ...evenement, ts: Date.now() });
    },

    normaliser(cle, brut) {
      const f = normalisateurs[cle];
      return f ? f(brut) : brut;
    }
  };

  window.Sync = Sync;

  /*
   * Remplaçant direct de React.useState pour les données partagées.
   * Même signature, donc tous les setJoueurs(prev => ...) existants
   * continuent de fonctionner sans être modifiés.
   */
  window.useEtatPartage = function (cle, valeurInitiale) {
    const [valeur, poser] = React.useState(valeurInitiale);
    const ref = React.useRef(valeur);
    ref.current = valeur;
    const dejaSeme = React.useRef(false);

    React.useEffect(() => {
      if (!Sync.actif) return;
      return Sync.ecouter(cle, (brut) => {
        if (brut === null || brut === undefined) {
          // Base vide : le premier appareil connecté y dépose l'état initial.
          if (!dejaSeme.current) {
            dejaSeme.current = true;
            Sync.ecrire(cle, ref.current);
          }
          return;
        }
        dejaSeme.current = true;
        const propre = Sync.normaliser(cle, brut);
        ref.current = propre;
        poser(propre);
      });
    }, []);

    const majValeur = React.useCallback((maj) => {
      const avant = ref.current;
      const apres = typeof maj === "function" ? maj(avant) : maj;
      ref.current = apres;
      poser(apres);
      if (!Sync.actif) return;
      if (cle === "joueurs") Sync.ecrireJoueurs(avant, apres);
      else Sync.ecrire(cle, apres);
    }, []);

    return [valeur, majValeur];
  };
})();
