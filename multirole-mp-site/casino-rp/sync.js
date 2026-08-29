/*
 * Couche de synchronisation temps réel entre les appareils de la partie.
 *
 * Sans configuration Supabase, tout reste local : `Sync.actif` vaut false et
 * useEtatPartage se comporte exactement comme React.useState.
 */
(function () {
  const config = window.CONFIG_SUPABASE || {};
  const disponible =
    typeof supabase !== "undefined" && !!config.url && !!config.cle;

  const client = disponible
    ? supabase.createClient(config.url, config.cle)
    : null;

  // La base ne stocke pas les tableaux vides et peut renvoyer un objet indexé
  // à la place d'un tableau : on rétablit toujours un vrai tableau, sinon les
  // .map/.some du jeu plantent au premier chargement. Les entrées vides sont
  // écartées : une suppression laisse parfois un trou, et un joueur nul ferait
  // planter l'affichage du classement.
  const nonVide = (x) => x !== null && x !== undefined;

  const versTableau = (v) => {
    if (Array.isArray(v)) return v.filter(nonVide);
    if (v && typeof v === "object") return Object.values(v).filter(nonVide);
    return [];
  };

  const CHAMPS_TABLEAU_JOUEUR = [
    "deck",
    "historique",
    "codesUtilises",
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
    codesRegistre: versTableau,
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

  // Applique sur la valeur de la base la modification faite localement,
  // plutôt que d'écraser avec notre copie. Deux appareils qui touchent le
  // même joueur en même temps voient ainsi leurs deux effets conservés.
  const fusionner = (distant, base, local) => {
    if (!distant) return local;
    const resultat = { ...distant };
    Object.keys(local).forEach((cle) => {
      const avant = base ? base[cle] : undefined;
      const apres = local[cle];
      if (JSON.stringify(avant) === JSON.stringify(apres)) return;

      if (typeof apres === "number" && typeof avant === "number") {
        // Montants : on rejoue l'écart, pas la valeur. Un débit de 100 et un
        // crédit de 500 simultanés donnent bien +400, et non l'un des deux.
        resultat[cle] = (Number(distant[cle]) || 0) + (apres - avant);
      } else if (Array.isArray(apres)) {
        const avantListe = Array.isArray(avant) ? avant : [];
        const distantListe = versTableau(distant[cle]);
        const identite = (x) =>
          x && typeof x === "object" ? x.id : JSON.stringify(x);
        const idsAvant = new Set(avantListe.map(identite));
        const idsApres = new Set(apres.map(identite));
        const ajoutes = apres.filter((x) => !idsAvant.has(identite(x)));
        const conserves = distantListe.filter(
          (x) => !(idsAvant.has(identite(x)) && !idsApres.has(identite(x)))
        );
        // L'historique se lit du plus récent au plus ancien : les nouvelles
        // lignes passent devant.
        resultat[cle] =
          cle === "historique"
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

  // -------------------------------------------------------------------
  // Abonnements. La base pousse les changements, on les redistribue aux
  // écrans intéressés. Chaque clé garde sa dernière valeur connue, pour
  // pouvoir la servir immédiatement à un nouvel abonné.
  // -------------------------------------------------------------------
  const abonnes = {}; // cle -> [rappel]
  const dernieres = {}; // cle -> valeur
  let joueursParId = {}; // id -> { donnees, version }
  let canal = null;

  const prevenir = (cle) => {
    (abonnes[cle] || []).forEach((r) => r(dernieres[cle]));
  };

  const listeJoueurs = () => Object.values(joueursParId).map((l) => l.donnees);

  const rafraichirJoueurs = async () => {
    const { data, error } = await client.from("joueurs").select("*");
    if (error) return console.error("Lecture des joueurs :", error);
    joueursParId = {};
    (data || []).forEach((l) => {
      joueursParId[l.id] = { donnees: l.donnees, version: l.version };
    });
    dernieres.joueurs = listeJoueurs();
    prevenir("joueurs");
  };

  const rafraichirEtat = async (cle) => {
    const { data, error } = await client
      .from("etat")
      .select("valeur")
      .eq("cle", cle)
      .maybeSingle();
    if (error) return console.error("Lecture de " + cle + " :", error);
    dernieres[cle] = data ? data.valeur : null;
    prevenir(cle);
  };

  const ouvrirCanal = () => {
    if (canal) return;
    canal = client
      .channel("partie")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "etat" },
        (msg) => {
          const ligne = msg.eventType === "DELETE" ? msg.old : msg.new;
          if (!ligne || !ligne.cle) return;
          dernieres[ligne.cle] =
            msg.eventType === "DELETE" ? null : msg.new.valeur;
          prevenir(ligne.cle);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "joueurs" },
        (msg) => {
          if (msg.eventType === "DELETE") {
            if (msg.old && msg.old.id) delete joueursParId[msg.old.id];
          } else {
            joueursParId[msg.new.id] = {
              donnees: msg.new.donnees,
              version: msg.new.version
            };
          }
          dernieres.joueurs = listeJoueurs();
          prevenir("joueurs");
        }
      )
      .subscribe((statut) => {
        // À la connexion comme à chaque reconnexion, on relit tout : un
        // appareil qui a perdu le réseau quelques minutes doit rattraper ce
        // qui s'est passé pendant son absence.
        if (statut === "SUBSCRIBED") {
          rafraichirJoueurs();
          Object.keys(abonnes)
            .filter((c) => c !== "joueurs")
            .forEach(rafraichirEtat);
        }
      });
  };

  // Écrit un joueur en rejouant notre modification sur la version courante.
  // Si quelqu'un a écrit entre-temps, la mise à jour ne touche aucune ligne :
  // on relit et on recommence.
  const ecrireJoueur = async (id, base, valeur, essai = 0) => {
    const connu = joueursParId[id];

    if (!connu) {
      const { error } = await client
        .from("joueurs")
        .insert({ id, donnees: valeur, version: 0 });
      if (error && error.code === "23505" && essai < 5) {
        // Créé par un autre appareil entre-temps : on repasse en modification.
        await rafraichirJoueurs();
        return ecrireJoueur(id, base, valeur, essai + 1);
      }
      if (error) throw error;
      joueursParId[id] = { donnees: valeur, version: 0 };
      return;
    }

    const fusionne = fusionner(connu.donnees, base, valeur);
    const { data, error } = await client
      .from("joueurs")
      .update({
        donnees: fusionne,
        version: connu.version + 1,
        modifie_le: new Date().toISOString()
      })
      .eq("id", id)
      .eq("version", connu.version)
      .select();

    if (error) throw error;
    if ((!data || data.length === 0) && essai < 5) {
      // Version dépassée : quelqu'un a écrit avant nous, on rejoue dessus.
      await rafraichirJoueurs();
      return ecrireJoueur(id, base, valeur, essai + 1);
    }
    if (data && data[0]) {
      joueursParId[id] = { donnees: data[0].donnees, version: data[0].version };
    }
  };

  const Sync = {
    actif: disponible,

    // Nombre d'écritures encore en attente, pour l'affichage.
    enAttente: () => enCours,

    ecouter(cle, rappel) {
      if (!disponible) return () => {};
      abonnes[cle] = (abonnes[cle] || []).concat(rappel);
      ouvrirCanal();
      if (cle in dernieres) rappel(dernieres[cle]);
      else if (cle === "joueurs") rafraichirJoueurs();
      else rafraichirEtat(cle);
      return () => {
        abonnes[cle] = (abonnes[cle] || []).filter((r) => r !== rappel);
      };
    },

    ecrire(cle, valeur) {
      if (!disponible) return;
      if (cle === "joueurs") return Sync.ecrireJoueurs([], valeur);
      enfiler(async () => {
        const { error } = await client
          .from("etat")
          .upsert(
            { cle, valeur, modifie_le: new Date().toISOString() },
            { onConflict: "cle" }
          );
        if (error) throw error;
      });
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
        enfiler(() => ecrireJoueur(j.id, base, valeur));
      });

      // Un joueur retiré de la liste doit aussi disparaître de la base.
      const idsApres = new Set(apres.map((j) => j.id));
      avant.forEach((j) => {
        if (!idsApres.has(j.id)) {
          enfiler(async () => {
            const { error } = await client
              .from("joueurs")
              .delete()
              .eq("id", j.id);
            if (error) throw error;
            delete joueursParId[j.id];
          });
        }
      });
    },

    // L'animation du dé doit se jouer sur l'écran de la salle, pas seulement
    // sur le téléphone du lanceur : on la diffuse comme un événement.
    diffuser(evenement) {
      if (!disponible) return;
      Sync.ecrire("evenement", { ...evenement, ts: Date.now() });
    },

    // Exposée pour pouvoir vérifier la politique de fusion indépendamment du
    // réseau : c'est elle qui décide du sort de deux modifications
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
        const vide =
          brut === null ||
          brut === undefined ||
          (Array.isArray(brut) && brut.length === 0);
        if (vide) {
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
