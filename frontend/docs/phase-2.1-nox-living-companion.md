# Phase 2.1 — Nox vivant

## Décision produit

Nox utilise exclusivement les six rangs pédagogiques déjà calculés par
`progressionRules.ts`. Aucun niveau visuel, compteur d’XP ou rang parallèle n’a
été ajouté. Une évolution reste la conséquence de preuves d’apprentissage
réelles et persistées : notions observées, maîtrises confirmées, faiblesses
corrigées, jours actifs et missions réussies.

## Architecture visuelle

`lib/nox/rankAssets.ts` est la source unique de l’identité visuelle. Chaque rang
déclare son asset, son fallback, son aura, sa silhouette, son emblème, sa
description et le jalon pédagogique qu’il représente. Les six illustrations
finales n’étant pas encore validées, l’illustration Écuyer existante est utilisée
comme source provisoire commune. Les différences de présence sont rendues par
le cadre, l’échelle, l’aura et l’insigne. Une future direction artistique peut
remplacer chaque chemin sans modifier la progression.

`NoxAvatar` est le composant partagé par le shell, l’onboarding, Progresser et
l’outil DEV. Il gère le fallback local et les états `idle`, `listening`,
`thinking`, `tip`, `success` et `warning`.

## Mouvement et accessibilité

Les mouvements sont courts et peu amples. Ils utilisent `motion-safe` et sont
neutralisés par `motion-reduce`. L’état reste compréhensible par son libellé,
son symbole et son attribut accessible, même sans animation.

## Évolution

Le dialogue d’évolution reprend le rang réel, une raison issue des preuves de
progression lorsqu’elle existe, puis un bouton « Continuer ensemble ». Il est
montré une seule fois par évolution et par session. L’aperçu DEV reste local au
navigateur et `applyNoxRankPreview` refuse toujours toute simulation en
production.

## Vérification DEV

En développement, ouvrir `/dev/diagnostics`. La section « Aperçu des rangs »
affiche les six formes, permet de changer leur état émotionnel puis de simuler
localement une évolution. « Progression réelle » efface cette simulation.

## Limite volontaire

Les portraits propres à chaque rang restent à produire et valider. La Phase 2.1
livre leur architecture de remplacement et une évolution visuelle cohérente,
sans fabriquer des illustrations définitives de qualité insuffisante.
