# Phase 1.1 — Audit de rebranding Knightly

Date : 12 août 2026

Ce document classe les anciennes identités rencontrées avant la Phase 1.1. Il
évite un remplacement global aveugle et fixe ce qui a été traité ou reporté.

## A — Remplacer pendant la Phase 1.1

- marque et signature dans le header et l'accueil ;
- titres, description, Open Graph, PWA et coquille mobile ;
- pages d'authentification, compte, abonnement et mentions légales ;
- footer, notifications, partage de duel et nouveaux PGN exportés ;
- nom affiché Android, iOS et Capacitor ;
- titres de l'API et documentation active ;
- anciennes mentions de marque dans les scripts de build visibles par le développeur.

Résultat : ces surfaces utilisent **Knightly**, **AI Chess Companion** et,
pour l'offre, **Knightly+**.

## B — Conserver temporairement comme noms fonctionnels

- « Coach IA » dans la navigation et les parcours existants ;
- composants et symboles internes `Coach*`, `CoachMentorMessage` et
  `ProductWorkspace` ;
- Stockfish, ChessFacts, moteur, MultiPV et centipions dans les couches
  techniques ou avancées ;
- noms des services Render `chess-coach-*` et nom local du repository ;
- variables d'environnement et clés commerciales existantes.

Ces termes ne constituent plus l'identité globale. Leur renommage technique
sans bénéfice utilisateur ajouterait du risque à cette phase.

## C — Historique à ne pas réécrire

- `PHASE_0_RELEASE_CANDIDATE.md` et documents techniques des Phases 0.6–0.9 ;
- migrations, tables et tests de référence ;
- en-têtes `Site` de parties PGN historiques fournies comme exemples ;
- anciennes décisions conservées dans Git.

`PRODUCT_ROADMAP.md` porte désormais un avertissement indiquant que la Bible et
le PRD Knightly prévalent.

## D — Migration technique future

- package Android et bundle iOS `com.chessclan.app` ;
- schéma de lien profond `chessclan` ;
- domaines Render, noms de services, identifiants OAuth et URL de callback ;
- noms de base et tables ;
- Price IDs Stripe et produits déjà créés ;
- éventuelle migration des anciens fichiers d'assets inutilisés.

Aucun de ces identifiants n'est modifié pendant 1.1.

## Audit commercial

Direction produit validée : **2,00 € / mois** et **19,99 € / an**.

Configuration actuelle : **2,99 € / mois** et **24,99 € / an**, alimentée par
`ANALYSIS_PRICE_MONTHLY_CENTS`, `ANALYSIS_PRICE_ANNUAL_CENTS` et les Price IDs
Stripe. Les mêmes valeurs servent à l'affichage et à la validation du paiement.

La Phase 1.1 renomme donc l'offre en **Knightly+**, mais ne change pas les
montants. Modifier uniquement l'affichage serait trompeur ; modifier les
valeurs sans recréer et vérifier les Price IDs pourrait bloquer le checkout.
L'alignement tarifaire doit être réalisé dans une intervention commerciale
dédiée, sans paiement réel durant les tests.

## Freemium constaté

Les exercices sont actuellement verrouillés de manière large derrière
Premium. La décision de proposer un échantillon gratuit est enregistrée dans le
PRD, mais la logique d'accès n'est pas refondue pendant 1.1.
