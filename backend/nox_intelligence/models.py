"""Contrats versionnés et minimaux échangés avec Nox Intelligence."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


NOX_CONTEXT_SCHEMA_VERSION = "1.0"
NOX_RESPONSE_SCHEMA_VERSION = "1.0"

NoxState = Literal["idle", "thinking", "tip", "success", "warning"]
PlayerLevel = Literal["beginner", "intermediate", "advanced"]
InteractionDepth = Literal["reaction", "explanation", "conversation"]
QuestionType = Literal["reaction", "why", "plan", "missed", "show"]
MoveClassification = Literal[
    "excellent", "good", "inaccuracy", "mistake", "blunder"
]
PolicyDecision = Literal[
    "deterministic_only", "ai_preferred", "ai_required_if_available"
]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NoxInteraction(ContractModel):
    depth: InteractionDepth = "reaction"
    question: QuestionType = "reaction"


class NoxPosition(ContractModel):
    side_to_move: Literal["white", "black"]


class NoxMove(ContractModel):
    uci: str = Field(pattern=r"^[a-h][1-8][a-h][1-8][qrbn]?$")
    san: str = Field(min_length=1, max_length=20)
    piece: str = Field(min_length=1, max_length=30)
    piece_color: Literal["white", "black"]
    from_square: str = Field(pattern=r"^[a-h][1-8]$")
    to_square: str = Field(pattern=r"^[a-h][1-8]$")

    @model_validator(mode="after")
    def uci_matches_squares(self) -> "NoxMove":
        if not self.uci.startswith(f"{self.from_square}{self.to_square}"):
            raise ValueError("UCI notation does not match move squares")
        return self


class NoxClassification(ContractModel):
    code: MoveClassification
    evaluation_loss: float = Field(ge=0)


class NoxEvaluation(ContractModel):
    before: float | None = None
    after: float | None = None
    type: Literal["centipawn", "mate"] = "centipawn"


class NoxFacts(ContractModel):
    capture: bool = False
    check: bool = False
    checkmate: bool = False
    castle: bool = False
    promotion: bool = False

    @model_validator(mode="after")
    def checkmate_implies_check(self) -> "NoxFacts":
        if self.checkmate and not self.check:
            raise ValueError("Checkmate must also be marked as check")
        return self


class NoxHeuristic(ContractModel):
    id: str = Field(min_length=1, max_length=80)
    source: Literal["deterministic_rules"] = "deterministic_rules"


class NoxContext(ContractModel):
    schema_version: Literal["1.0"] = NOX_CONTEXT_SCHEMA_VERSION
    language: Literal["fr"] = "fr"
    player_level: PlayerLevel = "beginner"
    interaction: NoxInteraction
    position: NoxPosition
    played_move: NoxMove | None = None
    classification: NoxClassification | None = None
    best_move: NoxMove | None = None
    evaluation: NoxEvaluation | None = None
    facts: NoxFacts = NoxFacts()
    heuristics: tuple[NoxHeuristic, ...] = Field(default=(), max_length=8)


class NoxConcept(ContractModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=80)


class NoxArrow(ContractModel):
    from_square: str = Field(pattern=r"^[a-h][1-8]$")
    to_square: str = Field(pattern=r"^[a-h][1-8]$")
    kind: Literal["move", "control", "attack", "defense"] = "move"


class NoxVisual(ContractModel):
    arrows: tuple[NoxArrow, ...] = Field(default=(), max_length=5)
    highlights: tuple[str, ...] = Field(default=(), max_length=8)

    @model_validator(mode="after")
    def valid_highlights(self) -> "NoxVisual":
        if any(
            len(square) != 2
            or square[0] not in "abcdefgh"
            or square[1] not in "12345678"
            for square in self.highlights
        ):
            raise ValueError("Every highlight must be a valid chess square")
        return self


class NoxResponse(ContractModel):
    schema_version: Literal["1.0"] = NOX_RESPONSE_SCHEMA_VERSION
    state: NoxState
    title: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=700)
    lesson: str | None = Field(default=None, max_length=400)
    concept: NoxConcept | None = None
    follow_up: str | None = Field(default=None, max_length=180)
    referenced_move_uci: str | None = Field(
        default=None,
        pattern=r"^[a-h][1-8][a-h][1-8][qrbn]?$",
    )
    visual: NoxVisual = NoxVisual()


class NoxUsage(ContractModel):
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)


class NoxIntelligenceResult(ContractModel):
    response: NoxResponse
    source: Literal["deterministic", "openai", "cache"]
    policy: PolicyDecision
    fallback_reason: str | None = None
    usage: NoxUsage = NoxUsage()
