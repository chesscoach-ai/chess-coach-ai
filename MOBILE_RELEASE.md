# Chess Clan mobile — préparation iOS et Android

## État actuel

Le dépôt contient désormais deux projets Capacitor :

- `frontend/android` pour Android Studio et Google Play ;
- `frontend/ios` pour Xcode et l’App Store.

La première version mobile utilise l’application Next.js hébergée en HTTPS et
l’enrichit avec une couche native. Cette étape évite de réécrire le produit
avant de valider son usage mobile. Avant une soumission publique Apple, les
parcours essentiels doivent être suffisamment natifs et fluides pour ne pas
ressembler à un simple site embarqué.

Fonctions déjà préparées :

- zones de sécurité iPhone et affichage plein écran ;
- état hors ligne et reprise après retour au premier plan ;
- reprise d’une partie multijoueur conservée localement ;
- bouton Retour Android ;
- liens profonds `chessclan://` et invitations partageables en HTTPS ;
- sons et vibrations tactiles des coups ;
- enregistrement sécurisé des jetons de notification par utilisateur ;
- désactivation du paiement Stripe dans les applications mobiles ;
- export et suppression du compte déjà disponibles.

## Préparer une build locale

Depuis `frontend` :

```powershell
$env:CAPACITOR_SERVER_URL="https://chess-coach-web-x6vz.onrender.com"
npm.cmd run mobile:assets
npm.cmd run mobile:sync
```

Android nécessite Android Studio et un SDK Android :

```powershell
npm.cmd run mobile:build:android
npm.cmd run mobile:install:android
```

La première commande reconstruit l’APK avec Java 21 et l’URL Render. La seconde
l’installe puis l’ouvre sur le téléphone USB ou l’émulateur actif. L’APK de
développement est créé dans
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

iOS nécessite macOS et Xcode :

```bash
CAPACITOR_SERVER_URL=https://chess-coach-web-x6vz.onrender.com npm run mobile:sync
npm run mobile:ios
```

L’URL est copiée dans la configuration native lors de `mobile:sync`. Il faut
donc resynchroniser après un changement d’environnement ou de plugin.

## Travaux qui attendent les comptes développeur

### Authentification

La connexion e-mail fonctionne avec le serveur existant. Pour Google sur une
version distribuée, créer :

1. un client OAuth Android avec le package `com.chessclan.app` et l’empreinte
   SHA-256 de signature ;
2. un client OAuth iOS avec le bundle `com.chessclan.app` ;
3. les liens universels vérifiés du domaine public ;
4. le flux système Google, puis l’échange sécurisé du jeton avec le backend.

Si Google est proposé sur iOS, préparer également « Se connecter avec Apple »
pour respecter les règles de l’App Store. Ne jamais placer un secret OAuth dans
le code mobile.

### Notifications

Le client demande l’autorisation seulement après une action de l’utilisateur et
enregistre son jeton dans `native_push_tokens`. L’envoi réel attend :

- `google-services.json` et un compte Firebase pour Android ;
- la capacité Push Notifications et une clé APNs pour iOS ;
- un service serveur d’envoi FCM/APNs et la suppression des jetons invalides.

Les variables prévues sont documentées dans `frontend/.env.example`.

### Abonnements

Stripe reste utilisable sur le site. Il est volontairement bloqué dans la
coquille mobile afin de ne pas contourner les achats intégrés des stores.
Après création des comptes :

1. créer les produits mensuel et annuel dans App Store Connect et Play Console ;
2. intégrer StoreKit 2 et Google Play Billing, directement ou avec un service
   commun de gestion des droits ;
3. vérifier les reçus côté serveur ;
4. convertir les reçus validés en droit `AnalysisEntitlement` ;
5. ajouter « Restaurer mes achats » et tester achat, renouvellement,
   annulation, remboursement et changement d’appareil.

Le serveur reste l’unique source de vérité : une application ne doit jamais
s’accorder elle-même un abonnement.

## Validation avant bêta externe

- lancer `npm run test`, `npm run lint` et `npm run build` ;
- vérifier Android avec `npm run mobile:doctor` et une build signée de test ;
- tester au minimum un petit Android, un grand Android, un iPhone compact et un
  iPhone récent ;
- tester perte de réseau, fermeture forcée, reprise de partie, expiration de
  session, connexion, invitation, abandon et suppression de compte ;
- mesurer le délai du premier affichage, du déplacement d’une pièce et de la
  réponse Stockfish ;
- fournir un compte de démonstration à Apple et Google ;
- finaliser politique de confidentialité, CGU, assistance et fiche de store.

## Identifiants réservés

- nom : `Chess Clan` ;
- Android application ID : `com.chessclan.app` ;
- iOS bundle ID : `com.chessclan.app` ;
- schéma de lien profond : `chessclan`.

Ces identifiants ne doivent plus être modifiés après la création des fiches de
store sans plan de migration.
