/*
 * Configuration de la base de données partagée (Supabase).
 *
 * Tant que ce fichier n'est pas rempli, le site fonctionne en mode autonome :
 * chaque appareil garde ses propres données. Dès qu'il est rempli, les
 * appareils partagent la même partie en temps réel.
 *
 * Marche à suivre, une seule fois :
 *   1. supabase.com > Start your project > se connecter avec GitHub
 *   2. New project (choisir une région proche, noter le mot de passe)
 *   3. SQL Editor > New query > coller supabase-schema.sql > Run
 *   4. Project Settings > API > copier :
 *        - Project URL          -> url
 *        - anon / public key    -> cle
 *
 * La clé « anon » est prévue pour vivre dans le code d'une page web : ce
 * n'est pas un secret. Ce qui protège la partie, ce sont les règles d'accès
 * définies dans supabase-schema.sql.
 */
window.CONFIG_SUPABASE = {
  url: "https://xeumjjbthbmtllpplonk.supabase.co",
  cle: "sb_publishable_zV9CI1EEQL0MUFX-9oJ5Xg_Z93h4tEq"
};
