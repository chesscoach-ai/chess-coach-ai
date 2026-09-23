# Environnements Knightly

## Contrat des environnements

| Capacité | Local DEV | Bêta / staging Render | Production future |
| --- | --- | --- | --- |
| Build | `next dev` | `next build` + `next start` | identique à la bêta |
| Données | fallback `.data` / cache SQLite | PostgreSQL Render gratuit | PostgreSQL persistant + sauvegardes |
| Stockfish | binaire local, 1 moteur | 1 moteur, 1 thread, 32 MB, file 6 | à mesurer avant modification |
| Nox | déterministe | déterministe | déterministe ; OpenAI seulement après décision explicite |
| Outils `/dev/*` et previews URL | disponibles | 404 / ignorés car build production | 404 / ignorés |
| Knightly+ / checkout | désactivés | désactivés | activation séparée après revue légale et paiement |
| Google OAuth | optionnel | optionnel, callback Render à valider | callback du domaine final |

`NODE_ENV` protège les outils de développement du framework et les previews. Les capacités à risque ont en plus leurs bascules explicites : `COMMERCIAL_LAUNCH_ENABLED`, `KNIGHTLY_PLUS_ENABLED`, `KNIGHTLY_CHECKOUT_ENABLED`, `ANALYSIS_DEV_UNLOCK`, `RUN_NOX_LIVE_TESTS` et `NOX_BENCHMARK_APPROVED`. Toutes restent à `false` en bêta.

## Variables frontend

| Variable | Rôle | Local | Bêta | Défaut sûr |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | signature des sessions Auth.js | obligatoire pour le mode production local | obligatoire, secret généré | aucun |
| `AUTH_URL` | origine publique Auth.js | `http://localhost:3000` | URL HTTPS Render | aucun |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | OAuth Google | optionnel | optionnel ; les deux ensemble | vides |
| `DATABASE_URL` | persistance comptes et produit | optionnel | obligatoire | vide = fichiers locaux DEV |
| `BACKEND_URL` | URL interne de l'API Python | `http://127.0.0.1:8000` | service Render | aucun |
| `BACKEND_HOSTPORT` | repli `host:port` pour l'API | optionnel | optionnel | vide |
| `BACKEND_API_SECRET` | authentification Next → Python | optionnel | obligatoire et identique côté backend | vide |
| `COMMERCIAL_LAUNCH_ENABLED` | autorisation commerciale finale | `false` | `false` | `false` |
| `KNIGHTLY_PLUS_ENABLED` | visibilité fonctionnelle Plus | `false` | `false` | `false` |
| `KNIGHTLY_CHECKOUT_ENABLED` | autorisation checkout | `false` | `false` | `false` |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_WEBHOOK_SECRET` | Stripe futur | vides | vides | vides |
| `ANALYSIS_PRICE_MONTHLY_CENTS`, `ANALYSIS_PRICE_ANNUAL_CENTS` | prix cible informatif | `200`, `1999` | `200`, `1999` | cible produit |
| `ANALYSIS_PREVIEW_EMAILS` | comptes autorisés à tester l'analyse avant lancement | optionnel | liste contrôlée | vide |
| `ANALYSIS_LIFETIME_EMAIL_HASHES` | droits historiques par empreinte | optionnel | optionnel | vide |
| `ANALYSIS_DEV_UNLOCK` | déverrouillage local | `false` | interdit | `false` |
| `LEGAL_*`, `SUPPORT_EMAIL`, `PRIVACY_EMAIL` | identité et versions juridiques | placeholders | à renseigner avant invitation | non validés |
| `LEGAL_DOCUMENTS_REVIEWED` | revue humaine des textes | `false` | `false` tant que non revue | `false` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` | Web Push optionnel | vides | optionnels | désactivé |
| `CAPACITOR_SERVER_URL` | URL chargée par l'app hybride | `http://10.0.2.2:3000` pour émulateur | URL HTTPS publique | aucune |
| `FIREBASE_SERVICE_ACCOUNT_JSON`, `APNS_*` | push natif futur | vides | vides | désactivé |
| `RENDER_GIT_COMMIT` | version du commit, injectée par Render | absent | automatique | absent |

## Variables backend

| Variable | Rôle | Local | Bêta | Défaut sûr |
| --- | --- | --- | --- | --- |
| `BACKEND_API_SECRET` | protège les routes coûteuses | optionnel | obligatoire | vide |
| `DATABASE_URL` | migrations + cache L2 PostgreSQL | optionnel | obligatoire | cache SQLite local |
| `PORT` | port Uvicorn | `8000` | fourni par Render | `10000` dans l'image |
| `STOCKFISH_PATH` | binaire moteur | auto-détection | image Docker | auto-détection |
| `STOCKFISH_POOL_SIZE`, `STOCKFISH_THREADS`, `STOCKFISH_HASH_MB`, `STOCKFISH_MAX_QUEUE_SIZE` | capacité moteur | `1`, `1`, `32`, `6` | mêmes valeurs | conservateur |
| `STOCKFISH_DEFAULT_DEPTH` | profondeur standard | `15` | `15` | `15` |
| `STOCKFISH_QUEUE_TIMEOUT`, `STOCKFISH_ANALYSIS_TIMEOUT`, `STOCKFISH_TOTAL_TIMEOUT` | limites temporelles | `3`, `10`, `12` s | mêmes valeurs | borné |
| `STOCKFISH_MAX_RETRIES`, `STOCKFISH_PROTOCOL_TIMEOUT_GRACE`, `STOCKFISH_SLOW_OPERATION_THRESHOLD` | résilience/diagnostic | `1`, `0.25`, `5` | mêmes valeurs | borné |
| `ANALYSIS_CACHE_L1_MAX_ENTRIES`, `ANALYSIS_CACHE_SQLITE_PATH` | cache mémoire/local | `256`, auto | L1 + PostgreSQL | local |
| `CACHE_NAMESPACE_VERSION`, `STOCKFISH_CACHE_ENGINE_VERSION`, `STOCKFISH_ANALYSIS_PROFILE_VERSION` | invalidation sûre du cache | `1`, `17`, `standard-v1` | mêmes valeurs | versionné |
| `NOX_CACHE_SQLITE_PATH`, `NOX_PROMPT_VERSION` | cache Nox déterministe | optionnel, `v1` | PostgreSQL/`v1` | local |
| `OPENAI_API_KEY`, `NOX_OPENAI_MODEL`, `RUN_NOX_LIVE_TESTS`, `NOX_BENCHMARK_APPROVED` | benchmark OpenAI uniquement | vides/`false` | vides/`false` | désactivé |

Les variables présentes dans `.env.example` mais non consommées à l'exécution (`FIREBASE_SERVICE_ACCOUNT_JSON`, `APNS_*`) sont des réservations documentées pour une phase mobile future, pas des dépendances de la bêta.
