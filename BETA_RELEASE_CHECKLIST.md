# Checklist release — Knightly 0.1.0-beta.2

## Code et secrets

- [ ] Le commit candidat est identifié et `git status --short` est vide.
- [ ] Aucun `.env*` réel, keystore, `google-services.json`, token ou credential DB n'est suivi.
- [ ] `COMMERCIAL_LAUNCH_ENABLED`, `KNIGHTLY_PLUS_ENABLED`, `KNIGHTLY_CHECKOUT_ENABLED` sont `false`.
- [ ] OpenAI, Stripe, Firebase et APNs sont vides/désactivés.

## Données et services

- [ ] La même base PostgreSQL gratuite est reliée au frontend et au backend.
- [ ] `alembic upgrade head` atteint `0007_clan_v2` sans SQL manuel.
- [ ] Le backend échoue si la migration échoue.
- [ ] `/health` répond 200 et `/ready` répond 200 avec moteur et DB prêts.
- [ ] Render utilise `/ready` comme health check API.

## Tests automatiques

- [ ] Tous les tests backend passent.
- [ ] Tous les tests frontend passent.
- [ ] Lint passe.
- [ ] `npm run build` passe.
- [ ] Le smoke script passe sur le build production.
- [ ] Les tests fair-play et isolation de compte passent.

## Parcours manuels

- [ ] Signup/login/logout/mauvais mot de passe/reconnexion testés avec deux comptes.
- [ ] Google OAuth réellement testé ou explicitement retiré du parcours testeur.
- [ ] Partie, invitation, coups, tour, fin et abandon testés.
- [ ] Analyse et Nox restent interdits pendant une partie compétitive.
- [ ] Analyse, Nox, mémoire, mission, Session et Rituel testés après partie.
- [ ] Clan création/invitation/rejoindre/quitter/permissions testé à deux comptes.
- [ ] Feedback et bug persistent ; leurs erreurs et limites sont lisibles.
- [ ] Offline, backend down, refresh et deux onglets ne corrompent pas l'état.

## Web et mobile

- [ ] Vue mobile 390×844 parcourue de l'auth au feedback.
- [ ] Manifeste PWA Knightly, icônes et lancement standalone vérifiés.
- [ ] `/dev/diagnostics` est 404 ; previews rituel/clan/Plus sont ignorées.
- [ ] Android debug charge `10.0.2.2`, est installé et testé sur émulateur.
- [ ] Plateau tactile, Nox, clavier, Retour, background/reprise, offline/relaunch testés.
- [ ] AAB release `versionName 0.1.0-beta.2`, `versionCode 3`, signé et sans secret.

## Avant invitation

- [ ] L'identité légale/support/confidentialité est renseignée et relue.
- [ ] Les testeurs sont informés du cold start et du caractère non garanti des données bêta.
- [ ] Le plan de test et le questionnaire sont prêts.
- [ ] Une personne sait consulter `beta_events`, `beta_feedback`, `beta_bug_reports`.
- [ ] Le rollback vers le commit stable a été relu.
- [ ] Autorisation explicite de push/déploiement obtenue.
