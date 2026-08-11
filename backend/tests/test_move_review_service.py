import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock

import chess.engine

from stockfish_runtime.engine_manager import (
    EngineManager,
    default_engine_manager,
)
from stockfish_runtime.errors import AnalysisFailedError, InvalidMoveError
from stockfish_runtime.move_review import (
    MoveReviewQuery,
    MoveReviewService,
)
from tests.reference_positions import (
    CAPTURE_POSITION,
    CASTLING_POSITION,
    PROMOTION_MATE_IN_ONE,
)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class MoveReviewServiceIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        default_engine_manager.shutdown()
        self.service = MoveReviewService(default_engine_manager)

    def tearDown(self) -> None:
        default_engine_manager.shutdown()

    def test_service_reviews_capture_without_main(self) -> None:
        result = self.service.review(
            MoveReviewQuery(CAPTURE_POSITION, "e4d5", 6)
        )
        self.assertEqual(result.played_move_san, "exd5")
        self.assertTrue(result.played_move_is_capture)

    def test_service_reviews_castling_without_main(self) -> None:
        result = self.service.review(
            MoveReviewQuery(CASTLING_POSITION, "e1g1", 6)
        )
        self.assertEqual(result.played_move_san, "O-O")
        self.assertTrue(result.played_move_is_castling)

    def test_service_reviews_promotion_without_main(self) -> None:
        result = self.service.review(
            MoveReviewQuery(PROMOTION_MATE_IN_ONE, "a7a8q", 6)
        )
        self.assertEqual(result.played_move_san, "a8=Q#")
        self.assertTrue(result.played_move_is_promotion)
        self.assertTrue(result.played_move_gives_check)

    def test_illegal_move_has_a_domain_error(self) -> None:
        with self.assertRaises(InvalidMoveError):
            self.service.review(
                MoveReviewQuery(CAPTURE_POSITION, "e4e6", 6)
            )


class MoveReviewServiceErrorTests(unittest.TestCase):
    def test_engine_error_is_shared_with_the_analysis_domain(self) -> None:
        with TemporaryDirectory() as directory:
            binary = Path(directory) / "stockfish"
            binary.touch()
            engine = Mock()
            engine.analyse.side_effect = chess.engine.EngineError("broken")
            manager = EngineManager(
                binary,
                engine_factory=Mock(return_value=engine),
            )
            service = MoveReviewService(manager)

            with self.assertRaises(AnalysisFailedError):
                service.review(MoveReviewQuery(CAPTURE_POSITION, "e4d5", 6))


if __name__ == "__main__":
    unittest.main()
