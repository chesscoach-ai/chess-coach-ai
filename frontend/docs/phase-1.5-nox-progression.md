# Phase 1.5 — progression et évolution de Nox

## Modèle produit

La progression principale appartient à Nox, pas au profil joueur. Elle est
recalculée de façon déterministe depuis la mémoire pédagogique et les
`LearningEvent` dédupliqués. Le score interne agrège la diversité des concepts,
les notions en amélioration, les maîtrises confirmées, les faiblesses corrigées,
les jours pédagogiques distincts, les missions et les souvenirs marquants.

Les six rangs sont Écuyer, Jeune Chevalier, Chevalier, Capitaine, Commandant et
Grand Maître de Nox. Cette dernière formulation indique explicitement un rang
narratif du compagnon et jamais un titre FIDE du joueur.

La base ne duplique pas le score recalculable. `nox_progression` ne conserve que
le plus haut rang atteint, la date de changement et les milestones d’évolution.
Le mode gratuit local utilise `.data/nox-progression.json`. Un reset du Carnet
supprime les observations mais ne retire jamais un rang déjà gagné. La
suppression du compte efface aussi cette progression.

## Anti-farming

- un `sourceId` pédagogique ne compte qu’une fois ;
- les activités sont ramenées à des concepts et jours distincts ;
- plusieurs missions le même jour ne multiplient pas la régularité ;
- la maîtrise et la correction d’une faiblesse valent davantage que le volume ;
- chaque rang exige simultanément plusieurs dimensions ;
- une actualisation ne crée ni score ni milestone supplémentaire.

## Audit des anciens XP

| Élément historique | Décision Phase 1.5 |
| --- | --- |
| XP de session du jour | Conservé comme retour d’activité secondaire ; non converti en maîtrise. |
| Série de jours | Conservée dans l’espace progression ; seuls les jours pédagogiques prouvés contribuent légèrement à Nox. |
| Ligues hebdomadaires | Conservées comme mécanique sociale, sans influence sur le rang de Nox. |
| Récompenses et bannières multijoueur | Conservées comme progression cosmétique distincte. |
| Elo et statistiques | Inchangés, car ils mesurent le jeu compétitif et non l’apprentissage de Nox. |

Aucune donnée legacy n’est supprimée ou réinterprétée rétroactivement. La
consolidation de navigation reste volontairement reportée à la Phase 1.7.

## Diagnostic et aperçu DEV

`/dev/diagnostics` affiche le rang, le `NoxGrowthScore`, l’avancement, ses
raisons, le dernier changement et les événements comptés/ignorés. Les boutons
d’aperçu changent uniquement le rendu du navigateur via `localStorage` ; ils ne
modifient aucune donnée. La page et l’API répondent 404 en production, et le
client ignore également cet aperçu en production.

OpenAI reste désactivé : 0 appel, 0 token, 0 coût.

## Vérification visuelle

- `screenshots/phase-1.5-desktop.png` : rang compact près du plateau ;
- `screenshots/phase-1.5-mobile-shell.png` : plateau prioritaire et shell compact ;
- `screenshots/phase-1.5-carnet.png` : progression explicable dans le Carnet ;
- `screenshots/phase-1.5-evolution.png` : célébration courte d’évolution.
