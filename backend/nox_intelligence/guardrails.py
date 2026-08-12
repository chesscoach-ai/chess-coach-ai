"""Validation factuelle stricte avant qu'une réponse générée soit affichée."""

from .models import NoxContext, NoxResponse


class NoxValidationError(ValueError):
    pass


def validate_nox_response(
    context: NoxContext,
    response: NoxResponse,
) -> NoxResponse:
    known_moves = {
        move.uci for move in (context.played_move, context.best_move) if move
    }
    if response.referenced_move_uci:
        if response.referenced_move_uci not in known_moves:
            raise NoxValidationError("response references an unknown move")

    known_arrows = {
        (move.from_square, move.to_square)
        for move in (context.played_move, context.best_move)
        if move
    }
    for arrow in response.visual.arrows:
        if arrow.kind == "move" and (
            arrow.from_square,
            arrow.to_square,
        ) not in known_arrows:
            raise NoxValidationError("response contains an unverified move arrow")

    lowered = response.message.casefold()
    factual_claims = {
        "échec et mat": context.facts.checkmate,
        "fait échec": context.facts.check,
        "donne échec": context.facts.check,
        "capture": context.facts.capture,
        "roque": context.facts.castle,
        "promotion": context.facts.promotion,
    }
    for claim, supported in factual_claims.items():
        if claim in lowered and not supported:
            raise NoxValidationError(f"unsupported chess claim: {claim}")
    return response
