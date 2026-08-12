# Phase 0.8 — consolidation des consommateurs d'analyse

## Inventaire avant consolidation

Les appels FastAPI traversaient déjà des routes serveur Next.js, mais avec des
clients et comportements divergents :

| Consommateur | Route navigateur | Route FastAPI | Situation avant 0.8 |
| --- | --- | --- | --- |
| Analyse de position | `/api/analysis-engine/analysis` | `/analysis` | `ApiService`, stale ID mais pas d'annulation réseau |
| Review d'un coup | `/api/analysis-engine/move-review` | `/move-review` | `ApiService`, stale ID mais requêtes encore actives |
| Coach déterministe | `/api/analysis-engine/coach/explain` | `/coach/explain` | `ApiService` |
| Exercices | `/api/exercise-engine` | `/api/exercises/analyse-position` | client `exerciseAnalysis.ts` séparé, types et erreurs dupliqués |
| Adversaire IA | `/api/ai-move` | `/analysis` | `fetch` direct dans le hook et transport serveur distinct |
| Santé moteur | `/api/engine-health` | `/ready` | `ApiService` puis transport serveur partagé |
| Diagnostic DEV | `/api/dev/diagnostics` | `/ready`, `/runtime/*` | instrumentation technique séparée, volontairement |

`AnalysisPanel`, `useMoveReviews`, `useAiOpponent` et le client exercice
contenaient les principaux appels ou contrôles concurrents. Les types exercice
et adversaire étaient séparés des contrats publics déjà regroupés dans
`ApiService`.

## Architecture après 0.8

`ApiService` est le client navigateur unique pour :

- analyse de position ;
- move review ;
- conversation coach déterministe ;
- calcul d'exercice ;
- coup de l'adversaire IA.

Il centralise les headers, la sérialisation JSON, le parsing, le timeout client,
l'annulation, les types publics et les erreurs pédagogiques. Les routes Next.js
conservent leurs contrôles d'abonnement et utilisent toutes `fetchBackend` pour
joindre FastAPI. Les contrats HTTP backend n'ont pas changé.

Les états reflètent le parcours frontend réel :

- `idle` : aucune demande active ou demande annulée ;
- `queued` : délai de debounce avant envoi ;
- `calculating` : requête HTTP en cours ;
- `ready` : réponse publique parsée ;
- `unavailable` : saturation, timeout ou réseau ;
- `error` : requête refusée/invalide.

Ils ne prétendent pas exposer l'état interne exact du pool Stockfish.

## Concurrence et performance

- Une nouvelle FEN annule l'ancienne requête de position avec
  `AbortController`, puis l'identifiant de requête interdit aussi un résultat
  périmé en cas de course tardive.
- Une nouvelle review manuelle annule la précédente.
- L'analyse complète de partie annule la review active lors d'une navigation ou
  d'une remise à zéro.
- Le debounce de position reste à 180 ms ; celui de l'analyse complète à 300 ms.
- Une séquence de test de cinq changements rapides exécute un seul appel et en
  évite quatre.
- Un hit L2/L1 backend suit exactement le même chemin client et bénéficie donc
  naturellement des caches 0.6, sans cache métier dupliqué dans le navigateur.

## Erreurs utilisateur

| HTTP / cause | Message affichable |
| --- | --- |
| 400/422 | « La position ne peut pas être analysée. » |
| 429/503 | « L’analyse est très sollicitée. Réessaie dans quelques secondes. » |
| 504/timeout client | « Cette position demande plus de temps que prévu. » |
| réseau | « Le moteur d’analyse ne répond pas. Vérifie ta connexion puis réessaie. » |

Le détail FastAPI est conservé dans `AnalysisApiError.technicalDetail` pour les
tests/diagnostics, mais n'est pas utilisé comme texte destiné au débutant.

## Diagnostic DEV

Le navigateur conserve uniquement des métriques techniques non sensibles dans
`localStorage` : endpoint, état, durée, HTTP, compteurs de requêtes, erreurs,
annulations et appels évités. Aucune FEN, partie ou identité n'est stockée dans
ce diagnostic. `/dev/diagnostics` les affiche en complément des métriques du
backend et reste inaccessible en production.

## Limites

- L'annulation HTTP navigateur ne garantit pas que le calcul FastAPI déjà reçu
  soit interrompu ; admission control, timeouts et cache protègent le backend.
- L'analyse complète de partie reste volontairement séquentielle pour ne pas
  saturer le moteur.
- Les routes serveur de santé et diagnostic utilisent le transport commun mais
  ne passent pas par le client d'analyse navigateur, car leur contrat est
  purement technique.
