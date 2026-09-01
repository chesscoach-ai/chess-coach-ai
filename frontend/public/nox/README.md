# Assets d’évolution de Nox

Chaque rang possède une entrée complète dans `lib/nox/rankAssets.ts` : asset,
fallback, silhouette, aura, emblème, description et jalon. L’avatar Écuyer
actuel reste l’illustration provisoire commune pendant la Phase 2.1. Les futures illustrations
pourront être ajoutées dans `squire/`, `young-knight/`, `knight/`, `captain/`,
`commander/` et `grandmaster/` sans modifier les règles de progression ni les composants.

Ne remplacer un chemin `avatar` que lorsque l’illustration correspondante est
validée. `fallbackAvatar` doit toujours pointer vers une ressource locale sûre.
