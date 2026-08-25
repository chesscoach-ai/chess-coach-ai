# Knightly — Beta Readiness 0.1.0-beta.1

Verdict au 26 août 2026 : **GO PRIVATE BETA**.

La bêta doit rester limitée à un petit groupe. La diffusion Android est conditionnée à un smoke test sur émulateur ou appareil connecté avant l'envoi de l'AAB, car aucun appareil ADB n'était disponible lors de cette vérification.

## État produit

- Architecture comprise autour de Jouer, Progresser et Clan.
- Mode invité : jeu local/IA, aperçu d'analyse avec Nox et mission découverte.
- Compte : persistance de la mémoire, des missions et de la progression.
- Onboarding skippable en quatre écrans.
- Avis et bugs collectés sans e-mail, conversation Nox ou contenu de partie automatique.
- Version visible : `0.1.0-beta.1` ; Android `versionCode 2`.

## Activation et analytics

Les événements internes sont : `app_opened`, `onboarding_completed`, `game_started`, `game_completed`, `first_analysis`, `first_nox_interaction`, `first_mission_started`, `first_mission_completed`, `account_created` et `frontend_error`.

Ils utilisent un identifiant aléatoire conservé dans le navigateur. PostgreSQL est utilisé lorsque `DATABASE_URL` existe ; le développement utilise `.data/beta-observability.json`. L'écran `/dev/diagnostics` affiche volumes, avis, bugs, J1/J7 et type de stockage. Il répond 404 en production.

## Feedback et bugs

- Formulaires accessibles depuis le pied de page, avec fermeture clavier Échap.
- Limites horaires en mémoire pour éviter le spam de la bêta privée.
- Bug : commentaire, page, version, plateforme, navigateur et état générique.
- Données volontairement absentes : e-mail, conversation, FEN, PGN et contenu du compte.

## Résilience et états

- Boundary global : aucun écran blanc non expliqué.
- Boundary Nox : le plateau reste utilisable si la colonne compagnon échoue.
- Boundary Progresser : retour direct vers Jouer.
- Backend hors ligne : message explicite, sans bloquer les fonctions locales.
- Render Free : saturation, timeout et indisponibilité sont distingués dans les messages existants.
- Les états vides Clan, historique, mémoire et mission expliquent l'action suivante.

## Sécurité et confidentialité

- Anti-brute-force local au processus : blocage de 15 minutes après cinq échecs par adresse normalisée.
- Routes feedback/bug validées par Zod et limitées en fréquence.
- Export compte existant : profil, parties, apprentissage, mémoire, missions et progression Nox.
- Suppression existante : données Nox, missions, progression et compte ; parties adverses anonymisées.
- Migration PostgreSQL versionnée : `0006_beta_observability`.
- Aucun secret, Price ID ou service payant ajouté.

## Mobile Android

- Capacitor 8, safe areas, status/navigation bars sombres, bouton Retour, reprise après background, changement réseau, deep links, haptique et navigation basse présents.
- Bundle Release signé généré : `frontend/android/app/build/outputs/bundle/release/app-release.aab`.
- Version : `0.1.0-beta.1` / code 2.
- Aucun émulateur n'était connecté à ADB pour le smoke test gestuel final.
- `google-services.json` est absent : les notifications Firebase natives ne sont pas validables. Cela ne bloque pas le jeu bêta.
- Le schéma historique `chessclan://` est conservé pour compatibilité ; un renommage futur exigera une stratégie de migration.

### Smoke test Android requis avant partage

1. Installer le debug APK ou le bundle via une piste interne.
2. Lancer, passer l'onboarding, vérifier les safe areas.
3. Jouer un coup par tap puis par glisser-déposer.
4. Ouvrir et fermer le clavier de Nox.
5. Passer en arrière-plan puis revenir.
6. Couper/rétablir le réseau et vérifier le bandeau.
7. Tester Retour sur Nox, Progresser et une partie.
8. Ouvrir `chessclan://play/ai` et une invitation ami.
9. Vérifier portrait et rotation si autorisée par l'appareil.

## iOS à tester ultérieurement

- Build et signature dans Xcode sur macOS.
- Safe areas iPhone avec Dynamic Island, clavier et rotation.
- Apple Sign In si Google/compte tiers est proposé conformément aux règles Apple.
- StoreKit avant toute vente dans l'app.
- Notifications APNs, deep links universels et règles App Review.

## Knightly+

- Le lancement commercial reste désactivé.
- Stripe n'est déclenché que si la readiness et les Price IDs sont valides.
- La cible produit demeure **2 €/mois** et **19,99 €/an**.
- La configuration Render actuelle est encore à 2,99 €/mois et 24,99 €/an : ne pas ouvrir le paiement avant alignement explicite des Price IDs et montants.
- L'essai de 30 jours est actuellement créé à la première résolution d'entitlement d'un compte. Le choix explicite par popup reste à harmoniser avant lancement commercial, sans bloquer la bêta privée gratuite.

## Limites et bugs connus

- Render Free peut provoquer un cold start et une file Stockfish limitée à un moteur.
- OpenAI reste désactivé ; Nox répond de façon déterministe.
- Illustrations Nox provisoires.
- Rétention J1/J7 naturellement vide avant l'écoulement du délai.
- Le rate limiting en mémoire est adapté à la bêta privée mono-instance, pas à un lancement public distribué.
- Google OAuth doit être revérifié sur l'URL Render après chaque changement de domaine.

## Checklist GO / NO-GO

- [x] Parcours Jouer accessible sans compte.
- [x] Onboarding court et skippable.
- [x] Analyse et mission découverte en invité.
- [x] Nox et progression persistants avec compte.
- [x] Événements d'activation mesurables sans SaaS.
- [x] Avis et bugs observables en DEV.
- [x] Fallbacks critiques.
- [x] Export et suppression Nox.
- [x] Migration PostgreSQL versionnée.
- [x] Build web, tests et bundle Android signé.
- [ ] Smoke test Android sur appareil/émulateur connecté.
- [ ] Vérification Google OAuth Render avec un compte bêta.
- [ ] Alignement Stripe avant toute ouverture commerciale.

## Script testeur — environ 15 minutes

Ne pas expliquer le menu avant de commencer ; observer d'abord ce que le testeur comprend seul.

1. Ouvrir Knightly et parcourir ou passer l'introduction.
2. Lancer une partie sans créer de compte.
3. Jouer quelques coups puis ouvrir l'analyse.
4. Demander une explication à Nox.
5. Ouvrir Progresser et démarrer la mission découverte.
6. Dire avec ses propres mots pourquoi cette mission est proposée.
7. Revenir vers Jouer, puis visiter Clan.
8. Se connecter si un compte de test est fourni et observer ce qui devient persistant.
9. Donner un avis via le pied de page.
10. Signaler un problème fictif sans fournir de donnée privée.

Questions finales : « Qu'est-ce que Knightly fait de différent ? », « Où irais-tu pour rejouer ? », « Reviendrais-tu demain ? Pourquoi ? »

## Commandes de vérification

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\frontend
npm.cmd run dev
```

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\frontend
npm.cmd run mobile:bundle:android
```

Appliquer les migrations avant le premier déploiement contenant cette phase :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```
