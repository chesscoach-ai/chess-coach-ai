import unittest

import chess
from fastapi import HTTPException

import main
from stockfish_runtime.engine_manager import default_engine_manager
from stockfish_runtime.service import default_analysis_service
from tests.reference_positions import (
    CAPTURE_POSITION,
    CASTLING_POSITION,
    CHECKMATED_POSITION,
    INITIAL_POSITION,
    KING_AND_QUEEN_MATE_IN_ONE,
    PROMOTION_MATE_IN_ONE,
    TACTICAL_MATE_IN_ONE,
)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class StockfishReferenceTests(unittest.TestCase):
    """Fige le comportement échiquéen public avant la refactorisation."""

    def setUp(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def tearDown(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def analyse(
        self,
        fen: str,
        *,
        depth: int = 8,
        multipv: int = 3,
    ) -> main.AnalysisResponse:
        return main.analyse_position(
            main.AnalysisRequest(
                fen=fen,
                depth=depth,
                multipv=multipv,
            )
        )

    def assert_response_moves_are_legal(
        self,
        fen: str,
        response: main.AnalysisResponse,
    ) -> None:
        board = chess.Board(fen)

        for rank, candidate in enumerate(response.top_moves, start=1):
            move = chess.Move.from_uci(candidate.move)
            self.assertIn(move, board.legal_moves)
            self.assertEqual(candidate.rank, rank)
            self.assertEqual(candidate.from_square, candidate.move[:2])
            self.assertEqual(candidate.to_square, candidate.move[2:4])
            self.assertTrue(candidate.move_san)
            self.assertTrue(candidate.moved_piece)
            self.assertEqual(candidate.moved_piece_color, "white")
            self.assertGreaterEqual(len(candidate.principal_variation_uci), 1)
            self.assertEqual(
                len(candidate.principal_variation),
                len(candidate.principal_variation_uci),
            )

    def test_initial_position_returns_structured_legal_moves(self) -> None:
        response = self.analyse(INITIAL_POSITION)

        self.assertEqual(response.best_move, response.top_moves[0].move)
        self.assertEqual(response.best_move_san, response.top_moves[0].move_san)
        self.assertEqual(response.best_move_details, response.top_moves[0])
        self.assertEqual(response.evaluation_type, "centipawn")
        self.assertGreaterEqual(len(response.top_moves), 1)
        self.assertLessEqual(len(response.top_moves), 3)
        self.assert_response_moves_are_legal(INITIAL_POSITION, response)

    def test_tactical_reference_finds_queen_mate(self) -> None:
        response = self.analyse(TACTICAL_MATE_IN_ONE)

        self.assertEqual(response.best_move, "d1d8")
        self.assertEqual(response.best_move_san, "Qd8#")
        self.assertEqual(response.evaluation_type, "mate")
        self.assertTrue(response.best_move_details.gives_check)
        self.assertTrue(response.best_move_details.gives_checkmate)

    def test_mate_reference_exposes_mate_semantics(self) -> None:
        response = self.analyse(KING_AND_QUEEN_MATE_IN_ONE)

        self.assertEqual(response.best_move, "f7g7")
        self.assertEqual(response.best_move_san, "Qg7#")
        self.assertEqual(response.evaluation_type, "mate")
        self.assertTrue(response.best_move_details.gives_checkmate)

    def test_promotion_reference_keeps_beginner_facing_move_facts(self) -> None:
        response = self.analyse(PROMOTION_MATE_IN_ONE)
        move = response.best_move_details

        self.assertEqual(move.move, "a7a8q")
        self.assertEqual(move.move_san, "a8=Q#")
        self.assertEqual(move.moved_piece, "pion")
        self.assertEqual(move.from_square, "a7")
        self.assertEqual(move.to_square, "a8")
        self.assertTrue(move.is_promotion)
        self.assertEqual(move.promotion_piece, "dame")
        self.assertTrue(move.gives_checkmate)

    def test_move_review_identifies_capture(self) -> None:
        review = main.review_move(
            main.MoveReviewRequest(
                fen_before=CAPTURE_POSITION,
                played_move="e4d5",
                depth=6,
            )
        )

        self.assertEqual(review.played_move, "e4d5")
        self.assertEqual(review.played_move_san, "exd5")
        self.assertEqual(review.played_move_piece, "pion")
        self.assertTrue(review.played_move_is_capture)
        self.assertFalse(review.played_move_is_castling)
        self.assertFalse(review.played_move_is_promotion)

    def test_move_review_identifies_castling(self) -> None:
        review = main.review_move(
            main.MoveReviewRequest(
                fen_before=CASTLING_POSITION,
                played_move="e1g1",
                depth=6,
            )
        )

        self.assertEqual(review.played_move, "e1g1")
        self.assertEqual(review.played_move_san, "O-O")
        self.assertEqual(review.played_move_piece, "roi")
        self.assertTrue(review.played_move_is_castling)
        self.assertFalse(review.played_move_is_capture)
        self.assertFalse(review.played_move_is_promotion)

    def test_move_review_identifies_promotion_and_check(self) -> None:
        review = main.review_move(
            main.MoveReviewRequest(
                fen_before=PROMOTION_MATE_IN_ONE,
                played_move="a7a8q",
                depth=6,
            )
        )

        self.assertEqual(review.played_move_san, "a8=Q#")
        self.assertTrue(review.played_move_is_promotion)
        self.assertTrue(review.played_move_gives_check)

    def test_invalid_fen_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            self.analyse("not-a-fen")

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail, "FEN invalide.")

    def test_finished_position_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            self.analyse(CHECKMATED_POSITION)

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail, "La partie est terminée.")


if __name__ == "__main__":
    unittest.main()
