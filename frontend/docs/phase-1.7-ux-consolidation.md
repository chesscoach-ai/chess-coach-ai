# Phase 1.7 — Consolidation UX de Knightly

## Audit et rangement retenu

| Surface existante | Fonction réelle | Porte retenue | Décision 1.7 |
| --- | --- | --- | --- |
| Accueil et modes de jeu | Commencer une partie | Jouer | Accès immédiat au plateau et aux quatre modes existants |
| Analyse et historique | Comprendre ou reprendre une partie | Jouer | Actions secondaires compactes, Nox devient le point d'entrée pédagogique |
| Mission quotidienne | Choisir quoi travailler maintenant | Progresser | Première carte de l'écran |
| Progression de Nox | Rendre le progrès concret | Progresser | Rang, prochain rang et concepts affichés ensemble |
| Carnet de Nox | Mémoriser forces et difficultés | Progresser | Placé après la mission et la progression |
| Exercices | Entraînement libre | Progresser | Catalogue conservé, mais relégué après la recommandation personnalisée |
| Amis, clan, ligue et classement | Vie sociale | Clan | Consolidés dans l'espace communautaire existant, sans nouveau système social |
| Profil, abonnement et paramètres | Réglages secondaires | En-tête / profil | Conservés hors des trois portes principales |

Les anciens modes internes restent disponibles afin de préserver les liens, l'historique et les fonctionnalités. La simplification concerne la navigation présentée à l'utilisateur, pas une suppression de capacités.

## Frictions observées et corrections

### Parcours A — débutant

- Avant : six rubriques techniques mettaient l'analyse, les exercices et les parties au même niveau.
- Après : l'entrée se fait par **Jouer**, Nox se présente près du plateau et **Progresser** commence par une mission courte expliquée.
- Le vocabulaire visible évite Stockfish, FEN, centipawn, MultiPV et UCI dans le parcours normal.

### Parcours B — joueur existant

- Avant : la continuité partie → analyse → mission était répartie entre plusieurs rubriques.
- Après : une partie terminée propose en premier **Analyser avec Nox** ; la mission, la progression et le Carnet sont réunis dans **Progresser**.

### Parcours C — mobile 390 px

- Avant : deux navigations occupaient la hauteur et le plateau perdait la priorité.
- Après : une seule navigation inférieure à trois portes est affichée ; la navigation desktop disparaît, le plateau utilise presque toute la largeur et Nox reste compact.
- Vérification manuelle : aucun défilement horizontal à 390 px.

## Changements techniques

- La navigation produit partage le même modèle `play / progress / clan` sur desktop et mobile.
- `ProgressWorkspace` compose les briques existantes sans créer de nouvel appel au chargement initial de Jouer.
- Le PGN d'une partie locale ou IA terminée peut être transmis directement à l'analyse.
- Les routes historiques restent compatibles et sont ramenées vers leur porte produit dans l'interface.
- OpenAI demeure désactivé et aucun service payant, moteur, système de mission ou mémoire n'a été ajouté.

## Vérification locale

Backend :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Frontend, dans un second terminal :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\frontend
npm.cmd run dev
```

Ouvrir `http://localhost:3000`, puis tester successivement **Jouer**, **Progresser** et **Clan**. L'espace de diagnostic DEV reste accessible uniquement en développement à `http://localhost:3000/dev/diagnostics`.

## Limites assumées

- Les illustrations de Nox restent les assets provisoires de la Phase 1.5 ; aucune production graphique lourde n'a été lancée.
- Le Clan consolide les fonctions existantes sans ajouter de guerre ou de ligue supplémentaire.
- La personnalisation générative OpenAI reste volontairement désactivée.
- L'onboarding complet et la refonte commerciale de Knightly+ restent hors du périmètre 1.7.
