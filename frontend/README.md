This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentification

Copiez `.env.example` vers `.env.local`, puis renseignez au minimum
`AUTH_SECRET` avec une longue valeur aléatoire avant tout déploiement.

La création de compte par e-mail fonctionne sans fournisseur externe. Les
comptes locaux sont enregistrés côté serveur dans `.data/users.json` et les
mots de passe y sont uniquement stockés sous forme hachée.

Pour activer « Continuer avec Google », créez un client OAuth Google de type
application Web et ajoutez :

```env
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

En développement, l’URI de redirection Google est :

```text
http://localhost:3000/api/auth/callback/google
```

## Déploiement

Le fichier `../render.yaml` décrit l’architecture complète :

- un service Next.js pour l’interface et l’authentification ;
- un service Docker FastAPI avec Stockfish Linux ;
- une base PostgreSQL pour conserver les comptes.

Après avoir publié le dépôt sur GitHub ou GitLab, créez un Blueprint Render à
partir de `render.yaml`. Render génère automatiquement `AUTH_SECRET` et demande
les identifiants Google lors de la première création.

## Multijoueur

Le mode multijoueur propose deux parcours :

- une partie locale non classée sur un seul écran ;
- une partie en ligne classée, protégée par la session du joueur.

Une partie en ligne est créée avec une pendule de 5, 10 ou 15 minutes. Le
créateur partage ensuite le code privé à six caractères avec son adversaire.
Les coups et les pendules sont synchronisés automatiquement, les coups
illégaux ou joués hors tour sont refusés côté serveur, et le classement Elo est
mis à jour à la fin de la partie.

Sans `DATABASE_URL`, les parties de développement sont conservées dans
`.data/multiplayer.json`. En production, les tables PostgreSQL nécessaires sont
créées automatiquement.

## Abonnement Coach+

L’espace Analyse est réservé aux abonnés Coach+ à `2,99 EUR` par mois ou
`24,99 EUR` par an. Le multijoueur reste gratuit. Le
verrouillage est vérifié dans la page et dans le proxy serveur qui protège les
appels à Stockfish.

Dans Stripe :

1. créez un produit « Chess Clan Coach+ » ;
2. ajoutez un tarif récurrent de `2,99 EUR`, facturé chaque mois ;
3. ajoutez un tarif récurrent de `24,99 EUR`, facturé chaque année ;
4. copiez leurs identifiants dans `STRIPE_PRICE_ID` et
   `STRIPE_PRICE_ID_ANNUAL` ;
5. configurez un webhook vers
   `https://votre-domaine/api/billing/webhook` ;
6. abonnez le webhook aux événements `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated` et
   `customer.subscription.deleted` ;
7. copiez le secret de signature dans `STRIPE_WEBHOOK_SECRET`.

Variables nécessaires :

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_ID=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Le portail client Stripe doit également être activé afin que les abonnés
puissent mettre à jour leur moyen de paiement ou résilier. Pour travailler
localement sans Stripe, `ANALYSIS_DEV_UNLOCK=true` déverrouille uniquement
l’environnement de développement.

Chaque analyse complète enrichit un profil pédagogique agrégé : Elo, thèmes
d’erreur récurrents, gravité et recommandations. Les parties brutes ne sont pas
dupliquées dans ce profil.

## Notifications mobiles

Les visiteurs disposent d’un rappel local lorsque la PWA est active. Un joueur
connecté peut aussi enregistrer chaque téléphone pour recevoir un véritable
Web Push lorsque l’application est fermée.

Générez une paire VAPID sans jamais publier la clé privée :

```bash
npx web-push generate-vapid-keys
```

Renseignez ensuite `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et
`VAPID_SUBJECT` dans `.env.local` et dans le service Web Render. Les abonnements
sont conservés dans PostgreSQL et supprimés automatiquement lorsque le
fournisseur Push signale qu’ils ont expiré.

Le distributeur protégé doit être appelé toutes les 15 minutes par un
planificateur :

```text
POST https://votre-domaine/api/push/dispatch
Authorization: Bearer VOTRE_CRON_SECRET
```

Le Blueprint crée `CRON_SECRET`, mais ne crée volontairement aucun Cron Job
payant. Pour la phase de test, utilisez un planificateur HTTP existant. Lorsque
le produit commencera à générer des revenus, un Cron Job Render pourra appeler
ce point d’entrée.

## Adversaires IA

Le même moteur d’adversaire est disponible dans les deux espaces :

- dans **Analyse**, les flèches, évaluations et explications restent visibles ;
- dans **Multijoueur → Défier l’IA**, les aides restent entièrement masquées.

Six niveaux sont proposés, d’environ 650 à 2400 Elo. Les styles Capablanca, Tal,
Petrossian, Fischer et Carlsen sont des profils ludiques inspirés de tendances
connues de leur jeu ; ils ne prétendent pas reproduire exactement les décisions
des joueurs historiques. Le serveur ne renvoie au navigateur que le coup choisi
pour l’adversaire dans le mode compétitif.

## Qualité

```bash
npm run lint
npm test
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
