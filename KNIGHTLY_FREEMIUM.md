# Knightly Free et Knightly+

## Audit préalable — Phase 2.3

L'infrastructure existante sait stocker un abonnement Stripe, un accès à vie,
un essai et les trois bilans de partie gratuits. Elle protège déjà les routes
d'analyse coûteuses côté serveur. En revanche, la politique produit était
éparpillée entre `AnalysisEntitlement`, les pages Exercices, Analyse et Compte.

Contradictions relevées avant modification :

- un essai Knightly+ de 30 jours était créé automatiquement lors de la première
  lecture d'un compte, sans choix explicite de l'utilisateur ;
- les exercices statiques et la progression locale étaient entièrement cachés
  derrière un paywall, alors qu'ils n'engendrent presque aucun coût ;
- l'interface et les documents affichaient encore 2,99 €/mois et 24,99 €/an ;
- `hasAccess` mélangeait abonnement, essai, accès bêta, accès à vie et
  déverrouillage local, sans décrire précisément les capacités ;
- le paywall était une grande page tarifaire et non une proposition douce après
  démonstration de valeur ;
- les trois bilans gratuits étaient cohérents mais présentés comme un simple
  verrou commercial, sans expliquer qu'ils servent à découvrir Nox ;
- les rangs de Nox, la Session du jour, le Carnet et le Clan ne doivent pas
  dépendre d'un abonnement, même si certains appels d'apprentissage héritaient
  historiquement du verrou global Analyse.

Les tables `billing_subscriptions`, `analysis_trial_claims` et
`game_review_usage`, ainsi que les routes Stripe, restent utiles. Elles ne sont
pas supprimées. Aucun nouveau trial et aucun paiement ne sont activés dans cette
phase.

## Philosophie

Knightly Free permet de jouer, rencontrer Nox, comprendre une première erreur,
faire la Session du jour, utiliser les exercices statiques, faire évoluer Nox
et participer au Clan. Knightly+ approfondit la continuité pédagogique ; il ne
donne jamais d'avantage compétitif.

## Politique versionnée

La source de vérité est `frontend/lib/billing/knightlyPolicy.ts`, version
`knightly-freemium-v1`.

| Capacité | Free | Knightly+ |
| --- | --- | --- |
| Jeu, matchmaking et Clan | Inclus | Inclus, sans avantage |
| Nox déterministe et ses six rangs | Inclus | Inclus |
| Session du jour | 1 recommandation quotidienne | Session quotidienne + jusqu'à 2 approfondissements |
| Bilans de parties | 3 bilans découverte par compte | Sans limite produit |
| Exercices statiques | Inclus | Inclus |
| Mémoire Nox | Tendances essentielles, horizon indicatif 30 jours | Historique approfondi, horizon indicatif 365 jours |
| Statistiques avancées et suivi détaillé des thèmes | Aperçu de base | Inclus |

Les horizons de mémoire préparent l'architecture : aucune donnée existante
n'est supprimée ou artificiellement oubliée pendant cette phase.

## Justification des limites

Les exercices statiques, la Session du jour, les rangs et le social restent
gratuits car leur coût marginal est quasi nul et qu'ils constituent la promesse
fondamentale. Trois bilans complets permettent de découvrir la valeur réelle de
Nox sur plusieurs parties sans déclencher un paywall dès la première partie.
Les approfondissements et l'historique long sont réservés à Plus car ils
représentent la continuité pour laquelle un joueur choisit de payer, et non les
règles du jeu.

## Pricing et disponibilité

La cible produit est 2,00 € par mois et 19,99 € par an. Les prix Stripe actifs
sont traités séparément. Tant que les deux Price IDs, leurs montants et les
feature flags ne sont pas explicitement alignés, le checkout reste indisponible
et aucun prix d'achat n'est présenté comme actif.

Flags :

- `KNIGHTLY_PLUS_ENABLED=false` : surface commerciale inactive en production ;
- `KNIGHTLY_CHECKOUT_ENABLED=false` : création de checkout impossible ;
- `COMMERCIAL_LAUNCH_ENABLED=false` : garde historique complémentaire.

## Stratégie de découverte

La recommandation est de ne pas lancer un nouvel essai temporel automatique.
Le meilleur essai actuel est l'expérience elle-même : trois bilans offerts, une
Session du jour et les exercices libres. Une courte découverte Plus explicite
pourra être évaluée après observation des événements bêta, sans carte bancaire
et seulement après un premier moment de valeur.

Les anciens essais déjà enregistrés restent lisibles jusqu'à leur échéance afin
de ne pas retirer un droit accordé. Aucun nouvel essai n'est créé passivement.

## Entitlements et sécurité

Les entitlements Free/Plus sont calculés côté serveur à partir de l'abonnement,
de l'accès à vie et des accès bêta autorisés. Les paramètres de preview sont
ignorés lorsque `NODE_ENV=production`. Les routes coûteuses conservent un
contrôle serveur ; ni `localStorage`, ni React, ni un paramètre d'URL ne peuvent
accorder Knightly+ en production.

États préparés : `free`, `plus_active`, `plus_expired`, `plus_cancelled` et
`billing_unavailable`. Un abonnement avec annulation en fin de période reste
actif jusqu'à son échéance.

## Analytics

Événements anonymisés : `plus_offer_viewed`, `plus_details_viewed`,
`plus_cta_clicked`, `plus_limit_reached` et `plus_dismissed`. Aucun e-mail,
contenu de partie ou autre donnée personnelle n'est ajouté.

## Fonctionnalités futures possibles

Une future IA générative pourra enrichir les explications Plus, mais elle n'est
pas vendue ni annoncée comme active aujourd'hui. OpenAI reste désactivé. Des
cosmétiques ou outils d'organisation de Clan pourront être étudiés séparément,
sans bonus Elo ni avantage de matchmaking.

## Éléments explicitement non monétisés

Échiquier, règles, matchmaking, Elo, rangs de Nox, Session du jour, progression
réelle, social essentiel et résultats compétitifs. Knightly+ n'achète ni aide
pendant une partie classée, ni indice, ni vitesse de progression artificielle.
