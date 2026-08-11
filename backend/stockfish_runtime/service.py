"""Service unique d'analyse de position Stockfish."""

from collections import OrderedDict
from dataclasses import dataclass
import threading
from time import perf_counter

import chess
import chess.engine

from analysis_contract.builders import (
    build_chess_facts_from_proposals,
    with_cache_hit,
)
from analysis_contract.facts import CHESS_FACTS_SCHEMA_VERSION, ChessFacts

from .analysis import build_candidate_facts
from .config import default_runtime_config
from .engine_manager import EngineManager
from .engine_pool import default_engine_pool
from .executor import AnalysisBudget, RuntimeExecutor
from .errors import (
    FinishedPositionError,
    InvalidPositionError,
    NoUsableVariationError,
)
from .primitives import extract_evaluation


@dataclass(frozen=True, slots=True)
class PositionAnalysisQuery:
    fen: str
    depth: int = default_runtime_config.default_depth
    multipv: int = 3


AnalysisCacheKey = tuple[str, str, int, int]


def make_analysis_cache_key(
    fen: str,
    depth: int,
    multipv: int,
) -> AnalysisCacheKey:
    return CHESS_FACTS_SCHEMA_VERSION, fen, depth, multipv


class StockfishAnalysisService:
    def __init__(
        self,
        manager: EngineManager,
        *,
        cache_limit: int = 128,
        executor: RuntimeExecutor | None = None,
    ) -> None:
        self.manager = manager
        self.executor = executor or RuntimeExecutor(manager)
        self.cache_limit = cache_limit
        self.cache: OrderedDict[AnalysisCacheKey, ChessFacts] = OrderedDict()
        self._cache_lock = threading.Lock()

    def clear_cache(self) -> None:
        with self._cache_lock:
            self.cache.clear()

    def analyse(self, query: PositionAnalysisQuery) -> ChessFacts:
        request_started = perf_counter()
        self.manager.metrics.increment("total_analyses")
        self.manager.ensure_available()
        cache_key = make_analysis_cache_key(query.fen, query.depth, query.multipv)
        cached = self._get_cached(cache_key)
        if cached is not None:
            self.manager.metrics.increment("cache_hits")
            self.manager.metrics.observe(
                "total_request_duration_ms",
                (perf_counter() - request_started) * 1000,
            )
            return cached
        self.manager.metrics.increment("cache_misses")

        try:
            board = chess.Board(query.fen)
        except ValueError as error:
            raise InvalidPositionError(query.fen) from error
        if board.is_game_over():
            raise FinishedPositionError(query.fen)

        def calculate(
            engine: chess.engine.SimpleEngine,
            budget: AnalysisBudget,
        ) -> ChessFacts:
            results = budget.run(lambda remaining: engine.analyse(
                board,
                chess.engine.Limit(
                    depth=query.depth,
                    time=remaining,
                ),
                multipv=query.multipv,
            ))
            if not isinstance(results, list):
                results = [results]
            valid_results = [
                info
                for info in results
                if info.get("pv") and info.get("score") is not None
            ]
            if not valid_results:
                raise NoUsableVariationError("no_variation")

            best_score = valid_results[0].get("score")
            if best_score is None:
                raise NoUsableVariationError("best_evaluation_unavailable")
            best_evaluation, best_type = extract_evaluation(
                best_score,
                board.turn,
            )
            proposals = tuple(
                proposal
                for rank, info in enumerate(valid_results, start=1)
                if (
                    proposal := build_candidate_facts(
                        board=board,
                        info=info,
                        rank=rank,
                        requested_depth=query.depth,
                        best_evaluation=best_evaluation,
                        best_evaluation_type=best_type,
                    )
                )
                is not None
            )
            if not proposals:
                raise NoUsableVariationError("no_usable_move")

            return build_chess_facts_from_proposals(
                fen=query.fen,
                requested_depth=query.depth,
                requested_multipv=query.multipv,
                proposals=proposals,
                calculation_time_ms=0.0,
            )

        execution = self.executor.execute(calculate)
        facts = execution.value.model_copy(
            update={
                "metadata": execution.value.metadata.model_copy(
                    update={
                        "calculation_time_ms": round(
                            execution.engine_execution_ms,
                            3,
                        )
                    }
                )
            },
            deep=True,
        )
        self._store(cache_key, facts)
        return facts

    def _get_cached(self, key: AnalysisCacheKey) -> ChessFacts | None:
        with self._cache_lock:
            cached = self.cache.get(key)
            if cached is None:
                return None
            self.cache.move_to_end(key)
            return with_cache_hit(cached)

    def _store(self, key: AnalysisCacheKey, facts: ChessFacts) -> None:
        with self._cache_lock:
            self.cache[key] = facts.model_copy(deep=True)
            self.cache.move_to_end(key)
            while len(self.cache) > self.cache_limit:
                self.cache.popitem(last=False)


default_analysis_service = StockfishAnalysisService(default_engine_pool)
