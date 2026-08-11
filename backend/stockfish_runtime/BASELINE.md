# Baseline locale Stockfish - Phase 0.4

Commande executee depuis `backend` :

```powershell
.\.venv\Scripts\python.exe scripts\stockfish_load_baseline.py
```

Conditions : binaire local, profondeur 15, MultiPV 3 (contrat `/analysis`), moteur deja demarre,
positions distinctes et verrou global serialise. Mesures du 12 aout 2026 :

| Requetes simultanees | Mediane | Maximum | Attente cumulee | Moteur cumule | Timeouts |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 353,724 ms | 353,724 ms | 0,002 ms | 351,150 ms | 0 |
| 4 | 1 478,544 ms | 2 120,457 ms | 3 264,030 ms | 2 114,506 ms | 0 |
| 10 | 1 548,686 ms | 3 137,626 ms | 13 494,505 ms | 3 124,666 ms | 1 |

Sur cette machine, une instance absorbe confortablement un burst de 4 analyses
de profondeur 15 avec trois variantes. A 10 requetes, la derniere depasse le
timeout de file de 3 secondes. Le debit moteur soutenable observe est de
l'ordre de 2,8 a 3,2 analyses/s selon la complexite des positions.

Avec le timeout de file de 3 secondes, la recommandation prudente est de viser
4 analyses strictement simultanees par instance. Six a huit peuvent passer
selon les positions, mais 10 ne constituent deja plus une cible fiable. Cela
peut correspondre a davantage d'utilisateurs actifs si leurs demandes sont
etalees ; cette conversion dependra de la frequence reelle d'analyse. Le
materiel Render devra etre mesure separement avant dimensionnement.

Le goulot principal est clairement la file : a 10 requetes, le temps moteur
cumule est proche de 3,12 s tandis que l'attente cumulee atteint 13,49 s.
