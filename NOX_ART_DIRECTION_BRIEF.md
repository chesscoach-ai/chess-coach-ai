# Nox — brief de direction artistique

## Rôle et personnalité visuelle

Nox est le compagnon chevalier de Knightly : calme, précis, chaleureux et légèrement malicieux. Il ne doit être ni une mascotte enfantine, ni un robot futuriste générique, ni un guerrier agressif. Sa silhouette doit rester reconnaissable à 48 px : heaume arrondi, visière claire, épaules compactes et petit éclat en forme de losange.

## Palette et contraintes de marque

- Base : nuit `#020617` / ardoise `#111827`.
- Armure : gris bleuté clair `#CBD5E1` et reflets froids.
- Accent Nox : indigo `#6366F1`, violet `#7C3AED`, bleu `#3B82F6`.
- Succès : émeraude `#34D399` ; vigilance : ambre `#FBBF24` ; erreur : rouge doux `#F87171`.
- Contraste lisible sur fond très sombre, sans halo qui masque le visage.
- Aucun texte, logo tiers, texture photoréaliste ou détail fin indispensable à la lecture.

## Silhouette commune

Les six rangs partagent exactement la même tête, la même visière et les mêmes proportions. L’évolution se lit par l’armure, l’emblème, la cape et l’intensité lumineuse — jamais par un changement de personnage. Le cadrage doit laisser 10 % de marge transparente et centrer le visage dans le tiers supérieur.

## Les six rangs

1. **Écuyer (`squire`)** : armure simple, petit écu losange, lumière indigo discrète.
2. **Jeune chevalier (`young-knight`)** : renforts d’épaule, étoile d’apprentissage, accent ciel.
3. **Chevalier (`knight`)** : heaume plus affirmé, emblème cavalier, liseré bleu clair.
4. **Capitaine (`captain`)** : courte cape, deux lames croisées, accents ambre maîtrisés.
5. **Commandant (`commander`)** : col/cape structurée, insigne de tour, aura violet froid.
6. **Grand maître (`grandmaster`)** : couronne géométrique intégrée au heaume, finition or pâle et indigo ; prestigieux sans devenir ostentatoire.

Chaque rang nécessite un avatar principal et un emblème séparé. Les différences doivent rester visibles à 48 px et ne jamais dépendre uniquement de la couleur.

## États émotionnels

Produire pour chaque rang une base neutre compatible avec des surcouches légères, puis au minimum ces six états :

- `idle` : présence calme, regard/visière stable ;
- `listening` : légère inclinaison vers l’utilisateur ;
- `thinking` : regard relevé ou lueur latérale ;
- `tip` : éclat losange discret, posture ouverte ;
- `success` : lumière ascendante, expression fière mais sobre ;
- `warning` : lumière ambre, posture attentive, jamais punitive.

## Arrière-plans et transparence

Les avatars sont livrés sur fond transparent. Prévoir séparément trois fonds optionnels très sobres : halo indigo standard, halo émeraude succès, halo ambre vigilance. Aucun décor complexe : l’avatar doit fonctionner dans une carte, une bulle, un dialogue et sur mobile.

## Formats, résolutions et découpes

- Source maître : vectoriel SVG propre ou PNG 2048×2048 avec transparence.
- Exports : WebP/AVIF 512×512 et 256×256 ; PNG 512×512 de secours.
- Emblèmes : SVG carré, viewBox 64×64, traits lisibles à 20 px.
- Safe area : 10 % ; visage non coupé ; aucune ombre hors du canevas.
- Profil colorimétrique sRGB ; poids cible WebP 512 inférieur à 120 Ko.

## Tailles d’affichage

- Compact : 48×48 px (navigation contextuelle, en-tête).
- Standard : 64×64 px (conversation, rituel).
- Hero : 96×96 à 112×112 px (évolution uniquement).
- Mobile et desktop utilisent le même asset ; seule la découpe responsive change. Une variante mobile n’est nécessaire que si le détail devient illisible à 48 px.

## Animation

Les images doivent accepter de petites animations CSS : respiration 2–4 px, halo, inclinaison 1–2°, éclat ponctuel. Ne pas intégrer d’animation dans le bitmap. Prévoir des calques ou exports séparés si une visière/lueur doit bouger. Toutes les animations doivent pouvoir être désactivées par `prefers-reduced-motion` et ne pas provoquer de déplacement de mise en page.

## Assets provisoires actuels

- Avatar commun : `frontend/public/brand/nox-squire.svg`.
- Registre et fallback : `frontend/lib/nox/rankAssets.ts`.
- Composant d’affichage : `frontend/components/Nox/NoxAvatar.tsx`.
- États et animations : `NOX_STATE_VISUALS` dans `rankAssets.ts` et les keyframes globales existantes.

Le remplacement final doit conserver les identifiants de rang, les états et les chemins déclarés dans le registre. Aucun composant produit ne doit être recodé pour accueillir les illustrations définitives.
