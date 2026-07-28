# Chess Coach AI — feuille de route produit

## Promesse

Transformer chaque partie en une leçon courte, compréhensible et immédiatement
réutilisable, en priorité pour les joueurs débutants et intermédiaires.

## Boucle produit

1. Jouer une position ou importer une partie.
2. Repérer automatiquement les moments qui ont réellement changé la partie.
3. Expliquer le coup, le plan et le vocabulaire sans jargon inutile.
4. Faire rejouer les positions critiques.
5. Mesurer une progression sur quelques thèmes simples.

## Principes

- Montrer une prochaine action claire plutôt qu’un tableau de bord exhaustif.
- Conserver les termes officiels, toujours accompagnés d’une explication.
- Utiliser Stockfish comme preuve, pas comme voix principale du produit.
- Récompenser la compréhension et la régularité, pas seulement la précision.
- Masquer les états techniques terminés et éviter les indicateurs redondants.

## Version 1 — fondation déployable

- Parcours guidé en trois étapes sur la page principale.
- Analyse pédagogique du dernier coup et des trois meilleures options.
- Navigation directe entre les erreurs importantes.
- Comptes locaux en développement et PostgreSQL en production.
- Authentification par e-mail et fournisseur Google configurable.
- Déploiement reproductible de Next.js, FastAPI, PostgreSQL et Stockfish.
- Lint, tests unitaires et build exécutables en continu.

## Version 1.1 — rétention

- Sauvegarde des parties par utilisateur.
- Historique des analyses et reprise sur le dernier moment critique.
- Série quotidienne et objectif hebdomadaire raisonnable.
- Recommandation automatique d’un exercice à partir de l’erreur dominante.
- Tableau de progression limité à trois axes : tactique, stratégie et finales.

## Version 1.2 — pédagogie adaptative

- Niveau d’explication débutant, intermédiaire ou avancé mémorisé par compte.
- Questions de contrôle après une explication.
- Révision espacée des positions ratées.
- Comparaison entre le coup joué, le meilleur coup et un coup humain plausible.
- Mode « sans score moteur » pour apprendre à raisonner avant de révéler la réponse.

## Multijoueur compétitif

Réalisé :

- séparation claire entre mode analyse et mode multijoueur ;
- désactivation complète de Stockfish et des aides pendant la partie ;
- parties locales non classées ;
- invitations privées en ligne avec synchronisation des coups ;
- pendules de 5, 10 ou 15 minutes ;
- validation des coups, du tour et de l’accès côté serveur ;
- résultats par mat, nulle, temps ou abandon ;
- classement Elo persistant en PostgreSQL avec repli local en développement.

Prochaines améliorations :

- matchmaking automatique par tranche Elo ;
- proposition de revanche et historique des parties ;
- reconnexion plus explicite après une coupure réseau ;
- analyse pédagogique disponible uniquement après la fin officielle ;
- détection et traitement des abandons par déconnexion prolongée.

## Offre Analyse à 2 € par mois

Réalisé :

- verrouillage de l’interface et des appels Stockfish côté serveur ;
- Stripe Checkout pour la souscription mensuelle ;
- webhooks signés pour accorder ou retirer l’accès ;
- portail Stripe pour gérer le paiement et la résiliation ;
- profil pédagogique persistant alimenté par les analyses terminées ;
- message du coach adapté au prénom, à l’Elo et aux tendances historiques ;
- priorités d’entraînement ordonnées selon la fréquence et la gravité.

À poursuivre pour renforcer la valeur perçue :

- rejouer directement chaque moment critique sans voir la solution ;
- générer une série d’exercices depuis les erreurs de la semaine ;
- historique consultable des analyses et évolution des thèmes ;
- bilan hebdomadaire court avec une réussite et une priorité ;
- réglage du niveau d’explication et lecture audio facultative.

## Adversaires IA

Réalisé :

- six niveaux progressifs, de débutant à maître ;
- choix des Blancs, des Noirs ou d’une couleur aléatoire ;
- profils équilibré, Capablanca, Tal, Petrossian, Fischer et Carlsen ;
- partie guidée dans Analyse avec tous les outils pédagogiques ;
- duel sans assistance dans Multijoueur ;
- sélection serveur du coup afin de ne pas exposer les variantes Stockfish.

À poursuivre :

- calibrer les Elo estimés avec des parties automatisées ;
- ajouter une explication post-partie sur la stratégie du profil choisi ;
- proposer un mini-défi spécifique à chaque style ;
- mémoriser les résultats obtenus contre chaque niveau.

## Indicateurs produit

- Première analyse terminée.
- Première erreur comprise puis rejouée correctement.
- Retour dans les sept jours.
- Nombre moyen de positions critiques réellement révisées.
- Part des utilisateurs qui terminent une session courte de trois exercices.

## À éviter

- Ajouter des métriques sans action pédagogique associée.
- Transformer le produit en copie de Chess.com ou Lichess.
- Afficher des variantes longues par défaut.
- Présenter un score de précision comme une vérité absolue.
- Ajouter des récompenses qui encouragent une utilisation artificielle.
