# Phase 0.7 — inventaire PostgreSQL et trajectoire de migration

## Périmètre adopté dans Alembic

La révision courante est `0002_core_identity_billing`.

- `0001_stockfish_cache` adopte `stockfish_analysis_cache` et ses index.
- `0002_core_identity_billing` adopte `users`, `billing_subscriptions`,
  `analysis_trial_claims` et `game_review_usage`.
- Les bootstraps ont été retirés de ces quatre stores et du backend cache.
- Les migrations utilisent `IF NOT EXISTS` pour adopter une base existante sans
  réécrire ni supprimer de données.
- Les downgrades de cette baseline ne suppriment aucune table : ils déplacent
  seulement la version Alembic. Les migrations futures pourront avoir des
  downgrades ciblés lorsqu'ils seront réellement réversibles.
- Le conteneur tente `alembic upgrade head` avant l'API. Si PostgreSQL est
  indisponible, l'erreur est explicite mais le moteur démarre en mode dégradé ;
  les stores adoptés refusent alors leurs écritures tant que la révision
  attendue n'est pas visible.

## Inventaire complet

`PK` signifie clé primaire, `UQ` contrainte unique et `FK` clé étrangère.

| Domaine | Table et colonnes | Clés, contraintes, index | Propriétaire / bootstrap historique | Données et environnement | État 0.7 |
| --- | --- | --- | --- | --- | --- |
| B Authentification | `users`: `id UUID`, `name varchar(80)`, `email varchar(320)`, `password_hash text`, `created_at timestamptz` | PK `id`, UQ `email`, NOT NULL | `frontend/lib/auth/userStore.ts` | Critique, PostgreSQL ; `users.json` en local | Alembic 0002, bootstrap retiré |
| E Abonnements | `billing_subscriptions`: `user_id text`, identifiants Stripe client/abonnement, statut, échéance, annulation, date MAJ | PK `user_id`, UQ `customer_id`, UQ `subscription_id` | `frontend/lib/billing/subscriptionStore.ts` | Critique, PostgreSQL ; JSON local | Alembic 0002, bootstrap retiré |
| E Abonnements | `analysis_trial_claims`: hash utilisateur, début, fin | PK `user_hash` | même store | Critique anti-abus, PG ; JSON local | Alembic 0002, bootstrap retiré |
| E Abonnements | `game_review_usage`: `user_id`, `game_ids JSONB`, date MAJ | PK `user_id` | `frontend/lib/billing/gameReviewStore.ts` | Quota de bilans, PG ; JSON local | Alembic 0002, bootstrap retiré |
| H Cache Stockfish | `stockfish_analysis_cache`: clé, versions schéma/moteur/namespace/profil, FEN, profondeur, MultiPV, `facts JSONB`, dates, hits | PK `cache_key`, index expiration et dernier accès | `backend/stockfish_runtime/analysis_cache.py` | Temporaire/recalculable, partagé ; SQLite local ou PG | Alembic 0001 ; seul SQLite garde son bootstrap |
| I Migration | `alembic_version`: `version_num` | PK gérée par Alembic | Alembic | Critique pour le déploiement PostgreSQL | Gérée par Alembic |
| A Données utilisateur / légal | `legal_acceptances`: hash, versions CGU/confidentialité, source, date | PK composite hash + versions | `frontend/lib/legal/acceptanceStore.ts` | Critique juridique, PG uniquement | Bootstrap temporaire, prochaine vague |
| C Progression | `progression_profiles`: joueur, nom, ledger JSONB, freeze, date MAJ | PK `player_id` | `progressionStore.ts` et duplication dans `pushStore.ts` | Critique progression, PG ; JSON local | Bootstrap conservé, priorité haute |
| C Progression | `progression_exercise_events`: joueur, exercice, jour, durée, erreurs, indices, date | PK composite joueur/exercice/jour | `frontend/lib/progression/progressionStore.ts` | Historique pédagogique, PG ; JSON local | Bootstrap temporaire |
| G Missions | Pas de table dédiée ; état inclus dans le ledger de `progression_profiles` | — | progression/journey | Critique mais imbriqué en JSONB | À séparer seulement après audit produit |
| D Multijoueur | `multiplayer_players`: id, nom, Elo, parties, date MAJ | PK `id`, Elo défaut 600 | `frontend/lib/multiplayer/gameStore.ts` | Critique, PG ; JSON local | Bootstrap temporaire, priorité haute |
| D Multijoueur | `multiplayer_games`: UUID, code invitation, données JSONB, dates | PK `id`, UQ `invite_code` | même store | Critique/historique, PG ; JSON local | Bootstrap temporaire |
| F Social/clans | `community_profiles`: joueur, avatar, date MAJ | PK `player_id` | `frontend/lib/community/communityStore.ts` | Profil social, PG ; JSON local | Bootstrap temporaire |
| F Social/clans | `community_friendships`: joueurs A/B, date | PK composite, CHECK `player_a < player_b` | même store | Graphe social, PG ; JSON local | Bootstrap temporaire |
| F Social/clans | `community_clans`: UUID, nom, tag, propriétaire, date | PK `id`, UQ `tag` | même store | Critique communauté, PG ; JSON local | Bootstrap temporaire |
| F Social/clans | `community_clan_members`: clan, joueur, date | PK composite, UQ joueur, FK clan avec cascade | même store | Critique communauté, PG ; JSON local | Bootstrap temporaire |
| C Apprentissage | `learning_placements`: joueur, résultat JSONB, date MAJ | PK `player_id` | `frontend/lib/learning/placementStore.ts` | Placement, PG ; JSON local | Bootstrap temporaire |
| C Apprentissage | `learning_profiles`: utilisateur, données JSONB, date MAJ | PK `user_id` | `frontend/lib/learning/profileStore.ts` | Profil coach, PG ; JSON local | Bootstrap temporaire |
| I Notifications | `push_subscriptions`: endpoint, joueur/nom, clés WebPush, rappel, timezone, dernier envoi, date MAJ | PK `endpoint` | `frontend/lib/push/pushStore.ts` | Sensible technique, PG ; JSON local | Bootstrap temporaire |
| I Notifications | `native_push_tokens`: token, joueur, plateforme, date MAJ | PK `token`, CHECK iOS/Android | `frontend/lib/push/nativePushStore.ts` | Sensible technique, PG ; mémoire locale | Bootstrap temporaire |
| C Récompenses | `battle_reward_profiles`: joueur, fragments, bannières JSONB, sélection, date MAJ | PK `player_id` | `frontend/lib/rewards/battleRewardStore.ts` | Progression/cosmétique, PG ; JSON local | Bootstrap + ALTER temporaires |
| C Récompenses | `battle_reward_claims`: joueur, date, montant, date réclamation | PK composite joueur/date | même store | Anti-double gain, PG ; JSON local | Bootstrap temporaire |
| A Suppression | `account_deletion_tombstones`: hash abonnement, date suppression | PK `subscription_hash` | `frontend/lib/privacy/accountData.ts` pendant la suppression | Critique conformité, PG | Bootstrap à migrer en priorité haute |

Il n'existe actuellement qu'une relation SQL explicite :
`community_clan_members.clan_id → community_clans.id ON DELETE CASCADE`.
Les autres liens sont logiques et utilisent principalement l'e-mail dans des
colonnes `player_id` ou `user_id` de type texte.

## Ordre de migration proposé après 0.7

1. conformité : `legal_acceptances`, `account_deletion_tombstones` ;
2. progression : profils, événements, placements et récompenses ;
3. multijoueur et historique ;
4. communauté/clans ;
5. notifications ;
6. suppression des derniers pools et bootstraps dispersés.

Chaque vague doit avoir sa migration, ses tests de conservation, puis retirer
uniquement les bootstraps du domaine adopté.

## Future identité utilisateur stable — hors périmètre 0.7

Aujourd'hui `users.id` est déjà un UUID pour les comptes à mot de passe, mais la
session transforme systématiquement l'e-mail en `AuthenticatedPlayer.id`.
Google n'a pas de ligne persistante dans `users`, et `password_hash NOT NULL`
empêche d'utiliser cette table telle quelle pour toutes les identités. Une
conversion globale immédiate serait risquée.

Plan futur recommandé, dans une phase indépendante :

1. créer `app_users(id UUID, email, display_name, created_at, updated_at,
   deleted_at)` avec e-mail mutable et unique tant que le compte est actif ;
2. créer `auth_identities(user_id FK, provider, provider_subject,
   password_hash nullable)` avec unicité fournisseur/sujet ;
3. importer les comptes credentials en conservant leur UUID actuel ;
4. créer/lier une identité Google grâce au `sub` Google, jamais grâce au seul
   e-mail ;
5. ajouter des colonnes `user_uuid` nullables aux domaines, puis backfiller via
   les e-mails normalisés avec rapport des lignes ambiguës ;
6. passer en double lecture/écriture, basculer les JWT vers l'UUID, puis rendre
   les FK obligatoires domaine par domaine ;
7. lors d'une suppression, conserver uniquement les tombstones nécessaires,
   anonymiser l'historique et détacher credentials/Google sans réutiliser l'UUID.

Aucune de ces opérations n'est effectuée en 0.7.

## Limite de validation

Les tests de migration utilisent une vraie base SQLite temporaire via Alembic
pour vérifier orchestration, version, adoption, idempotence, index, rollback et
conservation. Le SQL retenu reste compatible PostgreSQL, mais une répétition sur
une instance PostgreSQL locale/éphémère sera nécessaire avant le lancement
commercial.
