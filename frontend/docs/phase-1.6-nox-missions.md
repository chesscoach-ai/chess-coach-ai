# Phase 1.6 — Missions personnalisées de Nox

## Architecture retenue

- Réutilisé : bibliothèque PGN vérifiée, `buildExercise`, `ExerciseTrainer`, mémoire Nox et progression Nox.
- Adapté : l’ancienne session quotidienne devient une mission pédagogique unique de 3 à 5 minutes.
- Legacy conservé : XP, étoiles et ligues historiques restent disponibles mais ne pilotent pas la mission Nox.
- Temporairement séparé : les exercices libres conservent leur suivi historique ; les exercices de mission produisent des `LearningEvent` dédiés.

## Règles déterministes

La sélection suit cet ordre : faiblesse confirmée, amélioration à consolider, échec récent, apprentissage, révision espacée, découverte. Les deux derniers concepts sont évités lorsqu’une alternative fiable existe. Une mission contient 3 à 5 positions existantes et au plus une mini-question connue.

Les délais simples sont : découverte 1 jour, consolidation 3 jours, maîtrise 10 jours. Une mission terminée reste consultable jusqu’à sa prochaine éligibilité. Aucun LLM ne choisit une faiblesse ou ne fabrique une position.

## Persistance et intégrité

- Local : `.data/nox-missions.json`.
- PostgreSQL : migration Alembic `0005_nox_missions`, clé composée `(user_id, id)`.
- Chaque résultat est unique par `missionId + exerciseId`.
- Les événements sont produits via `mission -> LearningEvents -> Memory -> ProgressionRules`.
- Les visiteurs reçoivent une mission découverte non persistante.

## Observation DEV

- `/dev/diagnostics` montre la mission, sa raison, son état, sa progression, les événements et la prochaine éligibilité.
- Les outils DEV permettent de simuler trois erreurs de sécurité du roi, choisir un concept et terminer la mission d’un compte connecté.
- `/?missionPreview=weakness` affiche un aperçu visuel de faiblesse confirmée.
- `/?missionPreview=completed` affiche un aperçu visuel de mission terminée.
- Ces aperçus et actions DEV sont neutralisés ou répondent `404` en production.

## Validation UX

La mission reste une recommandation compacte sous l’échiquier et un raccourci discret dans Nox. Elle ne bloque ni le jeu, ni l’analyse, ni les exercices libres. Sur 390 px, le plateau, l’étape, le CTA, le retour de Nox et les indices restent utilisables sans panneau latéral.
