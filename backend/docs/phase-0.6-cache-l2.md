# Phase 0.6 — cache durable L2

## Flux

`requête → L1 mémoire → L2 durable → Stockfish → ChessFacts → L2 → L1`

- L1 reste un LRU en mémoire, limité à 128 entrées par défaut.
- L2 utilise SQLite localement et PostgreSQL dès que `DATABASE_URL` existe.
- Une lecture, écriture, validation ou initialisation L2 en échec n'empêche
  jamais l'analyse Stockfish.
- Le L2 ne stocke que la FEN et les faits échiquéens. Il ne contient ni compte,
  ni e-mail, ni identifiant utilisateur.

## Clé et invalidation

La clé est le SHA-256 d'un JSON canonique contenant :

- version du schéma `ChessFacts` ;
- FEN normalisée à six champs ;
- profondeur demandée ;
- MultiPV demandé ;
- version/namespace Stockfish ;
- version du profil d'analyse ;
- `CACHE_NAMESPACE_VERSION`.

`Threads` et `Hash` sont exclus : ils règlent les ressources et la vitesse,
pas le contrat fonctionnel d'une analyse à profondeur donnée. Toute option UCI
qui modifie le sens du résultat doit entraîner une nouvelle version de profil.
La taille du pool, l'emplacement du binaire, les timeouts et l'utilisateur sont
également exclus.

L'invalidation est automatique par changement de clé, validation Pydantic du
payload, TTL (30 jours par défaut) et éviction LRU durable au-delà de 5 000
entrées. Le nettoyage est exécuté au démarrage puis toutes les 100 écritures.
La mise à jour de `last_accessed_at` et `hit_count` est amortie à une heure.

## Configuration

| Variable | Défaut |
| --- | --- |
| `DATABASE_URL` | vide, donc SQLite |
| `ANALYSIS_CACHE_SQLITE_PATH` | `backend/.data/stockfish-analysis-cache.sqlite3` |
| `ANALYSIS_CACHE_L1_MAX_ENTRIES` | `128` |
| `ANALYSIS_CACHE_MAX_ENTRIES` | `5000` |
| `ANALYSIS_CACHE_TTL_DAYS` | `30` |
| `ANALYSIS_CACHE_TOUCH_INTERVAL_SECONDS` | `3600` |
| `ANALYSIS_CACHE_CLEANUP_EVERY_WRITES` | `100` |
| `CACHE_NAMESPACE_VERSION` | `1` |
| `STOCKFISH_CACHE_ENGINE_VERSION` | `17` |
| `STOCKFISH_ANALYSIS_PROFILE_VERSION` | `standard-v1` |

## PostgreSQL depuis la phase 0.7

La table `stockfish_analysis_cache` contient la clé, la version de schéma, la
FEN, profondeur, MultiPV, profil et version moteur, namespace, `facts JSONB`,
les trois dates et `hit_count`. En phase 0.6, le backend crée cette table et ses
index avec `CREATE TABLE IF NOT EXISTS` afin de rester déployable immédiatement.

La phase 0.7 a repris ce DDL dans la révision Alembic
`0001_stockfish_cache`. Le bootstrap automatique PostgreSQL a été retiré ; le
bootstrap SQLite local reste volontairement présent pour le développement
gratuit.

## Observabilité

`GET /runtime/metrics` expose séparément hits L1/L2, misses complets, lectures
et écritures L2, échecs, payloads invalides, nettoyages, évictions et durées
cumulées. `GET /runtime/cache` expose le backend actif, sa disponibilité, les
tailles L1/L2, le TTL et les namespaces. Ces informations sont relayées par
`/dev/diagnostics`, uniquement en développement.

## Benchmark de référence local

Mesure du 12 août 2026 sur la position initiale, profondeur 12 et MultiPV 3 :

| Chemin | Durée | Statut |
| --- | ---: | --- |
| Stockfish froid | 623,787 ms | miss |
| SQLite L2 après recréation du service | 1,030 ms | hit |
| L1 du même service | 0,339 ms | hit |

Ces valeurs caractérisent cette machine et ne constituent pas un SLA. Le script
`scripts/analysis_cache_benchmark.py` permet de refaire la mesure.
