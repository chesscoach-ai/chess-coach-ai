# Preuves de validation — Phase 2.8

Exécution locale des 20 et 24 septembre 2026, Windows 11.

## Automatisation

| Vérification | Résultat |
| --- | --- |
| Frontend Vitest | 57 fichiers, 201 tests réussis |
| Backend Pytest | 109 tests + 15 sous-tests réussis, 1 test live OpenAI ignoré volontairement |
| Backend unittest | 85 tests réussis (sous-ensemble standard library) |
| ESLint | réussi |
| Next production build | réussi, 45 pages générées |
| Alembic base vierge | 0001→0007, `0007_clan_v2 (head)` |
| Tests migrations | 9 réussis, legacy/idempotence/rollback inclus |
| Smoke production local | PASS ; frontend health 503 attendu car DB volontairement absente |
| AAB release | build réussi, `jar verified`, SHA-256 `885C6C6829E8001D98D53884CB54575878FD596736AC8734443665360B53A0F1` |

## Production locale

- Backend sans `--reload` : `/health` 200, `/ready` 200 avec base locale non requise.
- Frontend `next start` : accueil 200, manifeste 200.
- `/dev/diagnostics`, `/api/dev/diagnostics`, `/api/dev/beta` : 404.
- URL `ritualPreview` : 404 en production ; preview non appliquée.
- URL `plus?preview=plus` : page publique normale, aucun droit accordé.
- Headers constatés : `nosniff`, `DENY`, referrer policy, permissions policy et HSTS.

## Validation visuelle web

Le navigateur piloté a vérifié :

- onboarding Nox responsive et skippable ;
- accueil mobile avec rituel, échiquier central et navigation basse ;
- passage direct vers **Analyser avec Nox** ;
- sélecteur d'adversaire IA placé au-dessus de l'échiquier ;
- plateau, pièces capturées, précision comparée, Nox, import PGN et historique présents ;
- mode invité expliqué et version `0.1.0-beta.2` visible ;
- aucune surface de diagnostic ou bouton debug visible.

La fenêtre de validation mesurait 640×618, plus contraignante en hauteur que 390×844. Le contenu reste navigable par défilement ; la barre basse reste fixe.

## Android

- `npx cap sync android` : réussi.
- Debug APK beta.2 : construit ; configuration `http://10.0.2.2:3000`, HTTP autorisé uniquement en debug.
- Release AAB : construit et signé ; URL HTTPS Render, `cleartext=false`, aucun fichier `.env`, keystore ou `google-services.json` embarqué.
- Source Gradle : `versionName 0.1.0-beta.2`, `versionCode 3`, package historique `com.chessclan.app`.
- Limitation : l'émulateur Pixel_10a a démarré mais est resté `unauthorized` dans ADB. L'APK n'a donc pas pu être installé/inspecté gestuellement dans cette exécution. Ce point reste une condition manuelle de la checklist, pas un succès simulé.

## Limites de la preuve

- Google OAuth ne peut être validé sans callback du domaine bêta ; email/mot de passe est le repli.
- PostgreSQL Render réel n'a pas été modifié pendant cette phase locale ; la chaîne Alembic est validée sur base vierge SQLite compatible et par tests d'adoption.
- Offline/background/reprise Android nécessitent l'autorisation ADB de l'émulateur.
- Aucune preuve OpenAI, Stripe, achat ou déploiement n'est attendue : tous sont volontairement désactivés.
