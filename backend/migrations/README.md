# Migrations PostgreSQL

Les migrations sont l'unique source de vérité du schéma PostgreSQL pour les
domaines déjà adoptés. Elles ne sont jamais exécutées implicitement lors de
l'import d'un module.

Depuis `backend` :

```powershell
alembic current
alembic upgrade head
alembic history --verbose
```

`DATABASE_URL` doit désigner PostgreSQL. Les tests peuvent injecter une URL
SQLite temporaire uniquement pour vérifier l'orchestration et la conservation
des données de la baseline.
