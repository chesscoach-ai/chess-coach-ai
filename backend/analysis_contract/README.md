# ChessFacts 1.0

`ChessFacts` est le contrat interne sérialisable entre Stockfish et les
consommateurs de l'analyse. Il n'est pas exposé directement par les routes
HTTP pendant la migration incrémentale.

```text
Stockfish -> ChessFacts -> adaptateur historique -> frontend actuel
                    \-> future couche pédagogique Nox
```

## Frontières du contrat

- **Faits** : position, camp au trait, paramètres d'analyse, notation UCI/SAN,
  pièce, couleur, cases, capture, échec, mat, roque, promotion, évaluation et
  variante principale.
- **Heuristiques déterministes** : les idées stratégiques calculées par les
  règles locales sont isolées dans `MoveHeuristics`, avec la source
  `deterministic_rules`. Elles ne doivent pas être présentées comme des
  certitudes Stockfish.
- **Présentation** : les labels débutants, explications et futurs messages de
  Nox ne font pas partie de `ChessFacts`. Les adaptateurs historiques les
  reconstruisent uniquement pour conserver les réponses publiques actuelles.

## Version et sérialisation

La constante `CHESS_FACTS_SCHEMA_VERSION` vaut actuellement `1.0`. Tous les
modèles interdisent les champs inconnus, sont immuables et peuvent être
reconstruits depuis `model_dump_json()` avec `ChessFacts.model_validate_json()`.

La version appartient également à la clé du cache mémoire. Le futur cache
durable pourra donc invalider proprement les valeurs d'une version antérieure
sans interpréter un ancien document comme le contrat courant.

## Compatibilité 0.2

- `/analysis` est adapté avec `to_legacy_analysis_payload`.
- `/api/exercises/analyse-position` est adapté avec
  `to_legacy_exercise_payload`.
- l'adversaire IA conserve son contrat puisqu'il consomme `/analysis`.
- `/move-review` reste inchangé en 0.2 : il orchestre deux évaluations et sera
  migré séparément après l'extraction du moteur, sans élargir artificiellement
  le contrat d'analyse de position.
