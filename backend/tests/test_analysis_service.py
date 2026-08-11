import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock

import chess
import chess.engine

from analysis_contract.facts import ChessFacts
from stockfish_runtime.analysis import build_candidate_facts
from stockfish_runtime.engine_manager import (
    EngineManager,
    default_engine_manager,
)
from stockfish_runtime.errors import AnalysisFailedError
from stockfish_runtime.service import (
    PositionAnalysisQuery,
    StockfishAnalysisService,
)
from tests.reference_positions import (
    CAPTURE_POSITION,
    CASTLING_POSITION,
    INITIAL_POSITION,
    KING_AND_QUEEN_MATE_IN_ONE,
    PROMOTION_MATE_IN_ONE,
)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class StockfishAnalysisServiceIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        default_engine_manager.shutdown()
        self.service = StockfishAnalysisService(default_engine_manager)

    def tearDown(self) -> None:
        default_engine_manager.shutdown()

    def test_service_is_callable_without_main_and_returns_chess_facts(self) -> None:
        facts = self.service.analyse(
            PositionAnalysisQuery(
                fen=INITIAL_POSITION,
                depth=7,
                multipv=3,
            )
        )

        self.assertIsInstance(facts, ChessFacts)
        self.assertEqual(facts.position.requested_multipv, 3)
        self.assertEqual(len(facts.proposals), 3)
        self.assertEqual(facts.evaluation.type, "centipawn")

    def test_service_preserves_mate_semantics(self) -> None:
        facts = self.service.analyse(
            PositionAnalysisQuery(
                fen=KING_AND_QUEEN_MATE_IN_ONE,
                depth=7,
                multipv=2,
            )
        )

        self.assertEqual(facts.proposals[0].san, "Qg7#")
        self.assertEqual(facts.evaluation.type, "mate")
        self.assertTrue(facts.proposals[0].gives_checkmate)


class CandidateFactsUnitTests(unittest.TestCase):
    def candidate(self, fen: str, uci: str):
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci)
        return build_candidate_facts(
            board=board,
            info={
                "pv": [move],
                "score": chess.engine.PovScore(chess.engine.Cp(30), board.turn),
                "depth": 8,
            },
            rank=1,
            requested_depth=8,
            best_evaluation=0.3,
            best_evaluation_type="centipawn",
        )

    def test_direct_conversion_covers_capture(self) -> None:
        candidate = self.candidate(CAPTURE_POSITION, "e4d5")
        self.assertIsNotNone(candidate)
        self.assertTrue(candidate.is_capture)
        self.assertEqual(candidate.captured_piece, "pion")

    def test_direct_conversion_covers_castling(self) -> None:
        candidate = self.candidate(CASTLING_POSITION, "e1g1")
        self.assertIsNotNone(candidate)
        self.assertTrue(candidate.is_castling)
        self.assertEqual(candidate.san, "O-O")

    def test_direct_conversion_covers_promotion_and_mate(self) -> None:
        candidate = self.candidate(PROMOTION_MATE_IN_ONE, "a7a8q")
        self.assertIsNotNone(candidate)
        self.assertTrue(candidate.is_promotion)
        self.assertEqual(candidate.promotion_piece, "dame")
        self.assertTrue(candidate.gives_checkmate)


class StockfishAnalysisServiceErrorTests(unittest.TestCase):
    def test_engine_error_is_translated_to_a_domain_error(self) -> None:
        with TemporaryDirectory() as directory:
            binary = Path(directory) / "stockfish"
            binary.touch()
            engine = Mock()
            engine.analyse.side_effect = chess.engine.EngineError("broken")
            manager = EngineManager(
                binary,
                engine_factory=Mock(return_value=engine),
            )
            service = StockfishAnalysisService(manager)

            with self.assertRaises(AnalysisFailedError):
                service.analyse(
                    PositionAnalysisQuery(
                        fen=INITIAL_POSITION,
                        depth=6,
                        multipv=1,
                    )
                )


if __name__ == "__main__":
    unittest.main()
