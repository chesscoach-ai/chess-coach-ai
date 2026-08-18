# Phase 1.3B — conversation déterministe de Nox

Le Shell suit désormais le flux `NoxShell → NoxConversationService →
NoxProvider`. Pour cette phase, le provider est exclusivement déterministe :
le Shell n'appelle ni l'API Nox ni OpenAI. L'architecture serveur de la phase
1.3A reste intacte pour une activation ultérieure.

## Politique de session

L'historique vit uniquement dans l'état React du Shell. Il est limité à la
position courante : dès que `contextKey` change, l'ancien historique n'est plus
affiché et ses indications visuelles sont effacées. Le bouton « Effacer cette
conversation » réinitialise aussi les flèches et surbrillances. Un rechargement
de page efface toute la session. Aucune mémoire durable n'est créée.

## Routeur gratuit

Le routeur reconnaît seulement sept intentions : `WHY_MOVE`, `PLAN`,
`MISSED_IDEA`, `SHOW_MOVE`, `BEST_MOVE`, `PIECE_HELP` et `POSITION_HELP`.
Il utilise quelques mots-clés français simples. Une question inconnue reçoit
une réponse honnête et n'est jamais envoyée vers un modèle caché.

Les questions rapides dépendent des faits disponibles et de la classification
du dernier coup. Les flèches et cases ne proviennent que des mouvements UCI
présents dans l'analyse ou le bilan du coup.

## Responsive

Sur ordinateur, la conversation reste ouverte à côté du plateau. Sous le
breakpoint `sm`, le message actuel reste visible, tandis que les questions,
le champ et l'historique s'ouvrent avec « Parler à Nox ». L'échiquier conserve
donc la priorité visuelle et le champ utilise une hauteur tactile de 44 px.

Pour voir les changements locaux dans l'émulateur Android, garder Next.js
actif puis construire avec `http://10.0.2.2:3000`. Le mode clair est autorisé
uniquement lorsque `CAPACITOR_SERVER_URL` commence explicitement par `http://` ;
les builds Render en HTTPS conservent `cleartext=false`.

## Coût et diagnostic

`NOX_AI_ENABLED=false` reste la configuration attendue. Dans
`/dev/diagnostics`, `Appels IA`, les tokens et le coût Nox doivent rester à 0.
