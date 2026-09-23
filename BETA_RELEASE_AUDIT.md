# Audit release — Knightly 0.1.0-beta.2

Date : 20 septembre 2026. Périmètre : bêta privée locale préparée pour 5 à 10 personnes. Aucun déploiement, achat, OpenAI ou paiement n'a été activé.

## Verdict

**GO WITH CONDITIONS.** La version est apte à une bêta privée après validation manuelle des points de la checklist de déploiement. Conditions : callback Google à revérifier sur l'URL finale (email/mot de passe reste le chemin fiable), base PostgreSQL gratuite sans garantie de conservation/sauvegarde, cold start et saturation Stockfish explicitement acceptés, documents juridiques à renseigner avant invitation, smoke Android gestuel à conserver comme preuve.

## Matrice de risques

| Niveau | Constat | Traitement |
| --- | --- | --- |
| BLOCKER corrigé | l'image backend pouvait démarrer après l'échec d'une migration | `set -e` arrête le démarrage ; `/ready` exige moteur et schéma Alembic à jour ; Render sonde `/ready` |
| HIGH corrigé | un joueur en partie compétitive pouvait ouvrir l'analyse, les exercices ou l'IA dans un autre onglet | verrou serveur `FAIR_PLAY_RESTRICTED`, réponse 409 humaine, test automatisé |
| HIGH maîtrisé | le fallback fichier perd ses données au redémarrage Render | la bêta Render utilise `DATABASE_URL` PostgreSQL ; le fallback reste DEV seulement |
| HIGH restant | Google OAuth dépend de la console Google et du domaine Render | non revendiqué comme validé ; email/mot de passe disponible |
| MEDIUM | Stockfish gratuit sature avec 10 demandes simultanées | file bornée, 503/timeout humain, application utilisable sans analyse |
| MEDIUM | rate limits en mémoire réinitialisés au redémarrage et non partagés | acceptable pour une seule instance et 5–10 testeurs, à remplacer avant public |
| MEDIUM | certaines tables historiques multiplayer/récompenses s'initialisent encore au premier usage frontend | aucune action SQL manuelle et données sur PostgreSQL, mais à intégrer à Alembic avant ouverture publique |
| MEDIUM | Render Free peut dormir et la base gratuite n'a pas de sauvegarde contractuelle | cold start documenté ; données bêta considérées non garanties |
| MEDIUM | package Android historique `com.chessclan.app` et deep link `chessclan://` | conservés pour compatibilité ; aucun ancien nom visible dans le manifeste PWA |
| LOW | CSP stricte non ajoutée | headers raisonnables présents ; pas de CSP improvisée susceptible de casser Next/Capacitor |

## Résultats d'audit

### Identité, auth et isolation

- L'identifiant produit canonique est l'email normalisé fourni par la session, pour credentials comme Google. Le UUID credentials reste interne au stockage Auth et ne sépare donc pas mémoire Nox, clan ou quotas d'un même email.
- Mots de passe hachés par bcrypt (coût 12), jamais renvoyés ; minimum de 8 caractères ; comparaison par bcrypt. Le test de persistance vérifie l'absence du mot de passe en clair.
- Login : 5 échecs par email normalisé bloquent 15 minutes, mémoire locale au processus. Signup ne possède pas encore une limite distribuée.
- Cookies et protections de session sont gérés par Auth.js ; HTTPS Render active les cookies sécurisés. Le backend coûteux est appelé côté serveur avec `BACKEND_API_SECRET`, pas directement par le navigateur.
- Les tests couvrent séparation mémoire/missions/progression, permissions multiplayer/clan et refus d'assistance pendant une partie. Les feedbacks sont write-only côté utilisateur et sans identité personnelle.
- Google OAuth nécessite `https://<web>.onrender.com/api/auth/callback/google`; faute de validation live dans cette phase locale, il reste une condition et non une promesse.

### Base et migrations

- Render relie frontend et backend à PostgreSQL `chess-coach-db`. Les stores critiques adoptés (identité, billing, Nox, clan, observabilité) n'exécutent plus de `CREATE TABLE` implicite. Quelques stores historiques multiplayer/récompenses s'initialisent encore de façon idempotente au premier usage ; c'est acceptable pour cette petite bêta mais reste une dette de migration.
- `alembic upgrade head` depuis une base vierge atteint `0007_clan_v2`; chaîne complète 0001→0007, adoption legacy, idempotence et rollback non destructif sont testés (9 tests).
- L'image backend applique les migrations avant Uvicorn et échoue fermement si elles échouent. `/ready` expose seulement l'état et les versions, jamais l'URL.
- Les données fichier/SQLite sont un repli local. Sur Render, une panne PostgreSQL rend le service non prêt au lieu de créer une base parallèle silencieuse.

### Stockfish, cache et charge

Configuration mesurée : pool 1, thread 1, hash 32 MB, file 6, profondeur 15, MultiPV 3.

| concurrence | succès | timeout file | médiane | maximum |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1/1 | 0 | 486 ms | 486 ms |
| 4 | 4/4 | 0 | 1 574 ms | 2 218 ms |
| 10 | 6/10 | 4 | 2 849 ms | 3 465 ms |

Les tests couvrent démarrage, pool, cache L1/L2, timeout, terminal positions, crash/restart et contrat des routes. À 10 analyses exactement simultanées, la limite est volontairement visible : quatre demandes expirent après environ 3 s. Les écrans conservent plateau/navigation et affichent un message humain. Sur Render Free, ajouter le cold start du conteneur à ces valeurs.

### Nox, apprentissage et produit

- Nox reste déterministe : `OPENAI_API_KEY`, `RUN_NOX_LIVE_TESTS` et `NOX_BENCHMARK_APPROVED` sont vides/faux.
- Les explications sont dérivées de ChessFacts/Stockfish ; les tests de contrat empêchent les affirmations échiquéennes non appuyées.
- Mémoire, mission, Session du jour, progression et Rituel ont des tests de génération, reprise, complétion, déduplication, jours/absences et isolation.
- Six rangs Nox possèdent leurs fichiers 256/512 WebP et un fallback SVG. L'artwork n'a pas été modifié.
- Invité → compte : les données serveur du compte commencent à la connexion ; aucune migration automatique des données locales invité n'est promise.

### Clan, multiplayer, freemium

- Clan : création, invitation, adhésion, permissions, limite, transfert/dissolution et partage privé par défaut sont couverts par les règles/stores.
- Multiplayer : création/rejoindre/coups/tour/fin/abandon sont couverts ; le nouveau verrou fair-play est évalué côté serveur, donc multi-onglet compris.
- Les previews `plus`, clan et rituel sont ignorées en build production. Le checkout exige trois bascules/readiness ; toutes restent fausses. Stripe et OpenAI restent désactivés.

### Analytics, feedback et confidentialité

- Les événements couvrent ouverture, partie, analyse, Nox, session, retour, clan et conversion Plus. Payload : UUID aléatoire, nom d'événement, page, plateforme et version ; aucun email, PGN ou conversation.
- Feedback : 10/h/IP ; bug : 20/h/IP ; événements : 300/h/IP. Schémas bornés, succès/erreurs gérés. Les tables PostgreSQL `beta_feedback`, `beta_bug_reports`, `beta_events` permettent la consultation par SQL administrateur ; `/api/dev/beta` répond 404 en production.
- Export/suppression existants couvrent compte et données Nox documentées ; ne pas présenter cela comme un effacement de sauvegardes externes inexistant.
- Les textes légaux utilisent des placeholders tant que `LEGAL_DOCUMENTS_REVIEWED=false` : compléter avant invitation externe.

### Web, PWA, Android et erreurs

- Headers : `nosniff`, anti-frame, referrer policy, permissions policy et HSTS en production. CORS backend limité aux origines locales ; la bêta passe par le proxy Next authentifié.
- Boundaries existantes empêchent un écran blanc pour Nox/progression/global. Backend down, saturation et timeout ont des états humains. Rafraîchir restaure les données persistées ; un état UI intermédiaire non sauvegardé peut être perdu.
- PWA : manifeste Knightly, standalone, icône maskable et service worker. Le nom historique n'est conservé que dans les identifiants natifs techniques.
- Android debug utilise explicitement `http://10.0.2.2:3000` et autorise HTTP uniquement en debug ; release impose HTTPS. L'APK et l'AAB sont construits, mais l'émulateur est resté `unauthorized` dans ADB : le smoke gestuel reste une condition. Version proposée `0.1.0-beta.2`, `versionCode 3`.

## Sauvegarde et récupération

- Redémarrage frontend/backend : données PostgreSQL conservées, limites mémoire remises à zéro, caches L1 perdus, L2 PostgreSQL conservé.
- Redémarrage DB : reconnexion par le pool ; indisponibilité temporaire visible via readiness. Aucun fallback fichier en bêta.
- Migration échouée : backend ne démarre pas ; corriger/revenir au commit antérieur puis relancer. Ne pas modifier la base manuellement.
- Render Free ne fournit pas ici une stratégie de sauvegarde validée. Considérer les données de cette cohorte comme expérimentales et exporter les feedbacks avant expiration/changement de base.

## Décision de version

`0.1.0-beta.2` est cohérent : durcissements incompatibles avec la preuve beta.1 (readiness, fair-play, réseau Android) sans changement majeur produit. Android incrémente de 2 à 3.
