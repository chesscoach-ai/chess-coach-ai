# Phase 1.4 — mémoire pédagogique de Nox

Nox conserve uniquement des faits d’apprentissage structurés. Aucun message,
PGN complet, e-mail, texte libre ou historique de conversation n’entre dans le
profil. L’identité existante sert seulement de clé de stockage jusqu’à la future
migration globale vers des identifiants opaques.

## Modèle et règles

Deux tables versionnées suffisent : `nox_profiles` contient le profil JSON
structuré et `nox_learning_events` les événements minimaux dédupliqués par
`(user_id, source_id)`. Sans `DATABASE_URL`, le même contrat utilise
`.data/nox-memory.json`, gratuitement.

Chaque concept commence à 50/100. Une réussite ajoute 12 points, une erreur en
retire 12. Une seule observation reste un signal faible. Une faiblesse exige au
moins trois observations et un score inférieur ou égal à 32 ; une force exige
au moins trois observations et un score supérieur ou égal à 70. Après une
faiblesse, les réussites répétées produisent l’état `improving`. Toutes les deux
semaines sans observation, le score revient de 3 points vers 50 afin qu’une
ancienne difficulté ne devienne pas une étiquette permanente.

Les événements de partie sont dérivés des bilans de coups. Les exercices
utilisent leur catégorie et leurs thèmes. Leur `source_id` ne contient pas le
contenu de la partie et empêche un double comptage.

## Contrôle et confidentialité

`GET /api/nox/memory` rend le profil inspectable. `DELETE /api/nox/memory`
efface profil et événements après une confirmation visuelle dans le Carnet.
Un visiteur reçoit un profil de session vide avec `persistent=false` et aucune
écriture durable. L’export et la suppression du compte couvrent également la
mémoire Nox.

`POST /api/nox/memory` est un simulateur réservé au développement, authentifié
et absent de la production. Les vrais événements passent directement par les
routes de bilan et d’exercice.

## Vérification locale contrôlée

Après connexion sur `http://localhost:3000`, la console du navigateur permet de
simuler un même concept sans jouer des parties artificielles :

```js
await fetch("/api/nox/memory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "exercise_failure",
    conceptId: "king_safety",
    outcome: "failure",
    sourceId: `dev-king-safety-${crypto.randomUUID()}`,
  }),
}).then((response) => response.json());
```

Une exécution ne crée aucune faiblesse. Trois exécutions avec des `sourceId`
distincts font apparaître « mettre ton roi en sécurité » dans le Carnet. Deux
événements équivalents avec `exercise_success` et `success` font passer le
concept à « en progrès ». Après rechargement, demander à Nox « Pourquoi ce
coup ? » lui permet de rappeler cette amélioration lorsqu’elle est pertinente.

## Pièces capturées

Les plateaux principal, local, contre l’IA et en ligne possèdent désormais une
ligne compacte au-dessus et au-dessous. La ligne suit l’orientation : elle
montre les prises du joueur placé de son côté du plateau, avec la valeur
matérielle totale. Le calcul repose exclusivement sur le FEN affiché et suit
donc aussi la navigation dans l’historique.

OpenAI reste désactivé : 0 appel, 0 token, 0 €.

