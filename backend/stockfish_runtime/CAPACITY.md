# Capacite controlee - Phase 0.5

## Environnement de test

- Local : AMD Ryzen 7 8840HS, 16 processeurs logiques, 32 Go de RAM.
- Charge : profondeur 15, MultiPV 3, Hash 32 Mo par moteur.
- Render : frontend sain en 189 ms ; deux reveils du moteur ont retourne 503
  apres environ 32,46 s. Aucune charge concurrente n'a donc ete envoyee.

## Pool et Threads

Mesures locales reproductibles avec `scripts/stockfish_pool_baseline.py` :

| Pool | Threads/moteur | Requetes | Mediane ms | p95/max ms | Debit/s | Attente ms | CPU s | RAM Stockfish Mo |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 1 | 241 | 241 | 4,11 | 0 | 0,23 | 308 |
| 1 | 1 | 4 | 1 034 | 1 521 | 2,62 | 2 350 | 1,50 | 308 |
| 1 | 1 | 10 | 1 955 | 4 031 | 2,47 | 15 838 | 4,02 | 308 |
| 1 | 2 | 1 | 459 | 459 | 2,17 | 0 | 0,89 | 339 |
| 1 | 2 | 4 | 958 | 1 503 | 2,66 | 2 229 | 2,83 | 339 |
| 1 | 2 | 10 | 2 293 | 3 976 | 2,51 | 18 489 | 7,73 | 339 |
| 2 | 1 | 1 | 646 | 646 | 1,54 | 0 | 0,58 | 510 |
| 2 | 1 | 4 | 957 | 1 211 | 3,29 | 1 456 | 2,19 | 521 |
| 2 | 1 | 10 | 1 619 | 2 562 | 3,89 | 10 960 | 4,78 | 534 |
| 2 | 2 | 1 | 994 | 994 | 1,01 | 0 | 1,56 | 589 |
| 2 | 2 | 4 | 957 | 1 241 | 3,22 | 1 536 | 4,13 | 588 |
| 2 | 2 | 10 | 1 465 | 2 643 | 3,77 | 10 868 | 9,53 | 606 |

Les mesures a une requete sont sensibles au warm-up et a la position. Sous
charge, le meilleur compromis est **2 moteurs x 1 thread**, qui augmente le
debit de 2,47 a 3,89 analyses/s a 10 requetes (+57 %) tout en consommant
environ 534 Mo pour les seuls processus Stockfish. Deux threads par moteur
n'apportent pas de gain utile et doublent presque le CPU consomme.

## Analyse complete d'une partie

Simulation synchrone a profondeur 10, MultiPV 1 :

| Positions | Appels moteur | Premier passage | Passage en cache |
| ---: | ---: | ---: | ---: |
| 20 | 20 | 0,822 s | 0,001 s |
| 40 | 40 | 0,791 s | 0,003 s |
| 60 | 60 | 0,936 s | 0,004 s |

Chaque position est independante et reutilisable par le cache global. Une
analyse complete synchrone monopolise toutefois un moteur ; elle devra devenir
un travail de basse priorite avant d'etre proposee a grande echelle.

## Configuration recommandee

### Demonstration Render actuelle (Free, 512 Mo / 0,1 CPU)

- pool 1 ; Threads 1 ; Hash 32 Mo ; file maximale 6 ;
- usage de demonstration uniquement ;
- le pool 2 est exclu : sa RAM Stockfish mesuree depasse deja 512 Mo avant
  Python/FastAPI.

### Lancement commercial

- instance d'au moins 2 Go / 1 CPU ;
- pool 2 ; Threads 1 ; Hash 32 Mo par moteur ;
- file maximale 8, puis rejet rapide en 503 ;
- cible prudente : 3 analyses interactives/s et 6 a 8 analyses simultanees.

Pour 1 000 inscrits, cette configuration convient si 1 a 2 % analysent au
meme instant. Les analyses completes doivent rester differees ou limitees.
Au-dela, il faudra mesurer le trafic reel avant d'ajouter une seconde instance.

## Admission et fairness

Le pool accepte au maximum `pool_size + max_queue_size` operations. Le surplus
est rejete immediatement par `ServiceBusyError` (HTTP 503). L'acquisition reste
centralisee : une future politique de priorite ou quota utilisateur pourra
etre inseree avant le semaphore sans modifier les services d'analyse.

## Risques

- Render Free se met en veille et n'est pas une infrastructure de production.
- La RAM Stockfish est nettement superieure a la seule valeur Hash.
- Le benchmark local dispose de beaucoup plus de CPU que Render Free.
- Les metriques sont en memoire et propres a chaque processus web.
- Une deconnexion HTTP ne stoppe pas encore instantanement le calcul synchrone.
