"""Mesure locale simple du chemin froid, L2 puis L1.

À lancer depuis ``backend`` avec :
``.venv\\Scripts\\python.exe scripts\\analysis_cache_benchmark.py``.
"""

from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from stockfish_runtime.analysis_cache import (  # noqa: E402
    AnalysisCacheConfig,
    SQLiteAnalysisCacheBackend,
)
from stockfish_runtime.engine_pool import default_engine_pool  # noqa: E402
from stockfish_runtime.service import (  # noqa: E402
    PositionAnalysisQuery,
    StockfishAnalysisService,
)


INITIAL_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def timed_analysis(service, query):
    started = perf_counter()
    result = service.analyse(query)
    return round((perf_counter() - started) * 1000, 3), result.metadata.cache_status


def main() -> None:
    with TemporaryDirectory() as directory:
        config = AnalysisCacheConfig(
            namespace_version="benchmark-v1",
            engine_version="17",
            analysis_profile_version="standard-v1",
            ttl_days=30,
            max_entries=5_000,
            touch_interval_seconds=3_600,
            cleanup_every_writes=100,
            sqlite_path=Path(directory) / "analysis.sqlite3",
            database_url=None,
        )
        query = PositionAnalysisQuery(INITIAL_POSITION, depth=12, multipv=3)
        first_backend = SQLiteAnalysisCacheBackend(config)
        first_service = StockfishAnalysisService(
            default_engine_pool,
            cache_backend=first_backend,
            cache_config=config,
        )
        cold_ms, cold_status = timed_analysis(first_service, query)
        first_backend.close()

        restarted_backend = SQLiteAnalysisCacheBackend(config)
        restarted_service = StockfishAnalysisService(
            default_engine_pool,
            cache_backend=restarted_backend,
            cache_config=config,
        )
        l2_ms, l2_status = timed_analysis(restarted_service, query)
        l1_ms, l1_status = timed_analysis(restarted_service, query)
        output = {
            "position": "initiale",
            "depth": query.depth,
            "multipv": query.multipv,
            "cold": {"duration_ms": cold_ms, "cache_status": cold_status},
            "l2": {"duration_ms": l2_ms, "cache_status": l2_status},
            "l1": {"duration_ms": l1_ms, "cache_status": l1_status},
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        restarted_backend.close()
        default_engine_pool.shutdown()


if __name__ == "__main__":
    main()
