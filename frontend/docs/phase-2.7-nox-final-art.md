# Phase 2.7 — Intégration finale des illustrations de Nox

## Périmètre

Cette phase intègre les six illustrations finales remises dans `art/nox-final/`. Elle ne modifie ni les seuils de progression, ni la mémoire pédagogique, ni les missions, ni les règles produit. Aucun visuel n'a été régénéré ou redessiné.

## Contrôle des sources

Les six sources sont des PNG RGBA de 1254 × 1254 px, sans profil ICC embarqué. Leur canal alpha contient bien des pixels totalement transparents et opaques (`0…255`) : aucun fond noir opaque n'a été détecté. Les silhouettes restent dans le cadre ; aucune source n'a été recadrée.

| Rang | Source | Poids source | Boîte alpha constatée |
| --- | --- | ---: | --- |
| Écuyer | `nox-squire.png` | 1 352 944 o | 28,23 → 1190,1224 |
| Jeune Chevalier | `nox-young-knight.png` | 1 278 288 o | 0,21 → 1214,1254 |
| Chevalier | `nox-knight.png` | 1 238 926 o | 0,22 → 1218,1224 |
| Capitaine | `nox-captain.png` | 1 257 086 o | 24,21 → 1222,1224 |
| Commandant | `nox-commander.png` | 1 130 532 o | 0,27 → 1144,1224 |
| Grand Maître de Nox | `nox-grandmaster.png` | 1 134 065 o | 19,40 → 1216,1220 |

## Exports web

Chaque source est exportée sans recadrage en WebP RGBA aux tailles 512 et 256 px, qualité 84 et méthode d'encodage 6. Les fichiers 512 restent largement sous l'objectif de 120 Ko.

| Rang | 256 px | 512 px |
| --- | ---: | ---: |
| Écuyer | 18 536 o | 47 994 o |
| Jeune Chevalier | 18 206 o | 46 362 o |
| Chevalier | 17 148 o | 43 254 o |
| Capitaine | 17 020 o | 42 518 o |
| Commandant | 15 310 o | 38 038 o |
| Grand Maître de Nox | 14 570 o | 36 460 o |

Les exports sont servis depuis `public/brand/nox-final/`. Les SVG provisoires restent disponibles comme fallback local si le chargement du WebP échoue.

## Intégration

- `rankAssets.ts` conserve exactement les six identifiants existants et associe chaque rang à ses exports 512/256.
- `NoxAvatar.tsx` charge le 256 px pour l'avatar compact et le 512 px pour les tailles regular et hero.
- L'image utilise `object-contain object-bottom` afin de conserver la silhouette et les marges transparentes, sans déformation ni découpe.
- Les tailles publiques restent 48, 64 et 112 px ; les états `idle`, `listening`, `thinking`, `tip`, `success` et `warning` conservent leurs animations et signaux existants.
- Les surfaces Jouer/Analyse, Progresser, Clan, Rituel et la fenêtre d'évolution consomment toutes le même composant et le même mapping.

## Diagnostic DEV

`/dev/diagnostics` affiche maintenant le portrait de famille complet : les six rangs en 112, 64 et 48 px, les six états émotionnels, puis une ligne dédiée au contrôle réel à 48 px. Cette route reste protégée par la garde DEV existante et répond 404 en production.

## Vérification visuelle

Captures conservées dans `docs/captures/phase-2.7/` :

- `nox-six-ranks.png`
- `nox-six-ranks-48px.png`
- `desktop-play-nox.png`
- `desktop-progress.png`
- `desktop-evolution.png`
- `desktop-clan.png`
- `mobile-play.png`
- `mobile-ritual.png`
- `mobile-progress.png`
- `mobile-evolution.png`

Contrôles réalisés en 1440 × 900 et 390 × 844 : pas de débordement horizontal, portraits lisibles, transparence correcte, dialogue d'évolution utilisable et composants Nox cohérents avec les surfaces sombres de Knightly.

## Incohérence artistique observée

La famille est cohérente (visage, yeux, casque, violet/or, losange), mais la montée en prestige n'est pas parfaitement monotone dans les fichiers remis : l'Écuyer paraît très ornementé et le Grand Maître peut sembler visuellement plus sobre que certains rangs intermédiaires. À 48 px, les différences de rang reposent surtout sur la silhouette et l'emblème et restent donc subtiles. Conformément au périmètre d'intégration, les illustrations n'ont pas été retouchées ; ce point est signalé pour une éventuelle décision de direction artistique ultérieure.

## Éléments volontairement inchangés

- progression, seuils et milestones ;
- mémoire pédagogique, missions et rituel ;
- règles Free/Knightly+ et checkout ;
- analytics, backend, Stockfish, OpenAI et déploiement ;
- animations existantes et logique de fallback.
