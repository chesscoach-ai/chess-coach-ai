# Stockfish runtime

Le runtime isole et borne tous les acces au processus Stockfish :

```text
route HTTP -> service -> RuntimeExecutor -> EngineManager
           -> python-chess / Stockfish -> ChessFacts ou MoveReviewResult
           -> adaptateur HTTP historique
```

## Responsabilites

- `config.py` : configuration unique issue de l'environnement.
- `engine_manager.py` : processus, etats, verrou borne, attente et crash.
- `engine_pool.py` : acquisition, admission, isolation et remplacement.
- `executor.py` : budget total, budget de calcul et retry unique.
- `metrics.py` : compteurs et durees internes exportables.
- `service.py` : analyse de position, cache memoire et `ChessFacts`.
- `move_review.py` : comparaison avant/apres avec le meme exectuteur.
- `analysis.py` et `primitives.py` : faits et conversions echiqueennes.
- `errors.py` : erreurs de domaine independantes de FastAPI.

## Configuration

| Variable | Defaut | Role |
| --- | ---: | --- |
| `STOCKFISH_PATH` | `engines/stockfish.exe` | Binaire moteur |
| `STOCKFISH_DEFAULT_DEPTH` | `15` | Profondeur par defaut |
| `STOCKFISH_QUEUE_TIMEOUT` | `3.0` s | Attente maximale du verrou |
| `STOCKFISH_ANALYSIS_TIMEOUT` | `10.0` s | Calcul maximal par operation |
| `STOCKFISH_TOTAL_TIMEOUT` | `12.0` s | Budget total, retry inclus |
| `STOCKFISH_MAX_RETRIES` | `1` | Retry apres crash, borne a 0 ou 1 |
| `STOCKFISH_HASH_MB` | `64` | Memoire de transposition |
| `STOCKFISH_THREADS` | `1` | Threads du moteur |
| `STOCKFISH_POOL_SIZE` | `1` | Nombre de processus |
| `STOCKFISH_MAX_QUEUE_SIZE` | `6` | Attentes admises avant rejet 503 |

Le retry ne concerne que `EngineTerminatedError`. Une FEN invalide, une
position terminee, une erreur deterministe ou un timeout ne sont jamais
rejoues. Le temps restant du budget total est recalcule avant le retry.

Le cache utilise son propre verrou : un hit ne prend ni le verrou moteur, ni
une place dans sa file.

## Etats, metriques et erreurs HTTP

Le runtime represente `queued`, `starting`, `calculating`, `ready`, `timeout`,
`engine_crashed`, `unavailable` et `failed`. `RuntimeMetrics.snapshot()` rend
les compteurs et durees sans dependre d'un fournisseur d'observabilite.

- entree ou position invalide : `400` ;
- moteur absent ou crash non recupere : `503` ;
- attente de file ou analyse expiree : `504` ;
- erreur moteur interne : `500`.

Les payloads JSON de succes restent inchanges.

## Limite d'annulation

`python-chess` recoit une limite temporelle et un timeout de protocole borne.
Le code synchrone ne permet toutefois pas encore de propager instantanement
la deconnexion HTTP jusqu'au sous-processus. Une refonte async n'a
volontairement pas ete introduite dans cette phase.

La baseline reproductible est documentee dans `BASELINE.md`.
