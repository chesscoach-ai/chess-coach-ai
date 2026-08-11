import unittest

import chess
import chess.engine

import main
from analysis_contract.adapters import (
    to_legacy_analysis_payload,
    to_legacy_exercise_payload,
)
from analysis_contract.builders import build_chess_facts_from_proposals
from analysis_contract.facts import (
    CHESS_FACTS_SCHEMA_VERSION,
    ChessFacts,
)
from tests.reference_positions import (
    CAPTURE_POSITION,
    CASTLING_POSITION,
    INITIAL_POSITION,
    KING_AND_QUEEN_MATE_IN_ONE,
    PROMOTION_MATE_IN_ONE,
)
from stockfish_runtime.analysis import build_candidate_facts
from stockfish_runtime.engine_manager import default_engine_manager
from stockfish_runtime.service import default_analysis_service


LEGACY_ANALYSIS_KEYS = {
    "best_move",
    "best_move_san",
    "best_move_details",
    "principal_variation",
    "principal_variation_uci",
    "evaluation",
    "evaluation_type",
    "depth",
    "top_moves",
}

LEGACY_MOVE_KEYS = {
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


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class ChessFactsContractTests(unittest.TestCase):
    def setUp(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def tearDown(self) -> None:
        default_engine_manager.shutdown()
        default_analysis_service.clear_cache()

    def facts(
        self,
        fen: str = INITIAL_POSITION,
        *,
        depth: int = 8,
        multipv: int = 3,
    ) -> ChessFacts:
        return main.analyse_position_facts(
            main.AnalysisRequest(
                fen=fen,
                depth=depth,
                multipv=multipv,
            )
        )

    def candidate_for(self, fen: str, uci: str):
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci)
        score = chess.engine.PovScore(
            chess.engine.Cp(30),
            board.turn,
        )
        candidate = build_candidate_facts(
            board=board,
            info={"pv": [move], "score": score, "depth": 8},
            rank=1,
            requested_depth=8,
            best_evaluation=0.3,
            best_evaluation_type="centipawn",
        )
        self.assertIsNotNone(candidate)
        return candidate

    def facts_for_move(self, fen: str, uci: str) -> ChessFacts:
        candidate = self.candidate_for(fen, uci)
        return build_chess_facts_from_proposals(
            fen=fen,
            requested_depth=8,
            requested_multipv=1,
            proposals=[candidate],
            calculation_time_ms=1.25,
        )

    def test_schema_is_explicitly_versioned_and_json_round_trippable(self) -> None:
        facts = self.facts(multipv=2)

        self.assertEqual(CHESS_FACTS_SCHEMA_VERSION, "1.0")
        self.assertEqual(facts.schema_version, "1.0")
        serialized = facts.model_dump_json()
        restored = ChessFacts.model_validate_json(serialized)
        self.assertEqual(restored, facts)

    def test_initial_position_exposes_position_engine_and_multipv_facts(self) -> None:
        facts = self.facts(depth=8, multipv=3)

        self.assertEqual(facts.position.fen, INITIAL_POSITION)
        self.assertEqual(facts.position.side_to_move, "white")
        self.assertEqual(facts.position.requested_depth, 8)
        self.assertGreaterEqual(facts.position.achieved_depth or 0, 1)
        self.assertEqual(facts.position.requested_multipv, 3)
        self.assertFalse(facts.position.terminal.is_game_over)
        self.assertEqual(len(facts.proposals), 3)
        self.assertEqual([move.rank for move in facts.proposals], [1, 2, 3])
        self.assertEqual(facts.metadata.state, "ready")
        self.assertEqual(facts.metadata.cache_status, "miss")
        self.assertGreaterEqual(facts.metadata.calculation_time_ms, 0)

    def test_repeated_analysis_marks_a_cache_hit(self) -> None:
        first = self.facts(depth=7, multipv=2)
        second = self.facts(depth=7, multipv=2)

        self.assertEqual(first.metadata.cache_status, "miss")
        self.assertEqual(second.metadata.cache_status, "hit")
        self.assertEqual(second.metadata.calculation_time_ms, 0)
        self.assertEqual(first.proposals, second.proposals)

    def test_centipawn_evaluation_has_an_explicit_perspective(self) -> None:
        facts = self.facts()

        self.assertEqual(facts.evaluation.type, "centipawn")
        self.assertEqual(facts.evaluation.perspective, "white")
        self.assertEqual(facts.evaluation, facts.proposals[0].evaluation)

    def test_mate_evaluation_keeps_check_and_checkmate_facts(self) -> None:
        facts = self.facts(KING_AND_QUEEN_MATE_IN_ONE)
        best = facts.proposals[0]

        self.assertEqual(facts.evaluation.type, "mate")
        self.assertEqual(facts.evaluation.perspective, "white")
        self.assertEqual(best.uci, "f7g7")
        self.assertEqual(best.san, "Qg7#")
        self.assertTrue(best.gives_check)
        self.assertTrue(best.gives_checkmate)

    def test_capture_is_a_fact_while_strategic_ideas_are_heuristics(self) -> None:
        facts = self.facts_for_move(CAPTURE_POSITION, "e4d5")
        move = facts.proposals[0]

        self.assertTrue(move.is_capture)
        self.assertEqual(move.captured_piece, "pion")
        self.assertEqual(move.from_square, "e4")
        self.assertEqual(move.to_square, "d5")
        self.assertEqual(move.heuristics.source, "deterministic_rules")
        self.assertIn(
            "material_change",
            [item.code for item in move.heuristics.strategic_ideas],
        )

    def test_castling_is_represented_without_presentation_text(self) -> None:
        facts = self.facts_for_move(CASTLING_POSITION, "e1g1")
        move = facts.proposals[0]

        self.assertEqual(move.uci, "e1g1")
        self.assertEqual(move.san, "O-O")
        self.assertEqual(move.piece_type, "roi")
        self.assertTrue(move.is_castling)
        self.assertNotIn("beginner_description", type(move).model_fields)

    def test_promotion_contains_all_primitive_move_information(self) -> None:
        facts = self.facts(PROMOTION_MATE_IN_ONE)
        move = facts.proposals[0]

        self.assertEqual(move.uci, "a7a8q")
        self.assertEqual(move.san, "a8=Q#")
        self.assertEqual(move.piece_type, "pion")
        self.assertEqual(move.piece_color, "white")
        self.assertEqual(move.from_square, "a7")
        self.assertEqual(move.to_square, "a8")
        self.assertTrue(move.is_promotion)
        self.assertEqual(move.promotion_piece, "dame")

    def test_legacy_analysis_adapter_preserves_the_full_shape(self) -> None:
        facts = self.facts(multipv=2)
        payload = to_legacy_analysis_payload(facts)
        validated = main.AnalysisResponse.model_validate(payload)

        self.assertEqual(set(payload), LEGACY_ANALYSIS_KEYS)
        self.assertEqual(set(payload["best_move_details"]), LEGACY_MOVE_KEYS)
        self.assertTrue(
            all(set(move) == LEGACY_MOVE_KEYS for move in payload["top_moves"])
        )
        self.assertEqual(validated.best_move, facts.proposals[0].uci)
        self.assertEqual(validated.best_move_san, facts.proposals[0].san)

    def test_legacy_adapter_reconstructs_existing_presentation(self) -> None:
        cases = [
            (INITIAL_POSITION, "g1f3"),
            (CAPTURE_POSITION, "e4d5"),
            (CASTLING_POSITION, "e1g1"),
            (PROMOTION_MATE_IN_ONE, "a7a8q"),
        ]

        for fen, uci in cases:
            with self.subTest(uci=uci):
                candidate = self.candidate_for(fen, uci)
                facts = build_chess_facts_from_proposals(
                    fen=fen,
                    requested_depth=8,
                    requested_multipv=1,
                    proposals=[candidate],
                    calculation_time_ms=1.25,
                )
                payload = to_legacy_analysis_payload(facts)

                legacy = payload["top_moves"][0]
                self.assertTrue(legacy["beginner_label"])
                self.assertTrue(legacy["beginner_description"])
                self.assertTrue(legacy["explanation"])
                self.assertEqual(legacy["move"], candidate.uci)
                self.assertEqual(legacy["strategic_ideas"], [
                    item.description
                    for item in candidate.heuristics.strategic_ideas
                ])

    def test_legacy_exercise_adapter_preserves_mate_semantics(self) -> None:
        facts = self.facts(PROMOTION_MATE_IN_ONE, multipv=2)
        payload = to_legacy_exercise_payload(facts)
        validated = main.ExerciseAnalysisResponse.model_validate(payload)

        self.assertEqual(validated.best_move, "a7a8q")
        self.assertIsNone(validated.moves[0].evaluation)
        self.assertIsNotNone(validated.moves[0].mate_in)


if __name__ == "__main__":
    unittest.main()
