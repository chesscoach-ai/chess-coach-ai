# Phase 2.4 — Clan V2 : progression sociale

## Intention produit

Clan V2 transforme l’ancienne page Communauté, très chargée, en un espace de petite troupe. L’écran ne comporte que trois blocs : **Mon Clan**, **Activité** et **Défis & parties**. Le multijoueur existant reste la destination du défi ; aucun mini-jeu social parallèle n’a été créé.

Le socle communautaire est inclus dans Knightly Free. L’abonnement Knightly+ ne donne aucun avantage de classement, d’invitation, de défi ou d’objectif collectif.

## Audit et décisions

- Les amitiés, clans, parties privées, Elo, statistiques réelles et objectifs hebdomadaires existaient déjà.
- La collection d’avatars, la route de progression, les statistiques, la ligue et le classement global ont été retirés de cette vue pour rendre l’action principale évidente. Ils ne sont pas supprimés du produit.
- Les anciens points mensuels et médailles restent compatibles avec les données existantes mais ne sont plus mélangés au nouvel objectif collectif.
- L’objectif de la semaine compte uniquement les parties réellement terminées par les membres : `max(4, nombre de membres × 2)`.
- Le défi d’un membre ouvre le flux existant « Jouer avec un ami » ; il produit donc une vraie partie et ne duplique pas le moteur multijoueur.
- Nox reste discret : seul son rang vérifié côté serveur peut figurer sur une fiche membre.

## Confidentialité et permissions

- Le partage de progression est **désactivé par défaut**.
- Le joueur peut partager son rang Nox et un résumé général d’activité. Les erreurs, faiblesses, scores pédagogiques détaillés, PGN, conversations et e-mails ne sont jamais placés dans le flux.
- Les membres du clan sont exposés au client avec un identifiant public haché, jamais avec leur identifiant de compte.
- Une invitation contient uniquement un code public `KLY-XXXXXXXX` et un lien. Le chef peut le renouveler, ce qui invalide l’ancien.
- Le serveur valide création, adhésion, capacité maximale de 12 membres, renouvellement réservé au chef, départ et préférence de partage.
- Le renouvellement d’invitation est limité côté serveur pour éviter les rafales accidentelles.
- Si le chef quitte un clan avec d’autres membres, le rôle est transféré au membre le plus ancien. S’il est seul, le clan est dissous.
- Un invité peut comprendre la proposition de valeur, mais doit créer un compte pour rejoindre durablement.

## Persistance

La migration Alembic `0007_clan_v2` adopte les tables communautaires historiques et ajoute :

- `community_profiles.share_progress`, valeur par défaut `false` ;
- `community_clans.invite_code`, public et unique ;
- les index nécessaires aux codes et à l’ordre d’arrivée des membres.

Le store frontend ne crée plus ces tables implicitement. En mode local sans PostgreSQL, le fallback `.data/community.json` reste disponible et compatible avec les profils plus anciens.

## API

- `GET /api/community` : tableau de bord social filtré pour le joueur connecté.
- `POST /api/community/clans` : actions `create`, `join`, `rotate-invite`, `leave`.
- `PATCH /api/community/privacy` : active ou désactive le partage général.
- `POST /api/community/friends` : ajoute un joueur au cercle d’amis existant.

Les erreurs prévues couvrent notamment invitation invalide, clan complet, adhésion déjà existante, permission chef, compte requis et backend indisponible.

## Analytics bêta

Les événements suivants utilisent l’observabilité bêta existante : `clan_viewed`, `clan_created`, `clan_joined`, `clan_invite_created`, `clan_invite_accepted`, `clan_challenge_sent`, `clan_challenge_started`, `clan_activity_viewed`, `clan_goal_viewed`, `clan_goal_completed`.

## Aperçus DEV sans mutation

En développement uniquement, ouvrir :

`http://localhost:3000/?mode=multiplayer&kind=community&clanPreview=SCENARIO`

Scénarios : `empty`, `duo`, `active`, `activity`, `invite`, `challenge`, `goal`.

Ces aperçus ne lisent ni ne modifient les comptes, clans ou parties réels. Toute action y est simulée. `resolveClanPreview` refuse explicitement ces scénarios quand l’environnement vaut `production`.

Pour contrôler exactement la largeur mobile sans redimensionner le navigateur :

`http://localhost:3000/dev/mobile-preview?scenario=active`

Cette page DEV encapsule Knightly dans un viewport 390 × 844 et renvoie une page introuvable en production.

## Vérifications prévues

- règles d’invitation, limite, adhésion dupliquée, transfert/dissolution et filtrage privé ;
- aperçu vide/actif/objectif et refus en production ;
- migration complète depuis une base vide et conservation des données ;
- lint, tests frontend, build Next.js et tests backend ;
- captures desktop et mobile à 390 × 844.
