# Phase 2.5 — Le Rituel Knightly

## Philosophie

Le Rituel est une couche d’accueil de Nox dans **Jouer**, pas une nouvelle rubrique. Il rappelle un contexte utile, propose une seule action dominante, puis laisse immédiatement la place à l’échiquier. La continuité est informative : aucun XP, aucune série à sauver, aucune culpabilisation après une absence.

## Audit et réutilisation

- L’onboarding existant reste la première introduction à Nox.
- La partie en ligne active est vérifiée avec son identifiant local et l’API de partie avant toute proposition de reprise.
- La Session du jour locale et la mission serveur existantes alimentent la reprise.
- La mémoire Nox fournit uniquement des notions observées au moins deux fois et datant de moins de quatorze jours.
- Un progrès ponctuel n’est jamais célébré : le moment « progrès observé » exige au moins trois observations, deux succès, une tendance positive et un statut `improving` ou `mastered`.
- L’évolution proche utilise le pourcentage et la première condition manquante produits par `progressionRules`.
- L’historique multijoueur, l’activité locale des exercices, les missions terminées et les jalons `first_mastery` alimentent le résumé hebdomadaire.
- Le post-partie existant conserve « Analyser avec Nox » et le parcours Progresser conserve Session, évolution de Nox, Carnet, puis exercices.
- Les rappels existants sont volontaires et désactivés par défaut. Aucun nouveau push n’est activé.

## Contextes de retour

`NoxReturnContext` distingue la première visite, le même jour, un retour après un à trois jours, une absence plus longue et l’absence de contexte fiable. `NoxReturnRecommendation` contient le message, l’action principale, une éventuelle alternative, la source et la justification testable.

Les phrases sont choisies de façon déterministe à partir du jour local, du type de retour et de la catégorie de message. Elles peuvent varier d’un jour à l’autre sans rendre les tests instables.

## Priorité exacte

1. partie en ligne réellement active et vérifiée ;
2. Session du jour commencée ;
3. analyse inachevée, lorsqu’un état persistant fiable existera (aucun état de ce type n’existe actuellement) ;
4. Session du jour disponible ;
5. mission réelle non terminée ;
6. jouer une partie, avec découverte d’une position comme alternative quand elle est pertinente.

Le Clan demeure secondaire. La Phase 2.5 ne formule aucun message de Clan tant qu’un agrégat hebdomadaire fiable n’est pas exposé au rituel.

## Vérité et confidentialité

Chaque souvenir visible provient de la mémoire pédagogique autorisée. Le moteur n’enregistre qu’une date locale de dernière ouverture sur l’appareil ; il n’ajoute ni historique de souris, ni durée à la seconde, ni contenu de conversation. Un invité reçoit une continuité locale et une indication honnête sur la synchronisation multi-appareils. En cas d’indisponibilité serveur ou du stockage local, Nox revient à une formulation générique.

## Cette semaine avec Nox

Le résumé repliable présente les sept jours locaux, le nombre de jours actifs, de parties terminées, de missions terminées et de premières maîtrises sur la période. Une journée est comptée une seule fois, même si plusieurs activités y ont eu lieu. Les libellés et les nombres rendent le résumé compréhensible sans dépendre de la couleur.

## Messages et moments Nox

- Première visite : « On commence par une partie ? Ça m’aidera à découvrir ton jeu. »
- Session active : « On reprend ta Session du jour à l’étape 2/4 ? »
- Souvenir prouvé : « Nous avons récemment travaillé la sécurité du roi. Tu veux vérifier si ça tient ? »
- Longue absence : « Content de te revoir. On reprend tranquillement ? »
- Progrès prouvé : « Tes résultats récents progressent sur ce thème… »
- Évolution proche : le prochain rang et une condition pédagogique réelle sont nommés, sans barre XP.

La fin de Session du jour enchaîne maintenant sur « Je garde ce résultat en mémoire » et propose de jouer ou de poursuivre l’entraînement.

## Analytics bêta

Les événements `return_context_viewed`, `resume_action_clicked`, `weekly_summary_viewed`, `nox_progress_moment_viewed` et `return_after_absence` utilisent l’identifiant bêta pseudonyme existant. Aucun texte de Nox n’est enregistré. Le diagnostic DEV affiche désormais D1, D3, D7 et des cohortes descriptives selon l’observation d’une Session terminée ou d’une adhésion Clan ; une cohorte immature reste « à mesurer ».

## Aperçus DEV

Les aperçus ne montent aucun espace authentifié, ne font aucune requête de compte, n’écrivent pas le stockage et désactivent les analytics. Ils sont refusés par `notFound()` en production.

`http://localhost:3000/?ritualPreview=SCENARIO`

Scénarios : `first_visit`, `same_day`, `return_1_day`, `return_3_days`, `return_14_days`, `active_game`, `active_session`, `recent_improvement`, `near_evolution`, `no_context`.

Mobile encadré : `http://localhost:3000/dev/mobile-preview?feature=ritual&scenario=active_session`.

Le panneau `http://localhost:3000/dev/diagnostics` contient également les liens de chaque scénario.

## Notifications futures

Les seuls cas acceptables documentés sont un rappel de Session du jour explicitement activé, un défi d’ami et une invitation Clan. Toute préférence pédagogique reste opt-in, désactivée par défaut et sans formulation culpabilisante. Firebase et tout nouveau service externe restent hors de cette phase.

## Limites

- Aucun état persistant d’analyse interrompue n’est encore disponible pour prendre la troisième priorité.
- Les données invité restent sur un appareil.
- Les cohortes indiquent des événements observés, pas une causalité, et demandent assez de recul pour produire un pourcentage.
- Le résumé serveur des Sessions utilise les événements pédagogiques déjà enregistrés ; les anciennes Sessions antérieures à cette instrumentation peuvent manquer.
- OpenAI reste hors du chemin d’exécution et aucun service payant n’est ajouté.

## Vérification

Frontend : `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` depuis `frontend`.

Backend : `.\.venv\Scripts\python.exe -m pytest -q` depuis `backend`.

Les contrôles visuels couvrent desktop, 390 × 844, clavier, résumé repliable, première visite, retour court, Session active et absence longue.
