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

  /*
   * File d'attente des écritures.
   *
   * Les actions partent dans l'ordre où elles ont été demandées, une seule à
   * la fois : la suivante attend que la précédente soit confirmée par la base.
   * Aucun délai n'est ajouté — la file se vide aussi vite que le réseau le
   * permet, et l'affichage local, lui, ne l'attend pas.
   */
  let chaine = Promise.resolve();
  let enCours = 0;

  const enfiler = (tache) => {
    enCours++;
    chaine = chaine
      .then(tache)
      .catch((e) => console.error("Synchronisation :", e))
      .then(() => {
        enCours--;
      });
    return chaine;
  };

  // Applique sur la valeur du serveur la modification faite localement,
  // plutôt que d'écraser avec notre copie. Deux appareils qui touchent le
  // même joueur en même temps voient ainsi leurs deux effets conservés.
  const fusionner = (serveur, base, local) => {
    if (!serveur) return local;
    const resultat = { ...serveur };
    Object.keys(local).forEach((cle) => {
      const avant = base ? base[cle] : undefined;
      const apres = local[cle];
      if (JSON.stringify(avant) === JSON.stringify(apres)) return;

      if (typeof apres === "number" && typeof avant === "number") {
        // Montants : on rejoue l'écart, pas la valeur. Un débit de 100 et un
        // crédit de 500 simultanés donnent bien +400, et non l'un des deux.
        resultat[cle] = (Number(serveur[cle]) || 0) + (apres - avant);
      } else if (Array.isArray(apres)) {
        const avantListe = Array.isArray(avant) ? avant : [];
        const serveurListe = versTableau(serveur[cle]);
        const identite = (x) =>
          x && typeof x === "object" ? x.id : JSON.stringify(x);
        const idsAvant = new Set(avantListe.map(identite));
        const idsApres = new Set(apres.map(identite));
        const ajoutes = apres.filter((x) => !idsAvant.has(identite(x)));
        const conserves = serveurListe.filter(
          (x) => !(idsAvant.has(identite(x)) && !idsApres.has(identite(x)))
        );
        // L'historique se lit du plus récent au plus ancien : les nouvelles
        // lignes passent devant.
        resultat[cle] = cle === "historique"
          ? ajoutes.concat(conserves)
          : conserves.concat(
              ajoutes.filter(
                (x) => !conserves.some((y) => identite(y) === identite(x))
              )
            );
      } else {
        resultat[cle] = apres;
      }
    });
    return resultat;
  };

  const Sync = {
    actif: disponible,

    // Nombre d'écritures encore en attente, pour l'affichage.
    enAttente: () => enCours,

    ecouter(cle, rappel) {
      if (!disponible) return () => {};
      const noeud = racine.child(cle);
      const handler = noeud.on("value", (snap) => rappel(snap.val()));
      return () => noeud.off("value", handler);
    },

    ecrire(cle, valeur) {
      if (!disponible) return;
      if (cle === "joueurs") return Sync.ecrireJoueurs([], valeur);
      enfiler(() => racine.child(cle).set(valeur));
    },

    // N'écrit que les joueurs réellement modifiés, un par un. Sans ça, le
    // croupier qui débite Steph écraserait le panier que le banquier vient de
    // valider pour Alex, puisque les deux enverraient la liste entière.
    ecrireJoueurs(avant, apres) {
      if (!disponible) return;
      const baseParId = {};
      avant.forEach((j, i) => {
        baseParId[j.id] = { ...j, ordre: i };
      });

      apres.forEach((j, i) => {
        const valeur = { ...j, ordre: i };
        const base = baseParId[j.id];
        if (base && JSON.stringify(base) === JSON.stringify(valeur)) return;
        enfiler(
          () =>
            new Promise((resolve, reject) =>
              racine
                .child("joueurs/" + j.id)
                .transaction(
                  (serveur) => fusionner(serveur, base, valeur),
                  (e) => (e ? reject(e) : resolve())
                )
            )
        );
      });

      // Un joueur retiré de la liste doit aussi disparaître de la base :
      // une mise à jour n'efface rien, il faut demander sa suppression.
      const idsApres = new Set(apres.map((j) => j.id));
      avant.forEach((j) => {
        if (!idsApres.has(j.id)) {
          enfiler(() => racine.child("joueurs/" + j.id).set(null));
        }
      });
    },

    // L'animation du dé doit se jouer sur l'écran de la salle, pas seulement
    // sur le téléphone du lanceur : on la diffuse comme un événement.
    diffuser(evenement) {
      if (!disponible) return;
      enfiler(() =>
        racine.child("evenement").set({ ...evenement, ts: Date.now() })
      );
    },

    // Exposée pour pouvoir vérifier la politique de fusion indépendamment
    // du réseau : c'est elle qui décide du sort de deux modifications
    // concurrentes sur un même joueur.
    fusionner,

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
