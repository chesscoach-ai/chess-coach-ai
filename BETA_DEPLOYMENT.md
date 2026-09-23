# Runbook de déploiement — Knightly 0.1.0-beta.2

Ce document prépare un déploiement Render gratuit. Il ne constitue pas une autorisation de pousser ou déployer.

## 1. Prérequis

- branche/commit beta.2 validé et dépôt propre ;
- tests backend/frontend, lint, build production, migrations et bundle Android verts ;
- accès au dépôt GitHub et au Blueprint Render existants ;
- base gratuite `chess-coach-db` reliée aux deux services ;
- aucune clé OpenAI/Stripe/Firebase nécessaire.

## 2. Variables Render

Comparer Render à `render.yaml` et [ENVIRONMENTS.md](ENVIRONMENTS.md). Obligatoires : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `BACKEND_URL`, `BACKEND_API_SECRET`. Conserver :

```text
COMMERCIAL_LAUNCH_ENABLED=false
KNIGHTLY_PLUS_ENABLED=false
KNIGHTLY_CHECKOUT_ENABLED=false
STOCKFISH_POOL_SIZE=1
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=32
STOCKFISH_MAX_QUEUE_SIZE=6
```

Laisser `OPENAI_API_KEY`, tous les secrets Stripe et push vides. Ne jamais copier une valeur Render dans Git ou un ticket.

## 3. Migrations

L'image backend exécute automatiquement `alembic upgrade head` avant Uvicorn. Vérifier les logs : la dernière révision doit être `0007_clan_v2`. Une erreur doit arrêter le service. Ne pas lancer de SQL manuel.

Commande de prévalidation locale :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai\backend
$env:DATABASE_URL="sqlite:///C:/temp/knightly-beta-check.sqlite3"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
```

## 4. Backend

1. Déployer le commit validé via le Blueprint.
2. Attendre que `/ready` renvoie 200 avec `engine=ready`, `database=up_to_date`, `schema_version=0007_clan_v2`.
3. Vérifier `/health` et les logs sans afficher de secret/URL DB.
4. Si la migration ou Stockfish échoue, arrêter : ne pas poursuivre vers le frontend.

## 5. Frontend

1. Déployer exactement le même commit.
2. Vérifier `/api/health`: statut `ok`, configuration requise vraie, commercial désactivé.
3. Exécuter le smoke test :

```powershell
cd C:\Users\UM3406\Documents\chess-coach-ai
powershell -ExecutionPolicy Bypass -File .\scripts\beta-smoke.ps1 `
  -FrontendUrl https://VOTRE-WEB.onrender.com `
  -BackendUrl https://VOTRE-API.onrender.com
```

## 6. OAuth Google optionnel

Ajouter exactement `https://VOTRE-WEB.onrender.com/api/auth/callback/google` dans Google Cloud, puis vérifier une vraie connexion et reconnexion. Si ce test échoue, masquer/ne pas annoncer Google et conserver email/mot de passe ; cela ne bloque pas la bêta.

## 7. Smoke manuel

- compte A : signup, logout, mauvais mot de passe, login ;
- compte B : signup puis vérifier absence des données A ;
- une partie IA et une partie/invitation entre A et B ;
- pendant la partie compétitive, analyse/Nox/IA doivent répondre par le verrou fair-play ;
- après la partie : analyse, Nox, mission et Session du jour ;
- feedback puis bug fictif sans donnée privée ;
- mobile 390×844, refresh, offline/reconnexion ;
- `/dev/diagnostics` doit être 404 et les paramètres preview sans effet.

## 8. Rollback

1. Revenir dans Render au dernier commit connu stable pour web et API.
2. Ne pas rétrograder Alembic : les migrations sont additives et les stores antérieurs ignorent les colonnes/tables nouvelles.
3. Vérifier `/ready`, `/api/health` puis refaire le smoke.
4. Si la DB est indisponible, laisser les services non prêts plutôt que basculer vers un fichier local.

## 9. Analytics

Consulter PostgreSQL en lecture seule :

```sql
SELECT event_name, COUNT(*) FROM beta_events GROUP BY event_name ORDER BY 2 DESC;
SELECT version, COUNT(*) FROM beta_events GROUP BY version ORDER BY 2 DESC;
```

Vérifier `app_opened`, partie, analyse, Nox, session, retour et clan. Ne pas exporter les identifiants visiteurs hors du besoin bêta.

## 10. Feedback et bugs

```sql
SELECT created_at, rating, liked, friction, nox_helped, comment, page, platform, version
FROM beta_feedback ORDER BY created_at DESC;
SELECT created_at, comment, page, platform, browser, version, app_state
FROM beta_bug_reports ORDER BY created_at DESC;
```

Les routes de lecture DEV restent volontairement inaccessibles en production. Stocker les exports dans un emplacement privé et les supprimer après synthèse.
