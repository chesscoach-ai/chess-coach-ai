# Knightly — Product Requirements Document

> **Version :** Phase 1.0 — fondation produit
>
> **Statut :** référence fonctionnelle, aucune implémentation autorisée par ce document seul
>
> **Documents directeurs :** `KNIGHTLY_BIBLE.md` et `NOX_PERSONALITY.md`

## 1. Objet

Ce PRD transforme la vision Knightly en trajectoire fonctionnelle. Il protège une priorité simple : faire progresser un joueur débutant ou intermédiaire autour de l'échiquier, avec Nox comme compagnon, sans transformer le produit en chatbot ni en catalogue de fonctionnalités.

En cas de conflit :

1. la Bible tranche la vision et les principes ;
2. ce PRD tranche le périmètre et l'ordre de réalisation ;
3. la personnalité de Nox tranche le ton et les règles conversationnelles ;
4. une décision produit explicitement validée remplace ensuite l'hypothèse concernée.

## 2. Objectifs produit

- Permettre de lancer une partie ou une activité en quelques secondes.
- Transformer chaque partie en une leçon concrète et courte.
- Relier erreurs observées, mission personnalisée et progrès mesurable.
- Créer un attachement utile à Nox, reflet de l'apprentissage et non simple cosmétique.
- Maintenir un multijoueur gratuit, lisible et équitable.
- Démontrer la valeur avant de présenter Premium.
- Préparer une expérience cohérente sur web et mobile.

## 3. Non-objectifs

- Reproduire exhaustivement Chess.com ou Lichess.
- Remplacer Stockfish par un modèle génératif.
- Construire un réseau social, un RPG ou une économie virtuelle avant la boucle pédagogique.
- Introduire une mémoire invisible ou intrusive.
- Activer OpenAI, un paiement ou un nouveau service payant sans validation préalable.
- Refaire toute la navigation avant validation par usage et tests UX.

## 4. Utilisateurs prioritaires

### Débutant accompagné

Connaît les déplacements, mais comprend mal les conséquences. Il veut savoir quelle pièce bouger, d'où, vers où et pourquoi, sans être noyé dans la notation ou les centipions.

### Intermédiaire en progression

Joue régulièrement, répète certaines erreurs et veut des missions ciblées, un historique utile et des explications plus stratégiques.

### Joueur social

Revient pour les duels, les amis et le clan. Il doit pouvoir jouer gratuitement ; la dimension sociale soutient la régularité sans détourner l'aide pédagogique.

## 5. Boucle fonctionnelle prioritaire

1. **Jouer** une partie ou une position.
2. **Analyser** avec des faits issus des moteurs.
3. **Comprendre** une idée formulée par Nox.
4. **Identifier une faiblesse** avec un niveau de confiance explicable.
5. **Recevoir une mission** courte et ciblée.
6. **Prouver un progrès** par l'action.
7. **Faire évoluer Nox** comme trace du chemin partagé.
8. **Rejouer** avec un objectif concret.

Une fonctionnalité qui ne renforce pas cette boucle ou l'accès immédiat au jeu doit être différée.

## 6. Architecture d'information cible

La cible à valider lors de la consolidation UX comprend trois portes :

- **Jouer** : partie immédiate, matchmaking, ami, adversaire IA ;
- **Progresser** : session du jour, analyse, exercices, missions, historique pédagogique ;
- **Clan** : amis, classement, ligues, progression collective et, plus tard, guerres de clans.

Cette cible ne vaut pas ordre de modifier immédiatement les routes ou la navigation existantes. Une migration progressive et mesurée est requise.

## 7. Exigences fonctionnelles transverses

### FR-01 — Échiquier central

L'échiquier reste le premier objet visuel et interactif dès qu'une activité échiquéenne commence. Les panneaux secondaires doivent se replier, se déplacer ou se réduire sur petits écrans.

### FR-02 — Explication actionnable

Un conseil destiné à apprendre contient, lorsque applicable : **pièce + départ + arrivée + action + raison**. La notation officielle peut compléter, jamais remplacer, la formulation accessible.

### FR-03 — Provenance de la vérité

Le meilleur coup et les faits tactiques proviennent de Stockfish/ChessFacts. Les heuristiques ajoutent des indices interprétables. Nox reformule et enseigne ; il ne fabrique pas la vérité échiquéenne.

### FR-04 — Adaptation au niveau

Le vocabulaire, la quantité d'information et les concepts introduits dépendent du niveau pédagogique du joueur. L'Elo peut servir de signal, mais ne doit pas être l'unique mesure.

### FR-05 — Continuité pédagogique

Une faiblesse retenue doit pouvoir mener à une mission puis à une vérification en jeu ou en exercice. Chaque étape conserve une preuve compréhensible.

### FR-06 — Présence de Nox

Nox reste reconnaissable dans les expériences de progression, sans masquer le plateau. Son intervention doit être courte, contextuelle, utile et non répétitive.

### FR-07 — Équité compétitive

Aucune aide de moteur, conseil de Nox ou indice tactique n'est disponible pendant une partie classée contre un humain.

### FR-08 — Freemium loyal

La version gratuite permet de jouer et de percevoir concrètement la valeur de Nox. Le paywall intervient après cette preuve de valeur, avec des limites simples et explicables.

### FR-09 — Contrôle de la mémoire

Toute mémoire pédagogique future est consultable, corrigeable et supprimable. Elle distingue fait observé, tendance supposée et compétence acquise.

## 8. Exigences non fonctionnelles

- **Performance :** un état immédiat doit répondre à chaque action ; les calculs longs affichent une progression ou un repli utile.
- **Résilience :** si Nox génératif est indisponible, les faits déterministes et une formulation locale restent accessibles.
- **Accessibilité :** navigation clavier, contrastes, tailles tactiles mobiles et absence de dépendance exclusive à la couleur.
- **Confidentialité :** minimisation des données, consentement pour la personnalisation et suppression compréhensible.
- **Observabilité :** latence, erreurs, coûts et qualité des réponses sont mesurables sans exposer le diagnostic en production.
- **Compatibilité :** les parcours essentiels sont testés sur web responsive et dans le conteneur mobile.
- **Maîtrise des coûts :** budget, quotas, cache et solution de repli sont définis avant tout service facturé à l'usage.

## 9. Périmètres de livraison

### MVP Knightly

- Identité Knightly cohérente sur les surfaces essentielles.
- Échiquier prioritaire dans Jouer et Progresser.
- Nox Shell déterministe, alimenté par les faits déjà disponibles.
- Explications accessibles et notation progressive.
- Multijoueur, adversaires IA, exercices, historique et comptes existants consolidés.
- Première continuité partie → bilan → leçon, sans dépendance à OpenAI.

### Bêta

- Intelligence conversationnelle de Nox sous contrat strict et avec repli local.
- Mémoire pédagogique minimale, consentie et inspectable.
- Progression de Nox reliée à des compétences prouvées.
- Missions personnalisées issues de faiblesses observées.
- Navigation cible validée par tests utilisateurs.
- Freemium et Premium compréhensibles, avec coûts maîtrisés.
- Sécurité, migrations réelles, observabilité et parcours mobiles qualifiés.

### Post-bêta

- Répétition espacée et parcours pédagogiques plus riches.
- Statistiques de progression réellement actionnables.
- Clan, ligues et événements collectifs alignés sur la régularité saine.
- Notifications utiles, paramétrables et non culpabilisantes.
- Polissage mobile natif et préparation de plusieurs langues.

### Long terme

- Guerres de clans équilibrées et résistantes aux abus.
- Évolutions visuelles plus riches de Nox et cosmétiques non pay-to-win.
- Interaction vocale si elle démontre un gain pédagogique.
- Variantes, tournois et expériences de plateau alternatives selon les usages.
- 3D uniquement si la lisibilité, les performances et l'engagement sont prouvés.

## 10. Roadmap détaillée Phase 1

### 1.0 — Fondation produit

**Livrables :** Bible produit, PRD, personnalité de Nox, divergences et arbitrages.

**Sortie :** documents cohérents, aucun changement de production, commit local propre.

### 1.1 — Rebranding Knightly

**But :** remplacer progressivement Chess Clan par Knightly et établir une identité cohérente.

**Travaux :** inventaire des chaînes, métadonnées web/mobile, assets, pages légales, emails et configuration de partage ; proposition visuelle de Nox ; stratégie de transition des noms techniques.

**Garde-fous :** pas de renommage massif des identifiants internes sans bénéfice ; vérifier marque, domaine et stores avant irréversibilité.

**Sortie :** marque cohérente sur les surfaces validées, tests de régression et capture des parcours principaux.

### 1.2 — Nox Shell

**But :** incarner le compagnon sans service génératif.

**Travaux :** composant léger, états d'intervention, emplacement responsive, messages déterministes issus des données existantes, réduction des répétitions, accessibilité.

**Sortie :** Nox accompagne analyse et exercices sans encombrer l'échiquier ; panne du moteur explicitement gérée.

### 1.3 — Nox Intelligence

**But :** rendre les explications naturelles tout en conservant la vérité déterministe.

**Travaux :** contrat d'entrée/sortie, grounding ChessFacts, prompts versionnés, évaluation de fidélité, sécurité, cache, quota, budget, repli et observabilité.

**Dépendance :** validation explicite du fournisseur, du modèle et du plafond de coût avant activation.

**Sortie :** aucune recommandation inventée dans le jeu d'évaluation ; latence et coût respectent les budgets approuvés.

### 1.4 — Mémoire pédagogique

**But :** retenir uniquement ce qui aide réellement le joueur.

**Travaux :** modèle fait/tendance/compétence, preuve et confiance, consentement, consultation, correction, suppression, rétention et instrumentation.

**Sortie :** une remarque personnalisée peut être reliée à une preuve et désactivée par le joueur.

### 1.5 — Progression de Nox

**But :** matérialiser les compétences acquises au travers du compagnon.

**Travaux :** étapes et critères, progression fondée sur maîtrise plutôt que simple volume, retours visuels sobres, anti-grind, distinction Elo/progression pédagogique.

**Sortie :** chaque évolution de Nox est expliquée par des accomplissements observables.

### 1.6 — Boucle missions

**But :** fermer la boucle analyse → faiblesse → mission → preuve → nouvelle partie.

**Travaux :** taxonomie limitée, sélection priorisée, missions courtes, difficulté adaptative, répétition espacée, reprise et mesure du transfert en partie.

**Sortie :** une erreur récurrente génère une mission pertinente dont l'effet peut être vérifié.

### 1.7 — Consolidation UX

**But :** rendre le produit plus intuitif et moins chargé.

**Travaux :** tests des trois portes, parcours board-first, hiérarchie des panneaux, navigation mobile, suppression des doublons et états vides/chargement/erreur.

**Sortie :** Jouer, Progresser et Clan sont identifiables sans explication ; les tâches clés sont réalisables rapidement sur mobile et bureau.

### 1.8 — Préparation bêta

**But :** ouvrir à un groupe réel dans des conditions maîtrisées.

**Travaux :** tests E2E multi-navigateurs, migration PostgreSQL réelle, sécurité et rate limits authentifiés, budgets IA, conformité, analytics minimales, support, stores et plan de retour arrière.

**Sortie :** checklist bêta signée, incidents observables, données récupérables et aucun bloqueur critique connu.

### Justification de l'ordre

La structure 1.0–1.8 est conservée. Le Shell déterministe précède l'intelligence payante pour valider l'usage sans coût. La mémoire précède la progression afin que celle-ci repose sur des preuves et des contrôles de confidentialité. La consolidation UX vient après validation des composants de la boucle, mais les règles board-first s'appliquent dès le début.

## 11. Critères de succès de la Phase 1

- Temps médian pour commencer une partie ou une session.
- Part des parties terminées qui ouvrent puis terminent une leçon.
- Part des missions terminées et transfert observé en partie.
- Compréhension d'une explication sans aide externe.
- Taux de répétition des messages de Nox et score de fidélité aux faits.
- Rétention par cohorte sans notifications culpabilisantes.
- Conversion après expérience de valeur, désabonnement et coût IA par actif.
- Incidents d'aide indue en partie classée : objectif zéro.

Ces indicateurs devront avoir une définition, un propriétaire et un respect du consentement avant instrumentation.

## 12. Divergences du produit actuel

Ces constats sont documentés, pas corrigés en 1.0 :

1. **Marque :** l'interface, les métadonnées, le mobile et plusieurs documents utilisent encore Chess Clan.
2. **Prix :** la configuration actuelle mentionne principalement 2,99 €/mois et 24,99 €/an, contre la direction 2 €/mois et 19,99 €/an.
3. **Navigation :** six entrées principales coexistent, alors que la cible en prévoit trois.
4. **Identité du coach :** les termes Coach IA, mentor et adversaires inspirés de champions coexistent sans identité Nox persistante.
5. **Essai :** un essai automatique de 30 jours est mentionné ou implémenté, alors que la stratégie demande une preuve de valeur puis une proposition maîtrisée.
6. **Exercices :** leur verrouillage Premium intégral peut empêcher la version gratuite de démontrer la boucle pédagogique.
7. **Densité :** missions, ligues, récompenses, communauté et panneaux concurrencent parfois l'échiquier et la boucle principale.
8. **Documentation :** certaines anciennes roadmaps décrivent encore comme futures des fonctions déjà présentes.
9. **Personas célèbres :** les styles inspirés de champions doivent rester des inspirations déclarées, jamais une imitation ou une prise de parole attribuée.

## 13. Arbitrages produit futurs

- Prix final TTC, offre annuelle, frais des stores et traitement des abonnés existants.
- Essai Premium : opt-in ou automatique, durée, fréquence des rappels et moment du paywall.
- Quantité gratuite d'analyses, de conversations Nox, de bilans et d'exercices d'essai.
- Place exacte des exercices entre démonstration gratuite et offre Premium.
- Contenu précis des trois portes et stratégie de migration des routes.
- Noms, critères et apparence des étapes de Nox ; relation avec l'Elo.
- Intensité de l'humour et préférences de ton accessibles au joueur.
- Données mémorisées, durée de conservation et interface de contrôle.
- Validation de la marque Knightly, domaine, disponibilité juridique et fiches stores.
- Fournisseur IA, modèle, budget, quotas et politique de données avant la Phase 1.3.
- Priorité entre clans, ligues, tournois et boucle pédagogique après la bêta.
- Maintien, renommage ou retrait des adversaires inspirés de joueurs célèbres.

## 14. Règle de passage entre sous-phases

Chaque sous-phase commence uniquement après validation de son périmètre. Elle doit fournir : critères d'acceptation, vérifications automatisées proportionnées, test navigateur des changements visuels, section « COMMENT VOIR LE CHANGEMENT », bilan des limites et commit local isolé. Aucun push ou service payant n'est implicite.
