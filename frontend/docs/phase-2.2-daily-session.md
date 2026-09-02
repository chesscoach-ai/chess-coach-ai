# Phase 2.2 — La Session du jour avec Nox

## Philosophie

La Session du jour répond à une question unique : « qu’est-ce qui serait le
plus utile à travailler maintenant ? ». Elle recommande une seule action de
trois à sept minutes, explique ce choix et utilise le plateau dès la première
position. Elle n’ajoute ni XP, ni vie, ni monnaie, ni punition liée à une série.

## Audit et réutilisation

La Session du jour n’est pas un second moteur de missions. Elle réutilise :

- `NoxMission`, sa génération déterministe et ses positions PGN vérifiées ;
- les statuts de maîtrise et les événements de la mémoire pédagogique ;
- la déduplication `sourceId` de `recordNoxLearningEvents` ;
- `missionStore` pour la persistance utilisateur et la reprise multi-navigation ;
- le stockage d’exercice local pour ouvrir le plateau existant ;
- `ExerciseTrainer` et `NoxShell` pendant la résolution ;
- `progressionRules` comme seule source de progression de Nox ;
- les analytics bêta existantes.

Le projet possède aussi une ancienne couche de rythme, ligue, XP et streak
dans `DailyJourneyHub`. Elle n’est pas utilisée par la Session du jour et aucun
nouvel XP ou mécanisme punitif n’a été créé. Les notifications existantes ne
sont pas modifiées pendant cette phase.

## Orchestration et sélection

`missionRules` applique l’ordre suivant : faiblesse confirmée, échec récent,
révision maîtrisée arrivée à échéance depuis quatorze jours, notion en
amélioration, notion en apprentissage, puis découverte guidée. Les candidats
récemment proposés tournent lorsque plusieurs choix sont disponibles.

`dailySessionRules` transforme ensuite la mission en enveloppe versionnée :
identifiant, jour local, type, concept, raison, durée, nombre d’étapes, état et
référence vers la mission source. Il ne recopie ni PGN ni FEN.

## Persistance et reprise

Pour un utilisateur connecté, la mission et ses résultats restent persistés
par le stockage existant PostgreSQL ou JSON local. Une enveloppe locale
`knightly:nox-daily-session:v1` conserve uniquement l’avancement nécessaire à
une reprise immédiate. Pour un invité, cette enveloppe permet la découverte et
la reprise sur le même navigateur, sans prétendre créer une mémoire durable.

Le même exercice n’est ajouté qu’une fois dans l’enveloppe locale. Côté
serveur, les `sourceId` `mission:<id>:exercise:<id>` et
`mission:<id>:completed` empêchent le double comptage après refresh ou requête
répétée.

## Jour et timezone

Le navigateur transmet son identifiant IANA (`Europe/Paris`, par exemple).
L’identifiant quotidien est calculé dans ce fuseau avec `Intl.DateTimeFormat`,
et non avec la date UTC brute. Une timezone absente ou invalide retombe sur la
stratégie UTC sûre. Une session commencée n’est pas écrasée au changement de
jour. Une session terminée reste affichée le jour même et une nouvelle mission
peut être proposée le jour local suivant.

## Déroulement

La carte principale de Progresser contient une introduction de Nox, un rappel
facultatif, trois ou quatre positions existantes et une conclusion. Quitter une
position ne supprime pas les résultats déjà validés. Après la dernière
position, Nox résume le thème travaillé et propose de jouer ou de continuer les
exercices libres.

Les résultats suivent exclusivement cette chaîne :

`position vérifiée → résultat de mission → LearningEvent → mémoire → progressionRules → évolution éventuelle de Nox`.

## Invité et indisponibilité

Un invité voit « Session découverte » et « Nox apprend encore à te connaître ».
En cas d’échec réseau, la dernière mission chargée est conservée localement ;
à défaut, une découverte locale vérifiée est proposée. Un message indique que
la synchronisation est indisponible sans perdre silencieusement l’avancement.

## Analytics

Les événements anonymisés ajoutés sont `daily_session_viewed`,
`daily_session_started`, `daily_session_resumed`, `daily_session_completed` et
`daily_session_abandoned`. Ils reprennent seulement l’identifiant visiteur
pseudonyme, la page, la plateforme et la version déjà prévus par la bêta. Aucun
dialogue, PGN, FEN, email ou contenu personnel n’est envoyé.

## Régularité

La carte affiche sept points légers issus de l’activité d’exercice locale et
une phrase informative positive. Aucun jour manqué ne provoque de perte ou de
message culpabilisant.

## Diagnostic DEV

`/dev/diagnostics` propose six scénarios purement visuels : nouvel utilisateur,
faiblesse confirmée, révision espacée, consolidation, session en cours et
session terminée. Les aperçus modifient la mission reçue uniquement dans le
navigateur de développement ; ils n’écrivent aucune preuve pédagogique.

## Limites

- La reprise invitée reste liée au navigateur et à son stockage local.
- La synchronisation multi-appareil est portée par la mission utilisateur ;
  l’état décoratif de l’enveloppe de session n’est pas une nouvelle table.
- Les métadonnées facultatives `session_type`, durée et nombre d’étapes ne sont
  pas ajoutées au schéma bêta actuel afin d’éviter une migration hors périmètre.
