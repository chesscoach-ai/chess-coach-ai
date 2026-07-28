import { Chess, type Move } from "chess.js";

export type PGNExampleCategory =
  | "opening"
  | "middlegame"
  | "endgame";

export type PGNExampleDifficulty =
  | "débutant"
  | "intermédiaire"
  | "avancé";

export interface PGNExample {
  id: string;
  title: string;
  subtitle: string;
  category: PGNExampleCategory;
  description: string;
  difficulty: PGNExampleDifficulty;
  themes: string[];
  pgn: string;
  collection?: "standard" | "legend";
  champion?: string;
  historicalNote?: string;
  sourceUrl?: string;
  decisionNumber?: number;
  decisionCount?: number;
}

const BASE_PGN_EXAMPLES: PGNExample[] = [
  {
    id: "opening-italian-classical",
    title: "Partie italienne",
    subtitle: "Développement classique",
    category: "opening",
    description:
      "Une position saine pour travailler le développement rapide et le contrôle du centre.",
    difficulty: "débutant",
    themes: ["développement", "centre", "roque"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O *`,
  },
  {
    id: "opening-ruy-lopez",
    title: "Partie espagnole",
    subtitle: "Pression sur le centre",
    category: "opening",
    description:
      "Une structure fondamentale pour comprendre la pression à long terme sur e5.",
    difficulty: "intermédiaire",
    themes: ["pression", "développement", "structure"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 *`,
  },
  {
    id: "opening-sicilian",
    title: "Défense sicilienne",
    subtitle: "Jeu asymétrique",
    category: "opening",
    description:
      "Une position dynamique pour travailler les plans opposés et les ruptures centrales.",
    difficulty: "intermédiaire",
    themes: ["initiative", "rupture", "développement"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e6 7. f3 Be7 *`,
  },
  {
    id: "opening-caro-kann",
    title: "Défense Caro-Kann",
    subtitle: "Structure solide",
    category: "opening",
    description:
      "Une ouverture idéale pour travailler la solidité et le développement du fou de cases blanches.",
    difficulty: "débutant",
    themes: ["solidité", "structure", "développement"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. Nf3 Nd7 7. h4 h6 *`,
  },
  {
    id: "opening-queens-gambit",
    title: "Gambit dame",
    subtitle: "Tension centrale",
    category: "opening",
    description:
      "Travaille la gestion de la tension centrale et la mobilisation harmonieuse des pièces.",
    difficulty: "intermédiaire",
    themes: ["centre", "tension", "développement"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 *`,
  },
  {
    id: "opening-london",
    title: "Système de Londres",
    subtitle: "Plan simple et cohérent",
    category: "opening",
    description:
      "Une mise en place claire pour travailler les plans plutôt que la mémorisation.",
    difficulty: "débutant",
    themes: ["plan", "développement", "sécurité du roi"],
    pgn: `[Event "Exemple d'ouverture"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. d4 Nf6 2. Nf3 d5 3. Bf4 e6 4. e3 Bd6 5. Bg3 O-O 6. Bd3 c5 7. c3 Nc6 *`,
  },

  {
    id: "middlegame-opposite-castling",
    title: "Roques opposés",
    subtitle: "Course à l'attaque",
    category: "middlegame",
    description:
      "Une position tendue où chaque camp doit lancer rapidement ses pions contre le roi adverse.",
    difficulty: "intermédiaire",
    themes: ["attaque du roi", "initiative", "tempo"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Be3 e6 7. Qd2 Be7 8. O-O-O O-O 9. f3 d5 10. g4 Nxd4 11. Bxd4 b5 *`,
  },
  {
    id: "middlegame-iqp",
    title: "Pion dame isolé",
    subtitle: "Activité contre faiblesse",
    category: "middlegame",
    description:
      "Une structure classique pour comprendre la compensation dynamique d'un pion isolé.",
    difficulty: "intermédiaire",
    themes: ["pion isolé", "activité", "cases fortes"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 exd5 9. Bd3 Bb7 10. O-O Nbd7 11. Rc1 c5 12. dxc5 bxc5 *`,
  },
  {
    id: "middlegame-kingside-attack",
    title: "Attaque sur le roi",
    subtitle: "Accumuler les forces",
    category: "middlegame",
    description:
      "Apprends à regrouper les pièces autour du roi avant d'ouvrir les lignes.",
    difficulty: "avancé",
    themes: ["attaque", "sacrifice", "coordination"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. Bg5 Be7 5. e5 Nfd7 6. h4 O-O 7. Bd3 c5 8. Qh5 g6 9. Qh6 cxd4 10. Nf3 dxc3 11. h5 cxb2 12. Rb1 Qa5+ *`,
  },
  {
    id: "middlegame-open-file",
    title: "Colonne ouverte",
    subtitle: "Activité des tours",
    category: "middlegame",
    description:
      "Travaille la domination d'une colonne ouverte et l'invasion de la septième rangée.",
    difficulty: "intermédiaire",
    themes: ["colonne ouverte", "tours", "invasion"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Bd3 c5 13. O-O Nd7 *`,
  },
  {
    id: "middlegame-minority-attack",
    title: "Attaque de minorité",
    subtitle: "Créer une faiblesse",
    category: "middlegame",
    description:
      "Un plan stratégique classique pour provoquer un pion faible sur l'aile dame.",
    difficulty: "avancé",
    themes: ["attaque de minorité", "faiblesse", "plan"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5 5. Bg5 Be7 6. e3 O-O 7. Bd3 Nbd7 8. Qc2 Re8 9. Nge2 Nf8 10. O-O c6 11. Rab1 a5 12. a3 Bd6 13. b4 axb4 14. axb4 *`,
  },
  {
    id: "middlegame-central-break",
    title: "Rupture centrale",
    subtitle: "Ouvrir au bon moment",
    category: "middlegame",
    description:
      "Évalue quand une rupture centrale libère tes pièces et transforme la position.",
    difficulty: "avancé",
    themes: ["rupture", "centre", "calcul"],
    pgn: `[Event "Exemple de milieu de partie"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8 9. Nc3 Ke8 10. h3 h5 11. Bf4 Be6 12. Rad1 Be7 *`,
  },

  {
    id: "endgame-opposition",
    title: "Opposition des rois",
    subtitle: "Finale de pions",
    category: "endgame",
    description:
      "Un exercice essentiel pour maîtriser l'opposition directe et la promotion.",
    difficulty: "débutant",
    themes: ["opposition", "roi actif", "promotion"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1"]

1. Kc3 Kc5 2. d4+ Kd5 3. Kd3 *`,
  },
  {
    id: "endgame-lucena",
    title: "Position de Lucena",
    subtitle: "Construire un pont",
    category: "endgame",
    description:
      "La technique fondamentale pour gagner une finale tour et pion contre tour.",
    difficulty: "avancé",
    themes: ["finale de tours", "pont", "promotion"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "1K6/1P1k4/8/8/8/8/r7/4R3 w - - 0 1"]

1. Rd1+ Ke6 2. Kc7 Rc2+ 3. Kb6 Rb2+ 4. Kc6 Rc2+ 5. Kb5 Rb2+ 6. Kc4 *`,
  },
  {
    id: "endgame-philidor",
    title: "Position de Philidor",
    subtitle: "Défense de la troisième rangée",
    category: "endgame",
    description:
      "Apprends la méthode défensive la plus importante des finales de tours.",
    difficulty: "avancé",
    themes: ["défense", "finale de tours", "activité"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "8/8/4k3/4P3/4K3/8/r7/4R3 b - - 0 1"]

1... Ra4+ 2. Kf3 Ra3+ 3. Kf4 Ra4+ 4. Re4 Ra1 *`,
  },
  {
    id: "endgame-rook-active",
    title: "Tour active derrière le pion",
    subtitle: "Activité avant matériel",
    category: "endgame",
    description:
      "Une finale pratique pour comprendre pourquoi la tour doit rester active.",
    difficulty: "intermédiaire",
    themes: ["tour active", "pion passé", "activité"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "8/5pk1/4p1p1/3pP3/3P1P2/6P1/4K3/R6r w - - 0 1"]

1. Rxh1 Kf8 2. Kd3 Ke7 3. Kc3 Kd7 4. Kb4 Kc6 *`,
  },
  {
    id: "endgame-bishop-pawns",
    title: "Fou contre pions",
    subtitle: "Bloquer avant d'attaquer",
    category: "endgame",
    description:
      "Coordonne le roi et le fou pour arrêter des pions passés liés.",
    difficulty: "intermédiaire",
    themes: ["fou", "pions passés", "blocage"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "8/8/3k4/3pp3/8/2B1K3/8/8 w - - 0 1"]

1. Bb4+ Ke6 2. Bc5 Kf5 3. Bd6 d4+ 4. Kd3 *`,
  },
  {
    id: "endgame-queen-vs-pawn",
    title: "Dame contre pion avancé",
    subtitle: "Approcher le roi",
    category: "endgame",
    description:
      "Une technique précise : forcer le roi adverse devant son pion pour rapprocher le sien.",
    difficulty: "avancé",
    themes: ["dame", "pion avancé", "technique"],
    pgn: `[Event "Exemple de finale"]
[Site "Chess Coach"]
[Date "2026.01.01"]
[Round "-"]
[White "Blancs"]
[Black "Noirs"]
[Result "*"]
[SetUp "1"]
[FEN "8/8/8/8/8/7K/1p6/3Q2k1 w - - 0 1"]

1. Qb1+ Kf2 2. Qxb2+ Kf3 3. Qd4 *`,
  },
];

const LEGEND_GAMES: PGNExample[] = [
  {
    id: "legend-morphy-opera-1858",
    title: "Morphy à l’Opéra",
    subtitle: "Paul Morphy – duc de Brunswick et comte Isouard, 1858",
    category: "middlegame",
    description:
      "Prends la place de Morphy dans une partie devenue un modèle de développement, d’ouverture des lignes et d’attaque du roi.",
    difficulty: "intermédiaire",
    themes: ["développement", "sacrifice", "attaque du roi"],
    collection: "legend",
    champion: "Paul Morphy",
    historicalNote:
      "Une démonstration historique : toutes les pièces entrent dans le jeu avec tempo avant l’attaque finale.",
    sourceUrl: "https://lichess.org/study/aVdQHxwx/jHDna5ZE",
    pgn: `[Event "Partie de l'Opéra"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "-"]
[White "Paul Morphy"]
[Black "Duc de Brunswick et comte Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5
6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6
15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    id: "legend-kasparov-topalov-1999",
    title: "L’immortelle de Kasparov",
    subtitle: "Garry Kasparov – Veselin Topalov, Wijk aan Zee 1999",
    category: "middlegame",
    description:
      "Mesure tes choix à ceux de Kasparov dans une attaque spectaculaire où le roi adverse est poursuivi jusqu’au centre.",
    difficulty: "avancé",
    themes: ["calcul", "sacrifice de tour", "roi exposé"],
    collection: "legend",
    champion: "Garry Kasparov",
    historicalNote:
      "La combinaison 24.Txd4! lance une longue chasse au roi. Cherche d’abord les coups forcés avant de compter le matériel.",
    sourceUrl: "https://lichess.org/study/UU8bF5Ap/Q96G90LR",
    pgn: `[Event "Hoogovens"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5
7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7
12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6
17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4
22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6
26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7
30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3
34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7
38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1
42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
  {
    id: "legend-capablanca-tartakower-1924",
    title: "La finale modèle de Capablanca",
    subtitle: "José Raúl Capablanca – Savielly Tartakower, New York 1924",
    category: "endgame",
    description:
      "Entre dans cette finale célèbre et compare tes décisions à celles de Capablanca : roi actif, tour sur la septième rangée et pion passé soutenu.",
    difficulty: "avancé",
    themes: ["finale de tours", "roi actif", "pion passé"],
    collection: "legend",
    champion: "José Raúl Capablanca",
    historicalNote:
      "Capablanca accepte de rendre du matériel pour activer son roi et soutenir un pion passé. Cherche l’activité avant de compter les pions.",
    sourceUrl: "https://lichess.org/study/M3mZMe8l/MshiKf1G",
    pgn: `[Event "New York"]
[Site "New York, NY USA"]
[Date "1924.03.23"]
[Round "6"]
[White "Jose Raul Capablanca"]
[Black "Savielly Tartakower"]
[Result "1-0"]

1. d4 e6 2. Nf3 f5 3. c4 Nf6 4. Bg5 Be7 5. Nc3 O-O 6. e3 b6
7. Bd3 Bb7 8. O-O Qe8 9. Qe2 Ne4 10. Bxe7 Nxc3 11. bxc3 Qxe7
12. a4 Bxf3 13. Qxf3 Nc6 14. Rfb1 Rae8 15. Qh3 Rf6 16. f4 Na5
17. Qf3 d6 18. Re1 Qd7 19. e4 fxe4 20. Qxe4 g6 21. g3 Kf8
22. Kg2 Rf7 23. h4 d5 24. cxd5 exd5 25. Qxe8+ Qxe8
26. Rxe8+ Kxe8 27. h5 Rf6 28. hxg6 hxg6 29. Rh1 Kf8
30. Rh7 Rc6 31. g4 Nc4 32. g5 Ne3+ 33. Kf3 Nf5
34. Bxf5 gxf5 35. Kg3 Rxc3+ 36. Kh4 Rf3 37. g6 Rxf4+
38. Kg5 Re4 39. Kf6 Kg8 40. Rg7+ Kh8 41. Rxc7 Re8
42. Kxf5 Re4 43. Kf6 Rf4+ 44. Ke5 Rg4 45. g7+ Kg8
46. Rxa7 Rg1 47. Kxd5 Rc1 48. Kd6 Rc2 49. d5 Rc1
50. Rc7 Ra1 51. Kc6 Rxa4 52. d6 Rc4+ 53. Kb7 1-0`,
  },
];

function moveOnReplay(game: Chess, move: Move): void {
  game.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });
}

function createCheckpointPgn(
  example: PGNExample,
  ply: number,
): string {
  const source = new Chess();
  source.loadPgn(example.pgn);

  const headers = source.getHeaders();
  const initialFen = headers.FEN;
  const replay = initialFen
    ? new Chess(initialFen)
    : new Chess();

  Object.entries(headers).forEach(([key, value]) => {
    replay.setHeader(key, value);
  });
  replay.setHeader("Result", "*");

  source
    .history({ verbose: true })
    .slice(0, ply)
    .forEach((move) => {
      moveOnReplay(replay, move);
    });

  return replay.pgn();
}

function expandGameIntoDecisions(
  example: PGNExample,
): PGNExample[] {
  const game = new Chess();
  game.loadPgn(example.pgn);
  const totalPlies = game.history().length;
  const firstPly =
    example.collection === "legend"
      ? Math.min(9, totalPlies)
      : Math.min(5, totalPlies);
  const step =
    example.collection === "legend" ? 2 : 1;
  const checkpoints: number[] = [];

  for (
    let ply = firstPly;
    ply <= totalPlies;
    ply += step
  ) {
    checkpoints.push(ply);
  }

  if (
    checkpoints.at(-1) !== totalPlies &&
    totalPlies > 0
  ) {
    checkpoints.push(totalPlies);
  }

  return checkpoints.map((ply, index) => ({
    ...example,
    id: `${example.id}-decision-${ply}`,
    title:
      example.collection === "legend"
        ? example.title
        : `${example.title} · position ${index + 1}`,
    subtitle:
      example.collection === "legend"
        ? `${example.subtitle} · décision ${index + 1}`
        : example.subtitle,
    description:
      example.collection === "legend"
        ? `${example.description} Décision ${index + 1} sur ${checkpoints.length}.`
        : example.description,
    pgn: createCheckpointPgn(example, ply),
    decisionNumber: index + 1,
    decisionCount: checkpoints.length,
  }));
}

export const PGN_EXAMPLES: PGNExample[] = [
  ...BASE_PGN_EXAMPLES,
  ...LEGEND_GAMES,
].flatMap(expandGameIntoDecisions);

export function getExamplesByCategory(
  category: PGNExampleCategory,
): PGNExample[] {
  return PGN_EXAMPLES.filter(
    (example) =>
      example.category === category,
  );
}
