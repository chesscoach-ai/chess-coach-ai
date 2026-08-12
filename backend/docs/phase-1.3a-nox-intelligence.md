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

Les variables `NOX_INPUT_COST_PER_MILLION` et
`NOX_OUTPUT_COST_PER_MILLION` calibrent les métriques de production. Le
benchmark contrôlé possède son propre instantané tarifaire daté et sourcé.

## Phase 1.3A-bis — benchmark contrôlé Luna/Terra

Le mode par défaut prépare et affiche seulement le préflight de 30 cas. Il
n'instancie aucun client OpenAI, ne lit aucune réponse en cache et ne coûte
rien :

```powershell
python scripts/nox_model_benchmark.py
```

Le dataset contient 22 cas débutants, 6 intermédiaires et 2 avancés. Il couvre
ouvertures, tactiques, erreurs, bonnes décisions, cas spéciaux et les cinq
interactions Nox. Luna et Terra reçoivent les mêmes 30 objets `NoxContext`, le
même prompt `1.0`, le schéma `NoxResponse/1.0`, 350 tokens de sortie maximum et
`reasoning.effort=none`. La température n'est pas remplacée. Les appels directs
au provider neutralisent les caches applicatifs et `store=false` est conservé.

Les tarifs datés du 12 août 2026 sont figés uniquement dans ce module de mesure,
avec leur URL officielle. Le préflight emploie la taille UTF-8 comme borne
supérieure volontairement conservatrice des tokens d'entrée et interrompt la
préparation au-dessus de 1 USD.

Même après l'autorisation humaine, l'exécution réelle reste refusée à moins que
les cinq verrous suivants soient simultanément présents :

```powershell
$env:RUN_NOX_LIVE_TESTS="true"
$env:NOX_BENCHMARK_APPROVED="true"
$env:NOX_AI_ENABLED="true"
$env:OPENAI_API_KEY="..."
python scripts/nox_model_benchmark.py --execute
```

Ne pas employer cette commande avant la phrase explicite « Je valide le
benchmark OpenAI. » Le script n'accepte aucun modèle arbitraire : seuls
`gpt-5.6-luna` et `gpt-5.6-terra` sont comparés une fois par cas. La clé, les
e-mails et identifiants ne sont jamais écrits dans le rapport.

Après l'exécution autorisée, le JSON contient les réponses complètes, métriques,
emplacements de notes manuelles et projections pour 100, 1 000 et 10 000
utilisateurs. Le Markdown compare Luna et Terra pour chaque cas et rappelle la
pondération : factualité 30 %, pédagogie 25 %, accessibilité 20 %,
personnalité 15 %, concision 5 %, répétition 5 %. Ces projections couvrent
uniquement l'inférence Nox/OpenAI, sans hébergement, taxes ni commissions.
