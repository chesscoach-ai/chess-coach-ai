import chess

from app.models.diagnostics import DiagnosticSignals


PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def detect_diagnostic_signals(
    fen_before: str,
    played_move_uci: str,
    best_move_uci: str,
    evaluation_loss_cp: int,
    principal_variation_uci: list[str] | None = None,
) -> DiagnosticSignals:
    board = chess.Board(fen_before)
    played_move = chess.Move.from_uci(played_move_uci)
    best_move = chess.Move.from_uci(best_move_uci)

    if played_move not in board.legal_moves:
        raise ValueError(
            f"Illegal played move: {played_move_uci}"
        )

    if best_move not in board.legal_moves:
        raise ValueError(
            f"Illegal best move: {best_move_uci}"
        )

    side = board.turn
    before_material = material_balance(board, side)

    played_board = board.copy()
    moved_piece = played_board.piece_at(
        played_move.from_square
    )
    played_board.push(played_move)

    after_material = material_balance(
        played_board, side
    )
    material_loss_cp = max(
        0, before_material - after_material
    )

    hanging_piece = moved_piece_is_hanging(
        played_board,
        played_move.to_square,
        side,
    )

    leaves_king_in_center = (
        king_still_in_center(
            played_board, side
        )
        and board.fullmove_number <= 12
        and evaluation_loss_cp >= 80
    )

    delays_development = (
        board.fullmove_number <= 10
        and moved_piece is not None
        and moved_piece.piece_type
        in (chess.ROOK, chess.QUEEN)
        and evaluation_loss_cp >= 60
    )

    moved_same_piece_again = (
        board.fullmove_number <= 10
        and moved_piece is not None
        and played_move.from_square
        not in (
            chess.B1,
            chess.G1,
            chess.C1,
            chess.F1,
            chess.B8,
            chess.G8,
            chess.C8,
            chess.F8,
        )
        and evaluation_loss_cp >= 60
    )

    misses_mate = pv_contains_forced_mate_pattern(
        board,
        best_move,
        principal_variation_uci or [],
    )

    missed_tactical_shot = (
        evaluation_loss_cp >= 150
        and (
            board.is_capture(best_move)
            or board.gives_check(best_move)
        )
    )

    is_endgame = count_non_pawn_material(
        board
    ) <= 2600

    return DiagnosticSignals(
        material_loss_cp=material_loss_cp,
        is_mate_threat=played_board.is_check(),
        misses_mate=misses_mate,
        leaves_king_in_center=leaves_king_in_center,
        delays_development=delays_development,
        moved_same_piece_again=moved_same_piece_again,
        hanging_piece=hanging_piece,
        missed_tactical_shot=missed_tactical_shot,
        worsens_pawn_structure=False,
        loses_initiative=(
            evaluation_loss_cp >= 100
            and not board.is_capture(
                played_move
            )
            and not board.gives_check(
                played_move
            )
        ),
        endgame_technique_error=(
            is_endgame
            and evaluation_loss_cp >= 100
        ),
    )


def material_balance(
    board: chess.Board,
    perspective: chess.Color,
) -> int:
    total = 0

    for piece_type, value in PIECE_VALUES.items():
        total += (
            len(
                board.pieces(
                    piece_type,
                    perspective,
                )
            )
            * value
        )
        total -= (
            len(
                board.pieces(
                    piece_type,
                    not perspective,
                )
            )
            * value
        )

    return total


def moved_piece_is_hanging(
    board: chess.Board,
    square: chess.Square,
    side: chess.Color,
) -> bool:
    piece = board.piece_at(square)

    if piece is None or piece.color != side:
        return False

    attackers = board.attackers(
        not side, square
    )
    defenders = board.attackers(
        side, square
    )

    return bool(attackers) and not bool(
        defenders
    )


def king_still_in_center(
    board: chess.Board,
    side: chess.Color,
) -> bool:
    square = board.king(side)

    if square is None:
        return False

    center_squares = (
        chess.E1,
        chess.D1,
        chess.E8,
        chess.D8,
    )

    return square in center_squares


def count_non_pawn_material(
    board: chess.Board,
) -> int:
    total = 0

    for piece_type in (
        chess.KNIGHT,
        chess.BISHOP,
        chess.ROOK,
        chess.QUEEN,
    ):
        total += (
            len(
                board.pieces(
                    piece_type,
                    chess.WHITE,
                )
            )
            + len(
                board.pieces(
                    piece_type,
                    chess.BLACK,
                )
            )
        ) * PIECE_VALUES[piece_type]

    return total


def pv_contains_forced_mate_pattern(
    board: chess.Board,
    best_move: chess.Move,
    pv: list[str],
) -> bool:
    probe = board.copy()

    try:
        probe.push(best_move)

        if probe.is_checkmate():
            return True

        for move_uci in pv[:5]:
            move = chess.Move.from_uci(
                move_uci
            )

            if move not in probe.legal_moves:
                break

            probe.push(move)

            if probe.is_checkmate():
                return True
    except ValueError:
        return False

    return False
