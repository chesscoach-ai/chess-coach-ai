# Phase 2.6 — Product polish et cohérence globale

## Audit et priorités

L’inventaire horodaté avant correction est conservé dans `phase-2.6-audit-inventory.md`. Il recense **0 P0, 5 P1, 8 P2 et 5 P3**.

### P1 corrigés

- **Jouer** : le profil invité et le second rappel de Session ne repoussent plus le plateau. Le rituel Nox est plus compact et conserve une seule action dominante.
- **Analyse** : le plateau arrive avant le message de découverte ; l’explication de compte est désormais secondaire, après l’espace de jeu.
- **Progresser** : l’avatar hero, la barre et le pourcentage de tableau de bord ont été retirés. La progression garde des preuves compréhensibles et l’ordre Session → Nox → Carnet → exercices.
- **Clan vide** : rejoindre un proche est l’action principale ; créer son propre clan devient une option secondaire repliée.
- **Post-partie** : « Analyser avec Nox » devient le CTA unique et visuellement dominant ; rejouer reste disponible sans concurrencer l’apprentissage.

### Principaux P2 corrigés

- La navigation distingue maintenant les trois piliers **Jouer / Progresser / Clan** ; l’analyse Nox reste très visible mais comme action accompagnatrice, pas comme quatrième univers concurrent.
- Le dock mobile suit les mêmes trois piliers et présente Nox dans un bouton flottant secondaire.
- Le rang réellement chargé de Nox est maintenant transmis au rituel : le même Nox apparaît partout.
- Les textes défensifs parlant de « XP artificiel », de « série à préserver » ou d’« usine à notifications » ont été remplacés par des bénéfices utilisateur.
- Les métadonnées PGN d’exemple utilisent Knightly au lieu de Chess Coach.
- Le chargement du rituel réserve une hauteur stable et annonce une action humaine plutôt qu’un état technique.
- Les labels des formulaires Clan ont été renforcés et les cibles tactiles principales conservent au moins 44 px.

## Avant / après

Les captures homologues sont dans :

- `docs/captures/phase-2.6/before/`
- `docs/captures/phase-2.6/after/`

Elles couvrent Jouer, post-game, analyse, Progresser, Clan et Knightly+ sur desktop, puis Jouer, analyse, Progresser et Clan en 390×844.

## Parcours des dix premières minutes

1. L’identité Knightly et la promesse « jouer, comprendre, progresser » sont visibles immédiatement.
2. L’utilisateur voit une recommandation courte de Nox, puis le plateau.
3. « Jouer maintenant » est le choix dominant ; IA, ami et local restent secondaires.
4. La fin de partie expose d’abord le résultat, puis une seule prochaine étape : analyser avec Nox.
5. L’analyse montre le plateau avant les explications de compte et garde la technique moteur en retrait.
6. L’utilisateur rejoint Progresser pour retrouver la Session, l’évolution de Nox, son Carnet puis les exercices.

L’**aha moment** retenu est : « Nox explique simplement le tournant de ma partie, relie cette observation à mon Carnet, puis la transforme en prochaine Session ». La hiérarchie post-partie → analyse → progression rend ce fil perceptible sans nouveau moteur.

## États, responsive, accessibilité et performance perçue

- Mobile 390×844 : aucun scroll horizontal détecté ; plateau prioritaire ; dock à trois piliers ; Nox reste accessible sans réduire la largeur des onglets.
- Desktop 1366×768 et 1440×900 : largeur du plateau conservée, panneaux latéraux bornés, CTA principal identifiable.
- Tablette : les grilles repassent naturellement en colonne avant de comprimer le plateau.
- Loading : le rituel réserve son espace avec un squelette discret ; les plateaux existants ne sont pas remplacés par un spinner.
- Erreurs : les composants Analyse, Clan et progression conservent une formulation humaine et une action Réessayer/Revenir ; aucun code HTTP ou stack trace n’est exposé.
- Accessibilité : navigation nommée, `aria-current`, focus visible, labels sur les champs Clan, annonces `role=alert/status`, animations désactivables et boutons principaux d’au moins 44 px.
- Performance perçue : moins de cartes avant le plateau, chargement Nox stable, pas de nouvelle image ni dépendance.

## Cohérence des données et analytics

Le rituel utilise désormais le rang issu du même snapshot `/api/nox/progression` que les autres surfaces. Elo, quota, Session et statut Plus conservent leurs sources existantes. Le funnel existant permet de reconstruire `app_opened → game_started/game_completed → first_analysis → first_nox_interaction → daily_session_* → return_context_viewed`. Le lien exact entre une explication analysée et la notion enregistrée demeure moins lisible dans les métriques : il est documenté, pas étendu dans cette phase.

## Éléments volontairement non modifiés

- Aucun moteur, schéma de données, route métier, système social, progression, monnaie, checkout ou intégration OpenAI.
- Aucun nouvel événement analytics sans nécessité de régression.
- Knightly+ conserve le checkout désactivé et son comparatif Free/Plus sobre.
- Les diagnostics DEV restent protégés par leurs gardes d’environnement existantes.
- Les anciens composants dont l’inutilité n’est pas prouvée ne sont pas supprimés.

## Dette restante

- Plusieurs surfaces historiques utilisent encore des micro-textes à 10–11 px ; une passe typographique globale demanderait une validation visuelle plus large.
- Les états backend/Stockfish ne peuvent pas tous être reproduits de façon déterministe dans le navigateur public sans couper des services.
- Les parcours Free/Plus complets dépendent encore des previews DEV ou d’un compte de test.
- Le Carnet et l’historique restent longs lorsque beaucoup de données existent.
- Certains anciens composants de progression/ligue sont encore présents mais non exposés ; leur suppression exige un audit de références séparé.

## Opportunités futures (non développées)

- Test utilisateur filmé du premier post-game.
- Transition visuelle courte entre une observation d’analyse et son apparition dans le Carnet.
- Audit linguistique externe débutants 600–900 Elo.
- Illustration finale des six rangs de Nox selon le brief racine.

## Cinq écarts avant une qualité commerciale aboutie

1. Les illustrations Nox restent provisoires et identiques entre les rangs.
2. L’analyse dépend de la disponibilité et de la latence du moteur gratuit en production.
3. Le matchmaking de petite cohorte peut manquer d’adversaires humains disponibles.
4. Les parcours de récupération de compte, notifications et achat réel ne sont pas encore validés en conditions store.
5. Il manque encore un volume significatif de retours bêta réels sur rétention, compréhension et valeur de Knightly+.
