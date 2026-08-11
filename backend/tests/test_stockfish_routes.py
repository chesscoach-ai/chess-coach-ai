import asyncio
import os
import unittest
from unittest.mock import patch

import httpx

import main
from stockfish_runtime.engine_manager import default_engine_manager
from stockfish_runtime.errors import (
    AnalysisTimeoutError,
    EngineCrashedError,
    QueueTimeoutError,
    ServiceBusyError,
)
from stockfish_runtime.service import default_analysis_service
from tests.reference_positions import (
    CAPTURE_POSITION,
    INITIAL_POSITION,
    PROMOTION_MATE_IN_ONE,
)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class StockfishRouteContractTests(unittest.IsolatedAsyncioTestCase):
    """Protège les routes déjà consommées par le frontend."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.previous_secret = os.environ.pop("BACKEND_API_SECRET", None)

    @classmethod
    def tearDownClass(cls) -> None:
        default_engine_manager.shutdown()
        if cls.previous_secret is not None:
            os.environ["BACKEND_API_SECRET"] = cls.previous_secret

    async def asyncSetUp(self) -> None:
        asyncio.get_running_loop().set_debug(False)
        default_analysis_service.clear_cache()

    async def request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> httpx.Response:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.request(method, path, **kwargs)

    async def test_health_only_checks_the_api(self) -> None:
        default_engine_manager.shutdown()
        response = await self.request("GET", "/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "healthy", "service": "api"},
        )
        self.assertIsNone(default_engine_manager.engine)

    async def test_ready_reports_started_engine_pool(self) -> None:
        main.default_engine_pool.warmup()

        response = await self.request("GET", "/ready")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["engine"], "ready")
        self.assertEqual(
            response.json()["pool_size"],
            main.default_engine_pool.pool_size,
        )

    async def test_analysis_route_keeps_its_existing_shape(self) -> None:
        response = await self.request(
            "POST",
            "/analysis",
            json={
                "fen": INITIAL_POSITION,
                "depth": 6,
                "multipv": 2,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            set(payload),
            {
                "best_move",
                "best_move_san",
                "best_move_details",
                "principal_variation",
                "principal_variation_uci",
                "evaluation",
                "evaluation_type",
                "depth",
                "top_moves",
            },
        )
        expected_move_keys = {
            "rank",
            "move",
            "move_san",
            "from_square",
            "to_square",
            "moved_piece",
            "moved_piece_color",
            "captured_piece",
            "is_capture",
            "gives_check",
            "gives_checkmate",
            "is_castling",
            "is_promotion",
            "promotion_piece",
            "beginner_label",
            "beginner_description",
            "evaluation",
            "evaluation_type",
            "evaluation_gap",
            "depth",
            "principal_variation",
            "principal_variation_uci",
            "strategic_ideas",
            "explanation",
        }
        self.assertEqual(set(payload["best_move_details"]), expected_move_keys)
        self.assertTrue(
            all(set(move) == expected_move_keys for move in payload["top_moves"])
        )
        self.assertEqual(payload["best_move"], payload["top_moves"][0]["move"])
        self.assertEqual(
            payload["best_move_san"],
            payload["top_moves"][0]["move_san"],
        )
        self.assertIn(payload["evaluation_type"], {"centipawn", "mate"})
        self.assertEqual(len(payload["top_moves"]), 2)

    async def test_analysis_route_rejects_an_invalid_position(self) -> None:
        response = await self.request(
            "POST",
            "/analysis",
            json={"fen": "invalid", "depth": 6, "multipv": 1},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "FEN invalide."})

    async def test_runtime_errors_have_stable_http_codes(self) -> None:
        cases = [
            (
                ServiceBusyError("capacity_exceeded"),
                503,
                "Le service d'analyse est momentanément saturé.",
            ),
            (
                QueueTimeoutError("queue_timeout"),
                504,
                "Le délai d'attente du moteur Stockfish est dépassé.",
            ),
            (
                AnalysisTimeoutError("analysis_timeout"),
                504,
                "Le délai d'analyse Stockfish est dépassé.",
            ),
            (
                EngineCrashedError("engine_recovery_failed"),
                503,
                "Stockfish s’est arrêté de manière inattendue.",
            ),
        ]
        for error, status, detail in cases:
            with self.subTest(error=type(error).__name__):
                with patch.object(
                    default_analysis_service,
                    "analyse",
                    side_effect=error,
                ):
                    response = await self.request(
                        "POST",
                        "/analysis",
                        json={
                            "fen": INITIAL_POSITION,
                            "depth": 6,
                            "multipv": 1,
                        },
                    )
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.json(), {"detail": detail})

    async def test_move_review_route_keeps_capture_facts(self) -> None:
        response = await self.request(
            "POST",
            "/move-review",
            json={
                "fen_before": CAPTURE_POSITION,
                "played_move": "e4d5",
                "depth": 6,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["played_move"], "e4d5")
        self.assertEqual(payload["played_move_san"], "exd5")
        self.assertEqual(payload["played_move_piece"], "pion")
        self.assertTrue(payload["played_move_is_capture"])

    async def test_exercise_route_reuses_the_analysis_contract(self) -> None:
        response = await self.request(
            "POST",
            "/api/exercises/analyse-position",
            json={
                "fen": PROMOTION_MATE_IN_ONE,
                "depth": 8,
                "multipv": 2,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["best_move"], "a7a8q")
        self.assertEqual(payload["best_move_san"], "a8=Q#")
        self.assertEqual(payload["moves"][0]["uci"], "a7a8q")
        self.assertIsNotNone(payload["moves"][0]["mate_in"])

    async def test_coach_route_keeps_its_existing_shape(self) -> None:
        analysis_response = await self.request(
            "POST",
            "/analysis",
            json={
                "fen": CAPTURE_POSITION,
                "depth": 6,
                "multipv": 1,
            },
        )
        self.assertEqual(analysis_response.status_code, 200)

        response = await self.request(
            "POST",
            "/coach/explain",
            json={
                "fen": CAPTURE_POSITION,
                "best_move": analysis_response.json()["best_move_details"],
                "question": "Pourquoi ce coup ?",
                "level": "beginner",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            set(payload),
            {
                "title",
                "answer",
                "highlights",
                "arrows",
                "variation",
                "suggested_questions",
                "source",
            },
        )
        self.assertEqual(payload["source"], "rules")
        self.assertTrue(payload["answer"])
        self.assertTrue(payload["arrows"])


if __name__ == "__main__":
    unittest.main()
