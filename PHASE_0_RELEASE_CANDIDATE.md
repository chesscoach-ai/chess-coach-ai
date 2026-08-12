# Phase 0 — Release Candidate interne

Date de clôture : 12 août 2026
Révision stable d'entrée : `85b2245`
Verdict : **GO PHASE 1**

## 1. Périmètre et conclusion

La Phase 0 fournit un socle exploitable pour commencer la construction visible
de Knightly et de Nox. Aucun service externe, rebranding, mission ou mécanisme
de gamification n'a été ajouté pendant cette Release Candidate.

Les contrats HTTP FastAPI restent la source de vérité. Les contrôles ont
confirmé le fonctionnement du moteur, des caches, du pool, des migrations, du
client frontend consolidé et des protections de diagnostic. Aucun blocage
critique connu n'empêche le démarrage de la Phase 1.

## 2. Architecture finale de Phase 0

```text
Navigateur / application Capacitor
            |
            v
Next.js 16 — session, droits Coach+, produit, routes BFF
            |
            | secret serveur X-Backend-Api-Secret en production
            v
FastAPI — validation, ChessFacts, erreurs HTTP stables
            |
            +--> cache L1 mémoire
            +--> cache L2 SQLite local / PostgreSQL Render
            |
            v
Pool borné de processus Stockfish
```

- Next.js sert l'expérience produit, Auth.js, les droits d'abonnement et les
  domaines multijoueur/progression/communauté.
- Les routes BFF n'exposent jamais le secret du backend au navigateur.
- FastAPI produit les faits échiquéens et conserve des contrats compatibles
  pour l'analyse, la revue de coup et les exercices.
- PostgreSQL est le stockage partagé candidat. Les fichiers JSON locaux sont
  des replis de développement, pas une architecture multi-instance.

## 3. Stockfish et ChessFacts

`ChessFacts` version `1.0` sépare les faits du moteur du futur discours de Nox.
Il expose la position, la perspective d'évaluation, les propositions légales,
les variantes SAN/UCI, les caractéristiques du coup et des heuristiques
déterministes explicitement étiquetées.

Le runtime dispose de :

- un pool configurable, à un moteur sur Render Free ;
- une admission bornée à `pool_size + max_queue_size` ;
- une attente de file bornée, par défaut à 3 secondes ;
- un calcul borné, par défaut à 10 secondes ;
- un budget total de 12 secondes ;
- une seule tentative de reprise après crash ;
- une invalidation et un redémarrage du moteur après timeout/crash ;
- des métriques de file, occupation, timeout, crash, restart et durée.

Contrôles RC :

| Contrôle | Résultat |
| --- | --- |
| Analyse froide | 412 ms sur la position RC locale |
| L1 | 6 ms, `l1_cache_hits +1` |
| MultiPV | 3 propositions légales renvoyées |
| Redémarrage | backend de contrôle arrêté puis relancé |
| L2 après redémarrage | 89 ms, `l2_cache_hits=1`, aucun miss |
| Move-review | `e4`, classification `excellent`, pièce `pion` |
| Exercice | 3 propositions et meilleur coup valides |
| Adversaire IA | coup légal renvoyé pour le niveau 650 |
| Concurrence/résilience | 24 tests ciblés + 2 sous-tests verts |
| Saturation/timeout/crash | admission, 503/504 et reprise testés |

Le cache Stockfish est global et anonyme : il contient une FEN canonique et des
faits échiquéens, sans e-mail, identifiant utilisateur, conversation ou droit
d'abonnement.

## 4. Cache L1 / L2

- L1 : LRU mémoire, 128 entrées par défaut.
- L2 local : SQLite, WAL, 5 000 entrées et TTL de 30 jours par défaut.
- L2 Render : PostgreSQL via `DATABASE_URL`.
- Identité : version du schéma ChessFacts, FEN canonique, profondeur, MultiPV,
  version moteur, profil d'analyse et namespace.
- Toute erreur L2 est absorbée : Stockfish reste disponible et source de
  vérité.
- Nettoyage au démarrage puis périodiquement après les écritures.

## 5. Base et migrations

Alembic pointe vers `0002_core_identity_billing` :

- `0001_stockfish_cache` adopte le cache et ses deux index ;
- `0002_core_identity_billing` adopte `users`,
  `billing_subscriptions`, `analysis_trial_claims` et `game_review_usage`.

Vérifications effectuées :

- `alembic history --verbose` ;
- `alembic upgrade head` sur une base temporaire neuve ;
- `alembic current` retourne `0002_core_identity_billing (head)` ;
- adoption d'une base 0.6 simulée sans perte ;
- upgrade répété et conservation des données ;
- rollback de baseline non destructif puis réapplication.

Ces scénarios sont exercés sur une vraie base SQLite temporaire. La répétition
sur une instance PostgreSQL éphémère reste obligatoire avant bêta publique.

### 16 tables encore sous bootstrap historique

Elles ne sont volontairement pas migrées en Phase 0.9 :

1. `legal_acceptances` ;
2. `progression_profiles` ;
3. `progression_exercise_events` ;
4. `multiplayer_players` ;
5. `multiplayer_games` ;
6. `community_profiles` ;
7. `community_friendships` ;
8. `community_clans` ;
9. `community_clan_members` ;
10. `learning_placements` ;
11. `learning_profiles` ;
12. `push_subscriptions` ;
13. `native_push_tokens` ;
14. `battle_reward_profiles` ;
15. `battle_reward_claims` ;
16. `account_deletion_tombstones`.

## 6. Client frontend d'analyse

Le client partagé gère analyse de position, revue de coup, exercices et
adversaire IA. Il normalise les états `idle`, `queued`, `calculating`, `ready`,
`unavailable` et `error`.

- Debounce de 180 ms pour l'auto-analyse.
- Annulation des anciennes requêtes avec `AbortController`.
- Protection contre les réponses obsolètes.
- Messages compréhensibles pour 400, 503, 504 et panne réseau.
- Télémétrie DEV locale sans FEN ni donnée personnelle.
- Cinq changements rapides sont ramenés à un seul appel utile par test.

## 7. Parcours Release Candidate

| Parcours | Preuve RC | État |
| --- | --- | --- |
| Invité / analyse | route BFF réelle : meilleur coup, 3 propositions et texte débutant ; navigation/undo/reset présents | Validé techniquement |
| Compte credentials | création, normalisation, bcrypt, doublon et persistance après rechargement | Validé par intégration |
| Google | fournisseur configuré, mais identifiants externes absents localement | Limite documentée |
| Import PGN | plus de 100 PGN chargés légalement ; navigation construite depuis l'historique | Validé par tests domaine |
| Exercices | catalogue légal et solvable, route Stockfish réelle, mauvais/bon coup et indices gérés par le trainer | Validé domaine/API |
| Adversaire IA | réponse BFF légale et rapide, aucun conseil exposé pendant le duel | Validé API/domaine |
| Multijoueur | matchmaking, validation des tours, pendule, nulle, abandon, Elo, historique | Validé par intégration |
| Revanche | relance vers le même type de lobby prévue dans le hook | Revue statique |
| Progression/missions | règles de parcours, missions, placement et récompenses vertes | Validé par tests domaine |

Le navigateur intégré de contrôle a rendu les pages et les captures, mais n'a
exécuté aucun JavaScript de page pendant cet audit, y compris sur le build de
production local. Les clics React n'ont donc pas pu constituer une preuve E2E
automatique. Cela est enregistré comme limite de l'environnement d'audit ; le
parcours manuel de dix minutes en fin de document ferme cette vérification sur
un navigateur utilisateur normal.

## 8. Carte de persistance

| Donnée | Propriétaire | Stockage production / local | Multi-appareils | Critique lancement |
| --- | --- | --- | --- | --- |
| Comptes credentials | Auth / `userStore` | PostgreSQL / JSON local | Oui en PG | Oui |
| Session | Auth.js | JWT cookie HttpOnly | Oui | Oui |
| Abonnement et essai | Billing | PostgreSQL / JSON local | Oui en PG | Oui |
| Quota bilans | Billing | PostgreSQL / JSON local | Oui en PG | Oui |
| Cache Stockfish | Backend | PostgreSQL / SQLite | Partagé en PG | Non, recalculable |
| Parties, Elo, historique | Multijoueur | PostgreSQL / JSON local | Oui en PG | Oui |
| Progression/missions | Progression | PostgreSQL / JSON local | Oui en PG | Oui |
| Profil d'apprentissage | Learning | PostgreSQL / JSON local | Oui en PG | Oui |
| Amis/clans/avatar | Communauté | PostgreSQL / JSON local | Oui en PG | Important |
| Exercices en cours | Navigateur | `localStorage` | Non | Non |
| Progression PGN locale | Navigateur | `localStorage` + synchronisation partielle API | Partielle | Important |
| Préférences d'expérience | Navigateur | `localStorage` | Non | Non |
| Partie en ligne active | Navigateur + serveur | ID `localStorage`, état serveur | Oui côté serveur | Important |
| Diagnostic analyse frontend | DEV | mémoire + `localStorage` | Non | Non |
| Push web | Push store | PostgreSQL / JSON local | Oui en PG | Plus tard |
| Token push natif local | Push natif | PostgreSQL / mémoire | Oui en PG | Plus tard |

Les replis JSON ne conviennent qu'à un développement mono-instance. Toute
donnée critique doit utiliser PostgreSQL sur Render.

## 9. Sécurité et confidentialité

### CRITIQUE

Aucun problème critique connu.

### IMPORTANT — avant bêta publique

- Ajouter une limitation de fréquence pour connexion et inscription ; Auth.js
  ne fournit actuellement pas de protection applicative explicite contre le
  brute force.
- Répéter les migrations sur une vraie instance PostgreSQL vierge et une copie
  anonymisée de la base existante.
- Migrer en priorité conformité, progression et multijoueur parmi les 16
  bootstraps restants.
- Faire de la readiness base/migrations un critère de déploiement explicite ;
  le conteneur accepte aujourd'hui un démarrage dégradé si Alembic échoue.
- Valider Google OAuth avec ses vrais redirect URI et utilisateurs de test.
- Remplacer progressivement l'e-mail utilisé comme identifiant transverse par
  un UUID utilisateur stable.

### PLUS TARD

- Ajouter une Content-Security-Policy mesurée après inventaire des scripts.
- Borner explicitement la taille des PGN collés et des corps d'analyse au BFF.
- Automatiser les E2E dans un navigateur mobile/desktop dédié.

Contrôles positifs :

- aucune clé ou valeur secrète détectée dans Git ;
- seules les clés publiques VAPID utilisent le préfixe `NEXT_PUBLIC_` ;
- bcrypt coût 12 pour les mots de passe ;
- cookie de session Auth.js JWT, HttpOnly et SameSite ;
- en production, en-têtes HSTS, `nosniff`, `DENY`, Referrer-Policy et
  Permissions-Policy présents ;
- CORS refuse une origine externe et autorise uniquement localhost en local ;
- diagnostic frontend/API DEV renvoie 404 en production ;
- endpoint backend protégé par secret partagé sur Render ;
- webhook Stripe vérifié par signature ;
- entrées principales validées avec Zod/Pydantic et SQL paramétré ;
- aucun téléversement de fichier utilisateur côté backend ; le PGN est du
  texte interprété localement ;
- cache et diagnostic Stockfish sans e-mail, conversation ni rattachement à un
  utilisateur.

## 10. Performance et responsive

Le déplacement des pièces utilise une animation courte (180 à 260 ms), les
échiquiers sont en largeur `100%` avec ratio carré et les grilles à deux
colonnes ne s'activent qu'au breakpoint `xl`. Le rendu desktop contrôlé conserve
l'échiquier comme élément principal et ne produit aucune erreur console.

Points à surveiller, sans optimisation prématurée en 0.9 :

- `ProductWorkspace` importe encore plusieurs espaces lourds dès l'entrée ;
- `PGNExampleCatalog`, `CommunityHub`, `GameSummary` et `ChessBoard` sont de
  gros composants candidats au découpage lors d'une phase visible ;
- les plus gros chunks de production locaux se situent entre 110 et 222 Ko ;
- les écrans communauté, catalogue PGN et statistiques devront être revus sur
  mobile réel ;
- le contrôle de viewport du navigateur d'audit n'a pas appliqué les tailles
  demandées, donc tablette/mobile restent à confirmer manuellement.

## 11. Diagnostic DEV

`/dev/diagnostics` et `/api/dev/diagnostics` sont disponibles uniquement en
développement. Le contrôle RC montre :

- API et readiness ;
- état Stockfish, pool, moteurs disponibles et file ;
- analyses, timeouts, crashes et restarts ;
- L1, L2, hits, misses, entrées et backend actif ;
- statut base, migration courante et head ;
- dernier endpoint frontend, état, HTTP, durée, annulations et debounce.

Aucun secret, e-mail ou FEN utilisateur n'est affiché. La route retourne 404
sur le serveur Next.js démarré avec `NODE_ENV=production`.

## 12. Configuration locale

Backend :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\frontend
npm run dev
```

Pour tester toutes les fonctions Coach sans paiement, conserver uniquement en
local :

```dotenv
ANALYSIS_DEV_UNLOCK=true
BACKEND_URL=http://127.0.0.1:8000
```

## 13. Configuration Render Free

Le Blueprint actuel prévoit :

- backend Docker gratuit, un moteur, un thread, hash 32 Mo, file de 6 ;
- frontend Node gratuit ;
- PostgreSQL gratuit partagé ;
- secret backend généré et transmis uniquement au frontend serveur ;
- `alembic upgrade head` avant Uvicorn ;
- cache versionné ;
- reprise BFF adaptée au réveil des instances gratuites.

Limites : cold starts, ressources Stockfish faibles, absence de garantie de
disponibilité et éventuelle expiration/suspension de la base selon l'offre.

## 14. Configuration commerciale candidate

Avant activation de `COMMERCIAL_LAUNCH_ENABLED=true` :

1. fournir `AUTH_URL` HTTPS et un `AUTH_SECRET` long ;
2. configurer Google OAuth et ses redirect URI ;
3. configurer Stripe, les Price IDs et le webhook signé ;
4. compléter puis faire relire les informations et documents légaux ;
5. vérifier `alembic current` sur PostgreSQL ;
6. désactiver tout déverrouillage DEV ;
7. conserver `BACKEND_API_SECRET` entre Next.js et FastAPI ;
8. exécuter smoke tests et tests de paiement dans l'environnement de test ;
9. traiter les éléments sécurité classés IMPORTANT.

## 15. Dettes volontairement reportées

- migrations des 16 tables historiques ;
- identité UUID transverse et liaison Google robuste ;
- rate limiting auth ;
- tests PostgreSQL réels ;
- automatisation E2E navigateur ;
- découpage des composants lourds ;
- refonte mobile des écrans denses ;
- future personnalité Nox et rebranding Knightly.

`KNIGHTLY_BIBLE.md`, `KNIGHTLY_PRD.md` et `NOX_PERSONALITY.md` n'existent pas
dans le dépôt. Ils devront être ajoutés au début de la Phase 1 à partir de la
vision produit déjà transmise. Aucun rebranding n'a commencé.

## 16. Parcours manuel de démonstration — environ 10 minutes

1. Démarrer backend et frontend avec les commandes de la section 12.
2. Ouvrir `http://localhost:3000` puis **Coach IA**.
3. Jouer `e2 → e4` : observer l'animation, l'état du coach, le meilleur coup et
   l'explication débutant.
4. Jouer ou annuler rapidement plusieurs coups : seule la position finale doit
   être analysée.
5. Ouvrir les meilleurs coups puis réinitialiser : les flèches précédentes
   doivent disparaître.
6. Ouvrir **Exercices**, choisir une position, demander un indice, tenter un
   mauvais coup puis la bonne solution.
7. Revenir au Coach et rejouer exactement la même position : la réponse rapide
   incrémente L1.
8. Ouvrir `http://localhost:3000/dev/diagnostics` et noter L1/L2/misses.
9. Arrêter puis relancer uniquement le backend, rejouer la position et
   actualiser le diagnostic : L2 doit augmenter.
10. Ouvrir **Connexion**, créer un compte de test, se déconnecter puis se
    reconnecter ; vérifier enfin **Progression** et **Mes parties**.

### Résultat attendu

L'échiquier reste jouable, Stockfish répond sans ancienne réponse parasite, le
cache accélère la répétition, le redémarrage conserve L2, l'exercice progresse,
le compte persiste et le diagnostic reste dépourvu de données sensibles.
