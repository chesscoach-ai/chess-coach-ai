# Préproduction et déploiement Render

Le fichier `render.yaml` crée trois ressources dans la région de Francfort :

- `chess-coach-web`, l’application Next.js ;
- `chess-coach-api`, le moteur Python/Stockfish ;
- `chess-coach-db`, la base PostgreSQL.

## Avant le premier déploiement

Dans l’assistant Blueprint Render, renseigner :

- `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` pour la connexion Google ;
- les trois variables VAPID uniquement lorsque les notifications Web Push
  sont prêtes. Elles peuvent rester vides pendant la première préversion.

Les secrets `AUTH_SECRET`, `BACKEND_API_SECRET` et `CRON_SECRET` sont générés
par Render. Ne pas les copier dans le dépôt. La clé interne du moteur est
partagée automatiquement entre les services Web et API : le service Stockfish
public ne peut ainsi pas être utilisé directement pour contourner les droits
d’analyse.

Pour Google OAuth, ajouter cette URI de redirection dans Google Cloud :

```text
https://VOTRE-SERVICE-WEB.onrender.com/api/auth/callback/google
```

## Vérifications après déploiement

1. Ouvrir `/api/health` : le statut doit être `ok` et aucun élément `required`
   ne doit être à `false`.
2. Ouvrir l’application et vérifier que le moteur passe « en ligne ».
3. Créer un compte classique, se déconnecter, puis se reconnecter.
4. Tester la connexion Google.
5. Jouer un coup contre l’IA et lancer un exercice.
6. Vérifier qu’un visiteur non abonné ne peut pas lancer une analyse premium.
7. Jouer une partie rapide et vérifier sa présence dans l’historique.
8. Tester la page sur un téléphone, puis l’installation PWA.

## Limites de la préversion gratuite

Les services Web gratuits peuvent se mettre en veille et provoquer un premier
chargement lent. La base PostgreSQL gratuite Render expire après 30 jours :
elle convient à une démonstration partagée avec quelques amis, pas encore à une
mise en production avec des comptes et des parties à conserver.

Avant une ouverture publique, prévoir au minimum une base persistante, une
sauvegarde, une politique de confidentialité, des conditions d’utilisation et
une supervision des erreurs.
