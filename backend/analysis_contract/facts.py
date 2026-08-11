"""Modèles sérialisables des faits produits par l'analyse Stockfish.

Ce module ne contient ni texte de Nox, ni storytelling. Les signaux qui ne
sont pas des faits échiquéens stricts sont isolés dans ``MoveHeuristics`` et
explicitement étiquetés comme règles déterministes.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CHESS_FACTS_SCHEMA_VERSION = "1.0"

Color = Literal["white", "black"]
EvaluationType = Literal["centipawn", "mate"]
PieceType = Literal["pion", "cavalier", "fou", "tour", "dame", "roi", "pièce"]
AnalysisState = Literal[
    "queued",
    "starting",
    "calculating",
    "ready",
    "timeout",
    "engine_crashed",
    "unavailable",
    "failed",
]
CacheStatus = Literal["hit", "miss"]


class ContractModel(BaseModel):
    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
    )


class TerminalPositionFacts(ContractModel):
    is_game_over: bool
    reason: Literal[
        "checkmate",
        "stalemate",
        "insufficient_material",
        "seventy_five_moves",
        "fivefold_repetition",
        "other",
    ] | None = None
    winner: Color | None = None


class PositionFacts(ContractModel):
    fen: str
    side_to_move: Color
    requested_depth: int = Field(ge=1, le=25)
    achieved_depth: int | None = Field(default=None, ge=1)
    requested_multipv: int = Field(ge=1, le=5)
    terminal: TerminalPositionFacts


class EvaluationFacts(ContractModel):
    value: float
    type: EvaluationType
    perspective: Color


class PrincipalVariationFacts(ContractModel):
    san: tuple[str, ...]
    uci: tuple[str, ...]

    @model_validator(mode="after")
    def matching_notations(self) -> "PrincipalVariationFacts":
        if len(self.san) != len(self.uci):
            raise ValueError("SAN and UCI variations must have the same length")
        if not self.uci:
            raise ValueError("A principal variation cannot be empty")
        return self


HeuristicCode = Literal[
    "king_safety",
    "forcing_check",
    "material_change",
    "promotion",
    "center_control",
    "minor_piece_development",
    "early_queen_activity",
    "piece_coordination",
    "other",
]


class DeterministicHeuristic(ContractModel):
    code: HeuristicCode
    description: str


class MoveHeuristics(ContractModel):
    source: Literal["deterministic_rules"] = "deterministic_rules"
    strategic_ideas: tuple[DeterministicHeuristic, ...] = ()


class MoveFacts(ContractModel):
    rank: int = Field(ge=1, le=5)
    uci: str
    san: str
    piece_type: PieceType
    piece_color: Color
    from_square: str
    to_square: str
    is_capture: bool
    captured_piece: PieceType | None = None
    gives_check: bool
    gives_checkmate: bool
    is_castling: bool
    is_promotion: bool
    promotion_piece: PieceType | None = None
    evaluation: EvaluationFacts
    evaluation_gap: float | None = Field(default=None, ge=0)
    depth: int = Field(ge=1)
    principal_variation: PrincipalVariationFacts
    heuristics: MoveHeuristics = MoveHeuristics()

    @model_validator(mode="after")
    def validate_move_consistency(self) -> "MoveFacts":
        if not self.uci.startswith(f"{self.from_square}{self.to_square}"):
            raise ValueError("UCI notation does not match move squares")
        if not self.is_capture and self.captured_piece is not None:
            raise ValueError("A non-capture cannot expose a captured piece")
        if not self.is_promotion and self.promotion_piece is not None:
            raise ValueError("A non-promotion cannot expose a promotion piece")
        if self.gives_checkmate and not self.gives_check:
            raise ValueError("Checkmate must also be marked as check")
        return self


class AnalysisMetadata(ContractModel):
    state: AnalysisState = "ready"
    cache_status: CacheStatus
    calculation_time_ms: float = Field(ge=0)


class ChessFacts(ContractModel):
    schema_version: Literal["1.0"] = CHESS_FACTS_SCHEMA_VERSION
    position: PositionFacts
    evaluation: EvaluationFacts
    proposals: tuple[MoveFacts, ...] = Field(min_length=1, max_length=5)
    metadata: AnalysisMetadata

    @model_validator(mode="after")
    def validate_analysis_consistency(self) -> "ChessFacts":
        if self.proposals[0].rank != 1:
            raise ValueError("The first proposal must have rank 1")
        if self.evaluation != self.proposals[0].evaluation:
            raise ValueError("Top-level evaluation must match the best proposal")
        if any(
            proposal.evaluation.perspective != self.position.side_to_move
            for proposal in self.proposals
        ):
            raise ValueError("All evaluations must use the explicit side-to-move perspective")
        return self
