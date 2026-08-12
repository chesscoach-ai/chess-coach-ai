# Knightly — Bible produit

Statut : constitution produit

Version : 1.0

Date : 12 août 2026

## 1. Rôle de ce document

Cette Bible fixe les décisions produit durables de Knightly. Elle prime sur les
anciennes formulations de marque et de roadmap lorsqu'elles se contredisent.
Elle ne remplace pas les spécifications fonctionnelles de `KNIGHTLY_PRD.md`, ni
les règles de voix de `NOX_PERSONALITY.md`.

Une évolution qui contredit un principe non négociable doit être arbitrée et
documentée avant d'être développée.

## 2. Identité

Nom du produit : **Knightly**

Signature principale : **AI Chess Companion**

Knightly est un compagnon d'échecs intelligent qui joue, analyse et progresse
aux côtés du joueur.

Knightly n'est pas :

- un clone de Chess.com ou de Lichess ;
- un chatbot auquel un échiquier aurait été ajouté ;
- une interface brute de Stockfish ;
- un RPG médiéval générique ;
- une collection de statistiques sans action pédagogique.

## 3. Positionnement et promesse

Knightly transforme chaque partie en progrès compréhensible. Le joueur doit
toujours pouvoir répondre à au moins une de ces questions :

- quelle pièce déplacer ?
- d'où part-elle et où va-t-elle ?
- que fait réellement ce coup ?
- que menace-t-il ou protège-t-il ?
- pourquoi est-il utile maintenant ?
- quelle erreur vient d'être commise ?
- quel principe peut être retenu pour la prochaine partie ?

La promesse centrale est :

> Je ne reçois pas seulement un verdict. Je comprends mon coup et je sais quoi
> travailler ensuite, avec un compagnon qui progresse avec moi.

## 4. Cible prioritaire

### Cœur de cible

Joueurs débutants et intermédiaires qui connaissent les règles ou les
découvrent, mais ne savent pas encore transformer une évaluation moteur en une
décision utile.

### Besoins principaux

- jouer rapidement sans configuration complexe ;
- comprendre une erreur sans être jugé ;
- apprendre progressivement le vocabulaire officiel ;
- recevoir une prochaine action concrète ;
- constater une progression personnelle ;
- rester motivé sans pression artificielle.

### Cibles secondaires

- joueurs de club souhaitant une analyse plus narrative ;
- parents ou enseignants cherchant un accompagnement accessible ;
- joueurs mobiles attirés par une progression courte et régulière.

Les besoins experts ne doivent jamais rendre l'expérience débutant plus
complexe. Les détails avancés doivent être disponibles par révélation
progressive.

## 5. Principes non négociables

### 5.1 L'échiquier est le centre

L'échiquier est l'élément principal de Jouer, Progresser et des exercices. Nox
l'accompagne sans le masquer, le réduire inutilement ou détourner l'attention.

Une conversation ne doit jamais obliger le joueur à quitter mentalement la
position qu'elle explique.

### 5.2 Nox est un compagnon, pas le moteur

Le joueur interagit avec Nox. Stockfish reste en coulisses. Les mots « moteur »,
« profondeur », « centipawn » et « MultiPV » ne sont pas des éléments de
premier niveau de l'expérience pédagogique.

### 5.3 La vérité échiquéenne est déterministe

L'ordre conceptuel est toujours :

```text
Stockfish
    ↓
ChessFacts — faits échiquéens structurés
    ↓
Heuristiques déterministes — indices stratégiques étiquetés
    ↓
Nox — contextualisation, pédagogie et conversation
```

Nox n'invente jamais le meilleur coup, une menace, une prise, un mat ou une
évaluation. Une génération IA ne devient jamais la source de vérité
échiquéenne.

### 5.4 Une explication doit conduire à une action

Une mesure, un verdict ou un badge n'a de valeur que s'il aide à comprendre,
réessayer ou choisir une mission.

### 5.5 Le vocabulaire officiel est conservé et expliqué

Knightly ne remplace pas les termes d'échecs par des approximations. Il les
introduit au bon moment et les définit simplement.

### 5.6 La progression récompense l'apprentissage

La régularité, les erreurs corrigées et les compétences acquises comptent plus
qu'un temps d'écran maximal ou qu'une précision isolée.

### 5.7 Le multijoueur reste équitable

Nox, Stockfish, les flèches et les évaluations sont masqués pendant toute
partie compétitive. L'accompagnement revient seulement après le résultat.

### 5.8 La mémoire reste pédagogique et respectueuse

La future mémoire de Nox doit être explicable, utile, modifiable et supprimable.
Elle ne doit pas profiler la personnalité du joueur ni produire de remarques
intrusives.

## 6. Boucle produit centrale

```text
JOUER
  ↓
ANALYSER
  ↓
COMPRENDRE
  ↓
IDENTIFIER UNE FAIBLESSE
  ↓
MISSION PERSONNALISÉE
  ↓
PROGRESSER
  ↓
NOX ÉVOLUE
  ↓
REJOUER
```

Cette boucle prime sur le nombre de fonctionnalités. Une nouvelle fonction
doit renforcer au moins une transition de la boucle sans en compliquer une
autre.

Le moment de valeur fondateur est :

> Le joueur corrige une erreur qu'il comprend, puis reconnaît le même principe
> dans une nouvelle position.

## 7. Les trois portes d'entrée cibles

La navigation future doit tendre vers trois expériences simples. Cette cible ne
constitue pas l'autorisation de reconstruire immédiatement la navigation.

### Jouer

- partie immédiate ;
- adversaire IA ;
- ami ;
- matchmaking.

### Progresser

- session du jour ;
- analyse et bilan ;
- exercices ;
- missions ;
- historique pédagogique.

### Clan

- amis ;
- classement ;
- ligues ;
- progression collective ;
- futures guerres de clans.

## 8. Rôle de Nox

Nox est le petit chevalier compagnon de Knightly. Il est à la fois :

- coach ;
- guide ;
- interlocuteur ;
- témoin du chemin parcouru ;
- représentation visible de la progression du joueur.

Sa promesse relationnelle est :

> Je suis toujours à tes côtés.

Nox peut être présent autour des expériences principales, mais jamais en
surimpression gênante sur l'échiquier. Sa présence doit être utile : expliquer,
encourager, poser une question ou proposer la prochaine étape.

Sa personnalité détaillée est définie dans `NOX_PERSONALITY.md`.

## 9. Progression de Nox

Le joueur ne fait pas seulement monter un compteur personnel : il fait évoluer
Nox. Le compagnon matérialise le chemin échiquéen parcouru ensemble.

Axes futurs d'évolution :

- parties jouées ;
- exercices réussis ;
- missions terminées ;
- erreurs comprises puis corrigées ;
- régularité saine ;
- compétences réellement acquises.

Progression conceptuelle, noms non définitifs :

```text
Écuyer
  ↓
Apprenti chevalier
  ↓
Chevalier
  ↓
Chevalier vétéran
  ↓
Maître
  ↓
Grand Maître
```

Cette progression ne doit pas être construite avant d'avoir défini les preuves
d'apprentissage, les règles anti-abus et la relation avec l'Elo.

## 10. Pédagogie Knightly

### 10.1 Structure minimale d'une explication

Une explication de coup destinée à un débutant doit tendre vers :

```text
PIÈCE + DÉPART + ARRIVÉE + ACTION + RAISON
```

Exemple :

> Déplace ton cavalier de g1 vers f3. Il entre dans la partie, attaque le pion
> e5 et contrôle le centre. Tu prépares aussi ton roque.

### 10.2 Notation progressive

La notation officielle reste visible comme outil d'apprentissage :

> Cavalier en f3 — **Cf3 (Nf3)**

Elle ne doit jamais être l'unique information fournie à un débutant.

### 10.3 Révélation progressive

Ordre recommandé :

1. action concrète ;
2. raison immédiate ;
3. terme échiquéen avec définition ;
4. variante courte si utile ;
5. détail moteur sur demande ou pour un niveau avancé.

### 10.4 Trois niveaux séparés

- **ChessFacts** : faits vérifiables issus de la position et du moteur ;
- **heuristiques** : interprétations déterministes et étiquetées ;
- **Nox** : formulation humaine adaptée au contexte.

Ces niveaux ne doivent jamais être fusionnés dans un payload opaque.

### 10.5 Erreur comme matière d'apprentissage

Nox décrit la conséquence, fait réessayer et relie l'erreur à un principe. Il
ne dramatise pas une imprécision et ne réduit jamais le joueur à son résultat.

## 11. Mémoire pédagogique future

La mémoire devra pouvoir représenter des tendances telles que :

- roque souvent oublié ;
- pièces laissées sans protection ;
- décisions trop rapides ;
- fourchettes désormais reconnues ;
- amélioration en finale ;
- préférence pour le jeu actif.

Toute observation devra préciser sa preuve, sa fraîcheur et son degré de
confiance. Le joueur devra pouvoir consulter, corriger ou supprimer ce que Nox
retient.

La mémoire ne doit pas être implémentée pendant la Phase 1.0.

## 12. Modèle économique

Direction produit :

- **2,00 € par mois** ;
- **19,99 € par an**, offre mise en avant ;
- multijoueur gratuit et sans avantage compétitif payant.

La tarification technique actuelle n'est pas modifiée en Phase 1.0. Les taxes,
commissions des stores, pays pris en charge et prix psychologique final devront
être validés avant changement de Stripe ou des stores.

### Freemium

La version gratuite doit permettre de jouer et de comprendre concrètement la
valeur de Nox. Le paywall intervient après une démonstration de valeur, jamais
comme premier message du produit.

Le Premium pourra augmenter progressivement :

- le volume et la profondeur des analyses ;
- les conversations Nox ;
- les bilans ;
- les missions personnalisées ;
- l'historique pédagogique ;
- les statistiques avancées.

Les quotas exacts ne doivent pas être inventés avant mesure des usages et des
coûts.

## 13. Identité visuelle

Knightly doit évoquer :

- chevalerie légère ;
- progression ;
- compagnie ;
- stratégie ;
- aventure ;
- modernité mobile.

Direction : **chess + companion + progression + modern game**.

À éviter : armures photoréalistes lourdes, bois et parchemins omniprésents,
fantasy générique, surcharge de blasons, interfaces qui réduisent l'échiquier.

Nox est destiné à devenir l'actif visuel le plus reconnaissable de la marque.
Son design doit rester lisible à la taille d'une icône mobile et expressif sans
dépendre d'un texte.

## 14. Architecture conceptuelle produit

```text
Expérience de jeu
  ├─ échiquier et règles
  ├─ multijoueur / adversaire IA
  └─ historique de partie

Intelligence échiquéenne
  ├─ Stockfish
  ├─ ChessFacts
  └─ heuristiques déterministes

Compagnon
  ├─ Nox Shell
  ├─ explication adaptée
  ├─ conversation cadrée
  └─ mémoire pédagogique future

Progression
  ├─ faiblesse détectée
  ├─ mission / exercice
  ├─ preuve de maîtrise
  └─ évolution de Nox
```

La couche compagnon consomme les faits ; elle ne les remplace pas. La couche
progression consomme des événements pédagogiques ; elle ne déduit pas une
compétence à partir d'un seul coup.

## 15. Règles UX

- Une action principale claire par écran.
- L'échiquier reste visible aussi longtemps que le conseil dépend d'une
  position.
- Les panneaux secondaires se replient avant de réduire l'échiquier.
- Les états techniques sont traduits en états humains utiles.
- Les explications commencent par le concret, puis introduisent le vocabulaire.
- Les conseils ne doivent jamais jouer un coup à la place du joueur sans action
  explicite.
- Les aides compétitives sont absentes pendant une partie classée.
- Les animations confirment une action sans ralentir le jeu.
- La navigation mobile privilégie le pouce, la lisibilité et le retour rapide à
  l'échiquier.
- L'humour reste léger, contextuel et désactivable avec le reste de l'ambiance.
- L'accessibilité ne dépend ni d'une couleur seule, ni du son seul, ni d'un
  jargon non expliqué.

## 16. Indicateurs de réussite

Indicateur directeur : part des joueurs qui comprennent puis corrigent une
erreur et réutilisent le principe dans une autre position.

Indicateurs secondaires :

- première partie terminée ;
- première explication Nox consultée ;
- première position rejouée correctement ;
- première mission issue d'une faiblesse ;
- retour à sept jours ;
- session du jour terminée ;
- progression par compétence, pas seulement par précision ;
- conversion Premium après exposition réelle à la valeur ;
- taux de désactivation ou d'abandon des conseils Nox.

Les métriques doivent être définies avant d'ajouter un service d'analytics
payant.

## 17. Éléments à ne pas construire prématurément

- OpenAI avant définition des contrats, garde-fous et coûts ;
- mémoire libre de conversations ;
- système complet d'évolution de Nox avant les preuves de maîtrise ;
- dizaines de monnaies, ligues ou récompenses ;
- guerres de clans avant un cercle d'amis et un clan réellement utiles ;
- navigation reconstruite sans tests des trois portes ;
- marketplace de cosmétiques ;
- voix temps réel ;
- rendu 3D lourd ;
- tableaux de statistiques sans recommandation ;
- limitations Premium arbitraires ;
- reproduction prétendument fidèle de champions historiques ;
- optimisation d'infrastructure sans mesure produit.

## 18. Arbitrage des décisions

Une décision est prête à développer lorsqu'elle précise :

1. le problème utilisateur ;
2. la place dans la boucle centrale ;
3. le comportement gratuit et Premium ;
4. les faits nécessaires ;
5. la preuve de réussite ;
6. les impacts confidentialité, coût et mobile ;
7. ce qui est explicitement hors périmètre.

En cas de conflit, l'ordre de priorité est :

1. intégrité échiquéenne et équité ;
2. compréhension du joueur ;
3. échiquier central ;
4. confiance et confidentialité ;
5. fluidité ;
6. rétention saine ;
7. monétisation ;
8. quantité de fonctionnalités.
