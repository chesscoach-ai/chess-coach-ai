# Phase 1.3A — Nox Intelligence Core

Nox ne calcule jamais un coup. Le flux de vérité reste Stockfish → ChessFacts
→ règles déterministes → Nox. Le provider OpenAI ne reçoit que le contrat
compact `NoxContext` : aucune FEN, aucun e-mail, identifiant, abonnement,
historique global ou conversation passée.

## Configuration gratuite par défaut

```env
NOX_AI_ENABLED=false
NOX_OPENAI_MODEL=gpt-5.6-luna
NOX_AI_TIMEOUT=8
NOX_AI_MAX_OUTPUT_TOKENS=350
NOX_PROMPT_VERSION=1.0
```

`OPENAI_API_KEY` reste exclusivement dans l'environnement du backend. Si le
flag, la clé, le provider, le réseau ou la validation échoue, le service rend
la réponse déterministe. Le cache SQLite local inclut le contexte, le modèle
et la version du prompt dans sa clé.

Les tarifs ne sont volontairement pas figés dans le code. Les variables
`NOX_INPUT_COST_PER_MILLION` et `NOX_OUTPUT_COST_PER_MILLION` permettent de
calibrer l'estimation au moment du benchmark.

## Benchmark

Le mode par défaut exécute 30 cas sans réseau et sans coût :

```powershell
python scripts/nox_model_benchmark.py --output .data/nox-benchmark.json
```

Un benchmark réel est refusé sauf si `--live`, `RUN_NOX_LIVE_TESTS=true`,
`NOX_AI_ENABLED=true` et `OPENAI_API_KEY` sont tous présents. Aucun benchmark
payant n'est exécuté pendant cette phase.
