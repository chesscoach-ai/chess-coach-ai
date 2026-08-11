import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import chess
from fastapi import HTTPException

import main
from stockfish_runtime.engine_manager import default_engine_manager
from stockfish_runtime.errors import AnalysisTimeoutError
from stockfish_runtime.service import (
    default_analysis_service,
    make_analysis_cache_key,
)
from tests.reference_positions import (
    INITIAL_POSITION,
    KING_AND_QUEEN_MATE_IN_ONE,
    PROMOTION_MATE_IN_ONE,
    TACTICAL_MATE_IN_ONE,
)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class StockfishResilienceCharacterizationTests(unittest.TestCase):
    """Caractérise le cache, le redémarrage et la concurrence actuels."""

    def setUp(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def tearDown(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def test_repeated_analysis_uses_the_existing_memory_cache(self) -> None:
        request = main.AnalysisRequest(
            fen=INITIAL_POSITION,
            depth=7,
            multipv=2,
        )

        first = main.analyse_position(request)
        cache_key = make_analysis_cache_key(
            request.fen,
            request.depth,
            request.multipv,
        )
        self.assertIn(cache_key, default_analysis_service.cache)

        engine = default_engine_manager.get_engine()
        with patch.object(
            engine,
            "analyse",
            side_effect=AssertionError("Stockfish ne doit pas être rappelé"),
        ):
            second = main.analyse_position(request)

        self.assertEqual(first, second)
        self.assertIsNot(first, second)

    def test_engine_is_recreated_after_an_unexpected_termination(self) -> None:
        failed_engine = default_engine_manager.get_engine()
        failed_engine.quit()

        recovered = main.analyse_position(
            main.AnalysisRequest(
                fen=INITIAL_POSITION,
                depth=6,
                multipv=1,
            )
        )
        self.assertTrue(recovered.best_move)
        self.assertIsNot(default_engine_manager.engine, failed_engine)
        metrics = default_engine_manager.metrics.snapshot()
        self.assertGreaterEqual(metrics.engine_crashes, 1)
        self.assertGreaterEqual(metrics.retries, 1)

    def test_concurrent_requests_remain_legal_and_complete(self) -> None:
        positions = [
            INITIAL_POSITION,
            TACTICAL_MATE_IN_ONE,
            KING_AND_QUEEN_MATE_IN_ONE,
            PROMOTION_MATE_IN_ONE,
        ]

        def analyse(fen: str) -> main.AnalysisResponse:
            return main.analyse_position(
                main.AnalysisRequest(
                    fen=fen,
                    depth=6,
                    multipv=1,
                )
            )

        with ThreadPoolExecutor(max_workers=len(positions)) as executor:
            responses = list(executor.map(analyse, positions))

        for fen, response in zip(positions, responses, strict=True):
            board = chess.Board(fen)
            self.assertIn(
                chess.Move.from_uci(response.best_move),
                board.legal_moves,
            )

    def test_timeout_is_translated_to_a_stable_http_error(self) -> None:
        """Le timeout 0.4 est traduit sans modifier le contrat d'erreur."""

        with patch.object(
            default_analysis_service.executor,
            "execute",
            side_effect=AnalysisTimeoutError("analysis_timeout"),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.analyse_position(
                    main.AnalysisRequest(
                        fen=INITIAL_POSITION,
                        depth=6,
                        multipv=1,
                    )
                )

        self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(
            raised.exception.detail,
            "Le délai d'analyse Stockfish est dépassé.",
        )


if __name__ == "__main__":
    unittest.main()
