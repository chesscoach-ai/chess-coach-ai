# Préparation du lancement commercial

Le lancement est protégé par une double condition :

1. toutes les variables Stripe, juridiques et HTTPS doivent être valides ;
2. `COMMERCIAL_LAUNCH_ENABLED` doit être explicitement passé à `true`.

Tant que la bascule reste à `false`, l’API de paiement refuse toute création
de session Checkout et les moteurs de recherche reçoivent une consigne de
non-indexation. Le portail Stripe et le webhook restent disponibles afin de ne
jamais empêcher un éventuel abonné existant de gérer son abonnement.

## Préversion privée

Renseigner `ANALYSIS_PREVIEW_EMAILS` avec une liste d’adresses séparées par des
virgules. Ces comptes peuvent tester l’analyse sur Render sans abonnement tant
que le lancement commercial est désactivé. Cette autorisation disparaît
automatiquement lorsque la bascule commerciale est activée.

## Informations à renseigner

- `LEGAL_ENTITY_NAME`
- `LEGAL_ADDRESS`
- `LEGAL_REGISTRATION_NUMBER`
- `LEGAL_PUBLICATION_DIRECTOR`
- `SUPPORT_EMAIL`
- `PRIVACY_EMAIL`
- `LEGAL_TERMS_VERSION`
- `LEGAL_PRIVACY_VERSION`
- `ANALYSIS_PRICE_MONTHLY_CENTS`

Les pages préparatoires sont disponibles sous `/legal/*`. Elles doivent être
relues et adaptées par un professionnel du droit à la structure juridique
réellement créée, puis `LEGAL_DOCUMENTS_REVIEWED=true` pourra être renseigné.
Il reste notamment à ajouter le médiateur de la consommation et à confirmer les
modalités de rétractation du contenu numérique.

## Stripe en mode test

1. Créer le produit Analyse et un prix mensuel en euros.
2. Reporter son identifiant dans `STRIPE_PRICE_ID`.
3. Configurer le webhook :
   `https://VOTRE-DOMAINE/api/billing/webhook`.
4. Écouter au minimum :
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated` et `customer.subscription.deleted`.
5. Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
6. Utiliser uniquement les clés `sk_test_...` jusqu’à la recette complète.
7. Tester création, paiement refusé, renouvellement, résiliation et portail.

Le prix retourné par Stripe doit correspondre exactement à
`ANALYSIS_PRICE_MONTHLY_CENTS`. Cette vérification empêche une mauvaise fiche
produit d’être vendue par erreur.

## Données personnelles

L’espace `/account` permet à un utilisateur authentifié :

- de télécharger ses données dans un JSON lisible par machine ;
- d’annuler son abonnement puis supprimer son compte ;
- d’anonymiser son identité dans les parties conservées pour ses adversaires.

Les pièces comptables restent chez Stripe selon les obligations légales. Avant
l’ouverture publique, documenter les durées de conservation réelles, le
registre des traitements, les sous-traitants et la procédure de réponse aux
demandes reçues par `PRIVACY_EMAIL`.

## Recette de lancement

- Utiliser une base PostgreSQL persistante avec sauvegardes et restauration
  testée.
- Configurer un domaine définitif et mettre à jour Google OAuth et Stripe.
- Contrôler `/api/health` : `commercial.ready` doit être `true`.
- Garder `COMMERCIAL_LAUNCH_ENABLED=false` pendant tous les tests.
- Tester inscription classique et Google, déconnexion et récupération.
- Tester les droits Analyse avec et sans abonnement.
- Tester export et suppression sur des comptes de recette.
- Vérifier mobile, PWA, accessibilité clavier et contraste.
- Ajouter supervision des erreurs, alertes de disponibilité et procédure
  d’incident.
- Préparer support client, remboursement et réponse aux signalements.
- Effectuer une sauvegarde puis activer `COMMERCIAL_LAUNCH_ENABLED=true`.
- Vérifier immédiatement un paiement réel de faible montant et son webhook.

## Décision actuellement recommandée

Ne pas activer la bascule commerciale sur l’offre gratuite Render : la base
gratuite expire et les services peuvent se mettre en veille. La préversion peut
continuer à y vivre, mais les premiers paiements doivent attendre une base
persistante, des sauvegardes et la validation juridique.
