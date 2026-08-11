"""Positions stables utilisées pour détecter les régressions Stockfish.

Les attentes portent volontairement sur des propriétés échiquéennes robustes
(légalité, mat forcé, promotion, capture et roque), et non sur une évaluation
exacte susceptible de varier avec la version du moteur.
"""

INITIAL_POSITION = (
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/"
    "RNBQKBNR w KQkq - 0 1"
)

TACTICAL_MATE_IN_ONE = (
    "6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1"
)

KING_AND_QUEEN_MATE_IN_ONE = (
    "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1"
)

PROMOTION_MATE_IN_ONE = (
    "7k/P7/6K1/8/8/8/8/8 w - - 0 1"
)

CAPTURE_POSITION = (
    "7k/8/8/3p4/4P3/8/8/7K w - - 0 1"
)

CASTLING_POSITION = (
    "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"
)

CHECKMATED_POSITION = (
    "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1"
)
