"""Service unique d'analyse de position Stockfish."""

from collections import OrderedDict
from dataclasses import dataclass
import logging
import os
import threading
from time import perf_counter

import chess
import chess.engine

from analysis_contract.builders import (
    build_chess_facts_from_proposals,
    with_cache_hit,
)
from analysis_contract.facts import ChessFacts

from .analysis import build_candidate_facts
from .analysis_cache import (
    AnalysisCacheBackend,
    AnalysisCacheConfig,
    AnalysisCacheIdentity,
    NullAnalysisCacheBackend,
    create_analysis_cache_backend,
    make_cache_identity,
    new_cache_entry,
)
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


AnalysisCacheKey = str
logger = logging.getLogger("chess_coach.analysis_cache")


def make_analysis_cache_key(
    fen: str,
    depth: int,
    multipv: int,
    config: AnalysisCacheConfig | None = None,
) -> AnalysisCacheKey:
    identity = make_cache_identity(
        fen,
        depth,
        multipv,
        config or AnalysisCacheConfig.from_env(),
    )
    return identity.cache_key()


class StockfishAnalysisService:
    def __init__(
        self,
        manager: EngineManager,
        *,
        cache_limit: int | None = None,
        cache_backend: AnalysisCacheBackend | None = None,
        cache_config: AnalysisCacheConfig | None = None,
        executor: RuntimeExecutor | None = None,
    ) -> None:
        self.manager = manager
        self.executor = executor or RuntimeExecutor(manager)
        self.cache_config = cache_config or AnalysisCacheConfig.from_env()
        try:
            configured_l1_limit = int(
                os.getenv("ANALYSIS_CACHE_L1_MAX_ENTRIES", "128")
            )
        except ValueError:
            configured_l1_limit = 128
        self.cache_limit = cache_limit or max(1, configured_l1_limit)
        self.cache_backend = cache_backend or NullAnalysisCacheBackend()
        self.cache: OrderedDict[AnalysisCacheKey, ChessFacts] = OrderedDict()
        self._cache_lock = threading.Lock()
        self._l2_write_count = 0

    def clear_cache(self) -> None:
        with self._cache_lock:
            self.cache.clear()
        try:
            self.cache_backend.clear()
        except Exception:
            logger.exception("analysis_cache_l2_clear_failed")

    def cache_status(self) -> dict[str, str | bool | int | None]:
        try:
            status = self.cache_backend.status().as_dict()
        except Exception as error:
            status = {
                "backend": "unavailable",
                "available": False,
                "entries": 0,
                "ttl_days": self.cache_config.ttl_days,
                "max_entries": self.cache_config.max_entries,
                "detail": type(error).__name__,
            }
        with self._cache_lock:
            status["l1_entries"] = len(self.cache)
            status["l1_max_entries"] = self.cache_limit
        status["namespace_version"] = self.cache_config.namespace_version
        status["engine_version"] = self.cache_config.engine_version
        status["analysis_profile_version"] = (
            self.cache_config.analysis_profile_version
        )
        return status

    def analyse(self, query: PositionAnalysisQuery) -> ChessFacts:
        request_started = perf_counter()
        self.manager.metrics.increment("total_analyses")
        try:
            board = chess.Board(query.fen)
        except ValueError as error:
            raise InvalidPositionError(query.fen) from error
        if board.is_game_over():
            raise FinishedPositionError(query.fen)

        identity = make_cache_identity(
            query.fen,
            query.depth,
            query.multipv,
            self.cache_config,
        )
        cache_key = identity.cache_key()
        cached = self._get_cached(cache_key)
        if cached is not None:
            self.manager.metrics.increment("cache_hits")
            self.manager.metrics.increment("l1_cache_hits")
            self.manager.metrics.observe(
                "total_request_duration_ms",
                (perf_counter() - request_started) * 1000,
            )
            return cached

        cached = self._get_l2_cached(cache_key, identity)
        if cached is not None:
            self.manager.metrics.increment("cache_hits")
            self.manager.metrics.increment("l2_cache_hits")
            self._store(cache_key, cached)
            self.manager.metrics.observe(
                "total_request_duration_ms",
                (perf_counter() - request_started) * 1000,
            )
            return with_cache_hit(cached)

        self.manager.metrics.increment("cache_misses")
        self.manager.ensure_available()

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
                fen=identity.fen,
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
        self._store_l2(identity, facts)
        self._store(cache_key, facts)
        return facts

    def _get_l2_cached(
        self,
        cache_key: AnalysisCacheKey,
        identity: AnalysisCacheIdentity,
    ) -> ChessFacts | None:
        started = perf_counter()
        self.manager.metrics.increment("l2_cache_reads")
        try:
            entry = self.cache_backend.get(cache_key)
        except Exception:
            self.manager.metrics.increment("l2_read_failures")
            logger.exception("analysis_cache_l2_read_failed")
            return None
        finally:
            self.manager.metrics.observe(
                "l2_read_duration_ms",
                (perf_counter() - started) * 1000,
            )
        if entry is None:
            return None
        if entry.identity != identity:
            self._delete_invalid_l2(cache_key)
            return None
        try:
            return ChessFacts.model_validate(entry.facts)
        except Exception:
            self._delete_invalid_l2(cache_key)
            return None

    def _delete_invalid_l2(self, cache_key: AnalysisCacheKey) -> None:
        self.manager.metrics.increment("l2_invalid_payloads")
        try:
            self.cache_backend.delete(cache_key)
        except Exception:
            self.manager.metrics.increment("l2_write_failures")
            logger.exception("analysis_cache_l2_invalid_delete_failed")

    def _store_l2(
        self,
        identity: AnalysisCacheIdentity,
        facts: ChessFacts,
    ) -> None:
        started = perf_counter()
        self.manager.metrics.increment("l2_cache_writes")
        try:
            self.cache_backend.set(
                new_cache_entry(
                    identity,
                    facts.model_dump(mode="json"),
                    self.cache_config.ttl_days,
                )
            )
            self._l2_write_count += 1
            if (
                self._l2_write_count
                % self.cache_config.cleanup_every_writes
                == 0
            ):
                cleanup = self.cache_backend.cleanup()
                self.manager.metrics.increment("l2_cleanup_count")
                if cleanup.evicted:
                    self.manager.metrics.increment(
                        "l2_cache_evictions",
                        cleanup.evicted,
                    )
        except Exception:
            self.manager.metrics.increment("l2_write_failures")
            logger.exception("analysis_cache_l2_write_failed")
        finally:
            self.manager.metrics.observe(
                "l2_write_duration_ms",
                (perf_counter() - started) * 1000,
            )

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


default_cache_config = AnalysisCacheConfig.from_env()
startup_cleanup_performed = False
try:
    default_cache_backend = create_analysis_cache_backend(default_cache_config)
    startup_cleanup = default_cache_backend.cleanup()
    startup_cleanup_performed = True
    if startup_cleanup.deleted:
        logger.info(
            "analysis_cache_startup_cleanup deleted=%s evicted=%s",
            startup_cleanup.deleted,
            startup_cleanup.evicted,
        )
except Exception as error:
    logger.exception("analysis_cache_l2_startup_failed")
    default_cache_backend = NullAnalysisCacheBackend(type(error).__name__)

default_analysis_service = StockfishAnalysisService(
    default_engine_pool,
    cache_backend=default_cache_backend,
    cache_config=default_cache_config,
)
if startup_cleanup_performed:
    default_engine_pool.metrics.increment("l2_cleanup_count")
    if startup_cleanup.evicted:
        default_engine_pool.metrics.increment(
            "l2_cache_evictions",
            startup_cleanup.evicted,
        )
